import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtempSync, writeFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openLocalPool, openLocalControlPool } from '../../src/platform/persistence/connection.mjs';
import { applyMigrations } from '../../src/platform/persistence/migrate.mjs';
import { createIdentityService } from '../../src/platform/identity/sessions.mjs';
import { createAiRouterStore } from '../../src/platform/ai/store.mjs';
import { createEngineeringIntelligenceStore } from '../../src/platform/engineering/store.mjs';

const config = JSON.parse(process.env.STACKPILOT_TEST_DB ?? 'null');
if (config?.database !== 'stackpilot_ai_test') {
  throw new Error('Use disposable AI/engineering integration harness');
}

const admin = await openLocalPool(config);
const root = realpathSync(mkdtempSync(join(tmpdir(), 'stackpilot-phase7-')));
const trustPath = join(root, 'trust.json');
let controlPool, appPool, identity, aiStore, engStore, ownerAlpha, reviewerAlpha, ownerBeta;

test('zero-cost AI routing telemetry, engineering intelligence, owner gates, and RLS isolation', async () => {
  try {
    await applyMigrations(admin, { targetVersion: 11 });

    const keys = {
      ownerAlpha: generateKeyPairSync('ed25519'),
      reviewerAlpha: generateKeyPairSync('ed25519'),
      ownerBeta: generateKeyPairSync('ed25519')
    };
    const principals = [
      {
        keyId: 'owner-alpha-key',
        userId: 'owner-alpha',
        organizationId: 'org-alpha',
        role: 'owner',
        publicKeySpkiBase64: keys.ownerAlpha.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
      },
      {
        keyId: 'reviewer-alpha-key',
        userId: 'reviewer-alpha',
        organizationId: 'org-alpha',
        role: 'reviewer',
        publicKeySpkiBase64: keys.reviewerAlpha.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
      },
      {
        keyId: 'owner-beta-key',
        userId: 'owner-beta',
        organizationId: 'org-beta',
        role: 'owner',
        publicKeySpkiBase64: keys.ownerBeta.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
      }
    ];
    writeFileSync(trustPath, JSON.stringify({ schemaVersion: 1, principals }));

    for (const org of ['org-alpha', 'org-beta']) {
      await admin.query('INSERT INTO organizations(id, name) VALUES ($1, $1)', [org]);
    }
    for (const p of principals) {
      await admin.query('INSERT INTO users(organization_id, id, display_name) VALUES ($1, $2, $2)', [p.organizationId, p.userId]);
    }

    await admin.query('ALTER ROLE stackpilot_control LOGIN');
    controlPool = await openLocalControlPool({ ...config, user: 'stackpilot_control' });
    appPool = await openLocalPool({ ...config, user: 'stackpilot_app' });
    identity = createIdentityService({ pool: controlPool, trustPath, origin: 'https://127.0.0.1:55443' });
    aiStore = createAiRouterStore({ identity, appPool });
    engStore = createEngineeringIntelligenceStore({ identity, appPool });

    async function login(keyId, privateKey) {
      const challenge = await identity.createChallenge({ keyId });
      const signature = sign(null, Buffer.from(challenge.message), privateKey).toString('base64url');
      const session = await identity.completeChallenge({
        keyId,
        challengeId: challenge.challengeId,
        nonce: challenge.nonce,
        signature
      });
      return identity.authenticate({ keyId, token: session.token });
    }

    ownerAlpha = await login('owner-alpha-key', keys.ownerAlpha.privateKey);
    reviewerAlpha = await login('reviewer-alpha-key', keys.reviewerAlpha.privateKey);
    ownerBeta = await login('owner-beta-key', keys.ownerBeta.privateKey);

    const nowIso = new Date().toISOString();
    const collectedIso = new Date(Date.now() - 30000).toISOString();

    // 1. Zero-cost AI routing + fallback + secret rejection
    const routed = await aiStore.routeAndRecord(reviewerAlpha, {
      taskClass: 'code_review',
      prompt: 'Check store.mjs for RLS enforcement.',
      requestedTokens: 1024,
      timestamp: nowIso,
      registry: [
        {
          id: 'local-qwen-7b',
          provider: 'ollama-local',
          tier: 'local',
          estimatedCostMinor: 0,
          maxContextTokens: 32768,
          priority: 1,
          capabilities: ['code_review'],
          dailyCallLimit: 100,
          dailyTokenLimit: 100000,
          callsUsed: 0,
          tokensUsed: 0,
          healthy: true,
          rateLimited: false,
          circuitOpen: true
        },
        {
          id: 'free-gemini-flash',
          provider: 'google-free-tier',
          tier: 'free',
          estimatedCostMinor: 0,
          maxContextTokens: 131072,
          priority: 2,
          capabilities: ['code_review'],
          dailyCallLimit: 50,
          dailyTokenLimit: 500000,
          callsUsed: 0,
          tokensUsed: 0,
          healthy: true,
          rateLimited: false,
          circuitOpen: false
        }
      ]
    });
    assert.equal(routed.allowed, true);
    assert.equal(routed.selectedModelId, 'free-gemini-flash');
    assert.equal(routed.estimatedCostMinor, 0);

    await assert.rejects(
      aiStore.routeAndRecord(reviewerAlpha, {
        taskClass: 'code_review',
        prompt: 'Authorization: Bearer secret_token_value_12345',
        requestedTokens: 100,
        timestamp: nowIso,
        registry: []
      }),
      /secret_detected/
    );

    assert.equal((await aiStore.listRoutingTelemetry(ownerAlpha)).length, 1);
    assert.equal((await aiStore.listRoutingTelemetry(ownerBeta)).length, 0);

    // 2. Engineering health report + regression triage + owner-only proposal gate
    const health = await engStore.recordHealthReport(reviewerAlpha, {
      unitPassed: 809,
      unitFailed: 0,
      unitSkipped: 0,
      integrationPassed: null,
      integrationFailed: null,
      migrationCrlfCount: 0,
      auditHighCriticalCount: 0,
      preflightViolations: 0,
      builtRoutes: 28,
      collectedAt: collectedIso,
      now: nowIso
    });
    assert.equal(health.status, 'healthy');
    assert.equal(health.metrics.integrationPassed, null);

    // Reviewer denied on owner-gated proposal
    await assert.rejects(
      engStore.approveEngineeringProposal(reviewerAlpha, {
        id: 'prop-dep-1',
        actionType: 'dependency_update',
        summary: 'Review Astro patch.',
        requesterId: 'agent-1',
        proposedAt: collectedIso,
        now: nowIso
      }),
      /Owner approval required/
    );

    const approved = await engStore.approveEngineeringProposal(ownerAlpha, {
      id: 'prop-dep-1',
      actionType: 'dependency_update',
      summary: 'Review Astro patch.',
      requesterId: 'agent-1',
      proposedAt: collectedIso,
      now: nowIso
    });
    assert.equal(approved.approved, true);

    assert.equal((await engStore.listEngineeringRecords(ownerAlpha)).length, 2);
    assert.equal((await engStore.listEngineeringRecords(ownerBeta)).length, 0);
  } finally {
    await appPool?.end();
    await controlPool?.end();
    await admin.query('ALTER ROLE stackpilot_control NOLOGIN');
    await admin.end();
    rmSync(root, { recursive: true, force: true });
  }
});
