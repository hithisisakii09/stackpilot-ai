import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createHash, sign } from 'node:crypto';
import { mkdtempSync, writeFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openLocalPool, openLocalControlPool } from '../../src/platform/persistence/connection.mjs';
import { applyMigrations } from '../../src/platform/persistence/migrate.mjs';
import { createIdentityService } from '../../src/platform/identity/sessions.mjs';
import { createApprovalService } from '../../src/platform/approvals/service.mjs';
import { createClaimLifecycleService } from '../../src/platform/products/claims.mjs';
import { CANONICAL_VENDORS, canonicalLaunchPayload, evaluateLaunchGates } from '../../src/platform/launch/gates.mjs';

const config = JSON.parse(process.env.STACKPILOT_TEST_DB ?? 'null');
if (config?.database !== 'stackpilot_launch_test') {
  throw new Error('Use disposable launch-gate integration harness');
}

const admin = await openLocalPool(config);
const root = realpathSync(mkdtempSync(join(tmpdir(), 'stackpilot-launch-')));
const trustPath = join(root, 'trust.json');
let controlPool;

test('6-vendor claim readiness, owner key-ceremony gate, and RLS isolation across organizations', async () => {
  try {
    await applyMigrations(admin, { targetVersion: 11 });

    const keys = {
      ownerAlpha: generateKeyPairSync('ed25519'),
      reviewerAlpha: generateKeyPairSync('ed25519'),
      ownerBeta: generateKeyPairSync('ed25519')
    };
    const principals = [
      { keyId: 'owner-alpha-key', userId: 'owner-alpha', organizationId: 'org-alpha', role: 'owner', publicKeySpkiBase64: keys.ownerAlpha.publicKey.export({ type: 'spki', format: 'der' }).toString('base64') },
      { keyId: 'reviewer-alpha-key', userId: 'reviewer-alpha', organizationId: 'org-alpha', role: 'reviewer', publicKeySpkiBase64: keys.reviewerAlpha.publicKey.export({ type: 'spki', format: 'der' }).toString('base64') },
      { keyId: 'owner-beta-key', userId: 'owner-beta', organizationId: 'org-beta', role: 'owner', publicKeySpkiBase64: keys.ownerBeta.publicKey.export({ type: 'spki', format: 'der' }).toString('base64') }
    ];
    writeFileSync(trustPath, JSON.stringify({ schemaVersion: 1, principals }));

    for (const org of ['org-alpha', 'org-beta']) {
      await admin.query('INSERT INTO organizations(id, name) VALUES ($1, $1)', [org]);
      await admin.query("INSERT INTO categories(organization_id, id, slug, name) VALUES ($1, 'cat-saas', 'saas', 'SaaS')", [org]);
      await admin.query("INSERT INTO agents(organization_id, id, role, version) VALUES ($1, 'qa-agent', 'qa', 1)", [org]);
      for (const vendorId of CANONICAL_VENDORS) {
        await admin.query('INSERT INTO vendors(organization_id, id, name, website) VALUES ($1, $2, $2, $3)', [org, vendorId, `https://${vendorId}.example.com/`]);
        await admin.query('INSERT INTO products(organization_id, id, category_id, vendor_id, slug, name, website) VALUES ($1, $2, $3, $4, $2, $2, $5)', [org, 'prod-' + vendorId, 'cat-saas', vendorId, `https://${vendorId}.example.com/`]);
        await admin.query("INSERT INTO product_claims(organization_id, id, product_id, statement, caveat) VALUES ($1, $2, $3, 'Verified capability', 'Bounded')", [org, 'claim-' + vendorId, 'prod-' + vendorId]);
        await admin.query("INSERT INTO evidence_sources(organization_id, id, product_id, source_url, collected_at, source_digest) VALUES ($1, $2, $3, $4, now() - interval '1 day', repeat('a', 64))", [org, 'source-' + vendorId, 'prod-' + vendorId, `https://${vendorId}.example.com/docs`]);
        await admin.query('INSERT INTO claim_evidence(organization_id, id, product_id, claim_id, source_id) VALUES ($1, $2, $3, $4, $5)', [org, 'link-' + vendorId, 'prod-' + vendorId, 'claim-' + vendorId, 'source-' + vendorId]);
      }
    }
    for (const p of principals) {
      await admin.query('INSERT INTO users(organization_id, id, display_name) VALUES ($1, $2, $2)', [p.organizationId, p.userId]);
    }

    await admin.query('ALTER ROLE stackpilot_control LOGIN');
    controlPool = await openLocalControlPool({ ...config, user: 'stackpilot_control' });
    const identity = createIdentityService({ pool: controlPool, trustPath, origin: 'https://127.0.0.1:55445' });
    const approvals = createApprovalService({ identity });
    const lifecycle = createClaimLifecycleService({ identity });

    async function login(keyId, privateKey) {
      const ch = await identity.createChallenge({ keyId });
      const sig = sign(null, Buffer.from(ch.message), privateKey).toString('base64url');
      const ses = await identity.completeChallenge({ keyId, challengeId: ch.challengeId, nonce: ch.nonce, signature: sig });
      return identity.authenticate({ keyId, token: ses.token });
    }

    const ownerAlpha = await login('owner-alpha-key', keys.ownerAlpha.privateKey);
    const reviewerAlpha = await login('reviewer-alpha-key', keys.reviewerAlpha.privateKey);
    const ownerBeta = await login('owner-beta-key', keys.ownerBeta.privateKey);

    const signals = {
      monthlyBudgetInr: 0,
      delegatedSpendInr: 0,
      migrationCrlf: 0,
      migrationsVerified: true,
      recoveryDrillStatus: 'pass',
      preflightViolations: 0,
      highOrCriticalVulnerabilities: 0
    };

    // 1. Fresh state fails closed with all 6 vendors missing
    const freshGate = evaluateLaunchGates({ organizationId: 'org-alpha', ceremony: null, vendorClaims: [], signals });
    assert.equal(freshGate.decision, 'blocked');
    assert.deepEqual(freshGate.vendorReadiness.missingVendors, [...CANONICAL_VENDORS]);

    // 2. Approve all 6 vendor claims for org-alpha with independent owner sign-off
    const approvedClaimsAlpha = [];
    for (const vendorId of CANONICAL_VENDORS) {
      const claimId = 'claim-' + vendorId;
      await lifecycle.transition(reviewerAlpha, { claimId, agentId: 'qa-agent', idempotencyKey: 'l0-' + vendorId, to: 'evidence-collected', expectedVersion: 0, expiresAt: new Date(Date.now() + 3600000).toISOString() });
      const req = await approvals.createClaimRequest(reviewerAlpha, { requestId: 'req-launch-' + vendorId, claimId, agentId: 'qa-agent' });
      await lifecycle.transition(reviewerAlpha, { claimId, agentId: 'qa-agent', idempotencyKey: 'l1-' + vendorId, to: 'needs-review', expectedVersion: 1, requestId: req.requestId });
      await approvals.decide(ownerAlpha, { requestId: req.requestId, requestDigest: req.requestDigest, expectedVersion: 0, decision: 'approved' });
      await lifecycle.transition(ownerAlpha, { claimId, agentId: 'qa-agent', idempotencyKey: 'l2-' + vendorId, to: 'verified', expectedVersion: 2 });
      await lifecycle.transition(ownerAlpha, { claimId, agentId: 'qa-agent', idempotencyKey: 'l3-' + vendorId, to: 'approved', expectedVersion: 3 });

      const inspected = await lifecycle.inspect(ownerAlpha, { claimId, agentId: 'qa-agent' });
      assert.equal(inspected.effectiveStatus, 'approved');
      // Org Beta cannot inspect Org Alpha's claim lifecycle (RLS isolation)
      await assert.rejects(lifecycle.inspect(ownerBeta, { claimId, agentId: 'qa-agent' }));

      approvedClaimsAlpha.push({
        vendorId,
        claimId,
        status: inspected.effectiveStatus,
        actorRole: 'owner',
        actorId: 'owner-alpha',
        requesterId: 'reviewer-alpha',
        approvedAt: new Date(Date.now() - 1000).toISOString()
      });
    }

    // 3. Offline owner key-ceremony attestation transitions Org Alpha to ready while Org Beta stays blocked
    const attestedAt = new Date(Date.now() - 1000).toISOString();
    const publicKeyPem = keys.ownerAlpha.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const fingerprintSha256 = createHash('sha256').update(keys.ownerAlpha.publicKey.export({ type: 'spki', format: 'der' })).digest('hex');
    const payload = canonicalLaunchPayload({
      organizationId: 'org-alpha',
      approvedVendors: [...CANONICAL_VENDORS],
      monthlyBudgetInr: 0,
      delegatedSpendInr: 0,
      attestedAt
    });
    const signatureBase64Url = sign(null, Buffer.from(JSON.stringify(payload)), keys.ownerAlpha.privateKey).toString('base64url');

    const readyAlpha = evaluateLaunchGates({
      organizationId: 'org-alpha',
      ceremony: {
        organizationId: 'org-alpha',
        ceremonyMode: 'offline_owner',
        publicKeyPem,
        fingerprintSha256,
        attestedAt,
        signatureBase64Url
      },
      vendorClaims: approvedClaimsAlpha,
      signals
    });
    assert.equal(readyAlpha.decision, 'ready');
    assert.deepEqual(readyAlpha.blockingReasons, []);

    const blockedBeta = evaluateLaunchGates({
      organizationId: 'org-beta',
      ceremony: null,
      vendorClaims: [],
      signals
    });
    assert.equal(blockedBeta.decision, 'blocked');
  } finally {
    await controlPool?.end();
    await admin.query('ALTER ROLE stackpilot_control NOLOGIN');
    await admin.end();
    rmSync(root, { recursive: true, force: true });
  }
});
