import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtempSync, writeFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openLocalPool, openLocalControlPool } from '../../src/platform/persistence/connection.mjs';
import { applyMigrations } from '../../src/platform/persistence/migrate.mjs';
import { createIdentityService } from '../../src/platform/identity/sessions.mjs';
import { createApprovalService } from '../../src/platform/approvals/service.mjs';
import { createClaimLifecycleService } from '../../src/platform/products/claims.mjs';
import { createEditorialGrowthStore } from '../../src/platform/growth/store.mjs';

const config = JSON.parse(process.env.STACKPILOT_TEST_DB ?? 'null');
if (config?.database !== 'stackpilot_growth_test') {
  throw new Error('Use disposable growth integration harness');
}

const admin = await openLocalPool(config);
const root = realpathSync(mkdtempSync(join(tmpdir(), 'stackpilot-growth-')));
const trustPath = join(root, 'trust.json');
let controlPool, appPool, identity, approvals, lifecycle, store, ownerAlpha, reviewerAlpha, ownerBeta;

const expiry = () => new Date(Date.now() + 3600000).toISOString();

test('tenant-scoped keyword clusters and evidence-bound editorial drafts with RLS isolation', async () => {
  try {
    await applyMigrations(admin, { targetVersion: 9 });

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
      await admin.query("INSERT INTO categories(organization_id, id, slug, name) VALUES ($1, 'cat-crm', 'crm', 'CRM')", [org]);
      await admin.query("INSERT INTO vendors(organization_id, id, name, website) VALUES ($1, 'vendor-test', 'Fixture', 'https://example.com/')", [org]);
      await admin.query("INSERT INTO products(organization_id, id, category_id, vendor_id, slug, name, website) VALUES ($1, 'product-test', 'cat-crm', 'vendor-test', 'product-test', 'Fixture', 'https://example.com/')", [org]);
      await admin.query("INSERT INTO agents(organization_id, id, role, version) VALUES ($1, 'qa-agent', 'qa', 1)", [org]);
    }
    for (const p of principals) {
      await admin.query('INSERT INTO users(organization_id, id, display_name) VALUES ($1, $2, $2)', [p.organizationId, p.userId]);
    }

    await admin.query('ALTER ROLE stackpilot_control LOGIN');
    await admin.query('ALTER ROLE stackpilot_app LOGIN');
    controlPool = await openLocalControlPool({ ...config, user: 'stackpilot_control' });
    appPool = await openLocalPool({ ...config, user: 'stackpilot_app' });
    identity = createIdentityService({ pool: controlPool, trustPath, origin: 'https://127.0.0.1:55441' });
    approvals = createApprovalService({ pool: controlPool, identity });
    lifecycle = createClaimLifecycleService({ identity });
    store = createEditorialGrowthStore({ identity, appPool });

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

    // 1. Keyword cluster deduplication and explicit null unknown metrics
    const savedKw = await store.saveKeywordClusters(reviewerAlpha, [
      {
        name: 'CRM Agencies',
        phrases: [
          { phrase: '  Best   CRM for Agencies  ' },
          { phrase: 'best crm for agencies', volume: null, difficulty: null, cpc: null }
        ]
      },
      {
        name: 'agencies crm',
        phrases: [{ phrase: 'hubspot vs pipedrive', volume: 500, difficulty: null, cpc: null }]
      }
    ]);
    assert.equal(savedKw.clusters.length, 1);

    const alphaClusters = await store.listKeywordClusters(ownerAlpha);
    assert.equal(alphaClusters.length, 1);
    assert.equal(alphaClusters[0].phrases.length, 2);
    assert.equal(alphaClusters[0].phrases[0].volume, null);
    assert.equal(alphaClusters[0].phrases[0].difficulty, null);
    assert.equal(alphaClusters[0].phrases[0].cpc, null);

    // Cross-tenant RLS isolation for keywords
    const betaClusters = await store.listKeywordClusters(ownerBeta);
    assert.equal(betaClusters.length, 0);

    // 2. Approved vs unapproved/stale claim enforcement for editorial drafts
    await admin.query("INSERT INTO product_claims(organization_id, id, product_id, statement, caveat) VALUES ('org-alpha', 'claim-approved', 'product-test', 'Verified statement', 'Bounded scope')");
    await admin.query("INSERT INTO evidence_sources(organization_id, id, product_id, source_url, collected_at, source_digest) VALUES ('org-alpha', 'source-approved', 'product-test', 'https://example.com/docs', now() - interval '1 day', repeat('a', 64))");
    await admin.query("INSERT INTO claim_evidence(organization_id, id, product_id, claim_id, source_id) VALUES ('org-alpha', 'link-approved', 'product-test', 'claim-approved', 'source-approved')");

    await admin.query("INSERT INTO product_claims(organization_id, id, product_id, statement, caveat) VALUES ('org-alpha', 'claim-unapproved', 'product-test', 'Unapproved statement', 'Pending review')");

    await lifecycle.transition(reviewerAlpha, {
      claimId: 'claim-approved',
      agentId: 'qa-agent',
      idempotencyKey: 't-0',
      to: 'evidence-collected',
      expectedVersion: 0,
      expiresAt: expiry()
    });
    const req = await approvals.createClaimRequest(reviewerAlpha, {
      requestId: 'req-claim-approved',
      claimId: 'claim-approved',
      agentId: 'qa-agent'
    });
    await lifecycle.transition(reviewerAlpha, {
      claimId: 'claim-approved',
      agentId: 'qa-agent',
      idempotencyKey: 't-1',
      to: 'needs-review',
      expectedVersion: 1,
      requestId: req.requestId
    });
    await approvals.decide(ownerAlpha, {
      requestId: req.requestId,
      requestDigest: req.requestDigest,
      expectedVersion: 0,
      decision: 'approved'
    });
    await lifecycle.transition(ownerAlpha, {
      claimId: 'claim-approved',
      agentId: 'qa-agent',
      idempotencyKey: 't-2',
      to: 'verified',
      expectedVersion: 2
    });
    await lifecycle.transition(ownerAlpha, {
      claimId: 'claim-approved',
      agentId: 'qa-agent',
      idempotencyKey: 't-3',
      to: 'approved',
      expectedVersion: 3
    });

    // Reject uncited factual span
    await assert.rejects(
      store.saveEditorialDraft(reviewerAlpha, {
        id: 'draft-bad-uncited',
        categoryId: 'cat-crm',
        title: 'Bad Draft',
        status: 'draft',
        evidenceBindings: [{ claimId: 'claim-approved', status: 'approved', stale: false, revoked: false }],
        spans: [{ id: 'span-1', kind: 'factual', text: 'Uncited fact', claimIds: [] }]
      }),
      /Uncited factual span/
    );

    // Reject unapproved claim even if caller claims approved in payload
    await assert.rejects(
      store.saveEditorialDraft(reviewerAlpha, {
        id: 'draft-bad-unapproved',
        categoryId: 'cat-crm',
        title: 'Bad Draft Unapproved',
        status: 'draft',
        evidenceBindings: [{ claimId: 'claim-unapproved', status: 'approved', stale: false, revoked: false }],
        spans: [{ id: 'span-1', kind: 'factual', text: 'Spoofed approval', claimIds: ['claim-unapproved'] }]
      }),
      /Unverified evidence reference/
    );

    // Reject commercial/affiliate fields
    await assert.rejects(
      store.saveEditorialDraft(reviewerAlpha, {
        id: 'draft-bad-affiliate',
        categoryId: 'cat-crm',
        title: 'Bad Draft Affiliate',
        status: 'draft',
        affiliateUrl: 'https://partner.example.com',
        evidenceBindings: [{ claimId: 'claim-approved', status: 'approved', stale: false, revoked: false }],
        spans: [{ id: 'span-1', kind: 'factual', text: 'Valid fact', claimIds: ['claim-approved'] }]
      }),
      /Commercial input is prohibited/
    );

    // Save valid evidence-bound draft
    const savedDraft = await store.saveEditorialDraft(reviewerAlpha, {
      id: 'draft-valid-crm',
      categoryId: 'cat-crm',
      title: 'CRM Evaluation Guide',
      status: 'draft',
      evidenceBindings: [{ claimId: 'claim-approved', status: 'approved', stale: false, revoked: false }],
      spans: [
        { id: 'span-intro', kind: 'framing', text: 'Compare documented capabilities carefully.', claimIds: [] },
        { id: 'span-fact', kind: 'factual', text: 'Verified statement.', claimIds: ['claim-approved'] }
      ]
    });
    assert.equal(savedDraft.status, 'draft');
    assert.equal(savedDraft.version, 1);

    const alphaDraft = await store.getEditorialDraft(ownerAlpha, 'draft-valid-crm');
    assert.equal(alphaDraft.title, 'CRM Evaluation Guide');
    assert.equal((await store.listEditorialDrafts(ownerAlpha)).length, 1);

    // Cross-tenant RLS isolation for editorial drafts
    assert.equal(await store.getEditorialDraft(ownerBeta, 'draft-valid-crm'), null);
    assert.equal((await store.listEditorialDrafts(ownerBeta)).length, 0);
  } finally {
    await appPool?.end();
    await controlPool?.end();
    await admin.end();
    rmSync(root, { recursive: true, force: true });
  }
});
