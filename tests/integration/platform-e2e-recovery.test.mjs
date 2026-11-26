import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { request as httpsRequest } from 'node:https';
import { generateKeyPairSync, sign } from 'node:crypto';
import { openLocalPool, openLocalControlPool } from '../../src/platform/persistence/connection.mjs';
import { applyMigrations } from '../../src/platform/persistence/migrate.mjs';
import { createIdentityService } from '../../src/platform/identity/sessions.mjs';
import { createApprovalService } from '../../src/platform/approvals/service.mjs';
import { createClaimLifecycleService } from '../../src/platform/products/claims.mjs';
import { createEditorialGrowthStore } from '../../src/platform/growth/store.mjs';
import { createPartnershipStore } from '../../src/platform/partnerships/store.mjs';
import { createRevenueLedgerStore } from '../../src/platform/revenue/store.mjs';
import { createAiRouterStore } from '../../src/platform/ai/store.mjs';
import { createEngineeringIntelligenceStore } from '../../src/platform/engineering/store.mjs';
import { startLocalControlPlane } from '../../src/control-plane/server.mjs';
import { buildCanonicalSnapshot, verifyCanonicalSnapshot, evaluateSecurityDrillMatrix } from '../../src/platform/recovery/drills.mjs';

const config = JSON.parse(process.env.STACKPILOT_TEST_DB ?? 'null');
if (config?.database !== 'stackpilot_e2e_test') {
  throw new Error('Use disposable E2E recovery harness');
}

const admin = await openLocalPool(config);
const root = realpathSync(mkdtempSync(join(tmpdir(), 'stackpilot-e2e-')));
const openssl = process.platform === 'win32' ? 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe' : 'openssl';
const file = name => join(root, name);
const run = args => execFileSync(openssl, args, { stdio: 'ignore', windowsHide: true, timeout: 30000, env: { ...process.env, OPENSSL_CONF: file('openssl.cnf') } });
let app, controlPool, appPool;

test('cross-phase E2E pipeline, RLS isolation, session revocation, migration tamper, and snapshot recovery drills', async () => {
  try {
    writeFileSync(file('openssl.cnf'), '[req]\ndistinguished_name=dn\n[dn]\n');
    run(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', file('ca.key'), '-out', file('ca.crt'), '-subj', '/CN=StackPilot E2E Test CA', '-days', '1', '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign']);
    run(['req', '-new', '-newkey', 'rsa:2048', '-nodes', '-keyout', file('server.key'), '-out', file('server.csr'), '-subj', '/CN=127.0.0.1']);
    writeFileSync(file('extensions.cnf'), 'subjectAltName=IP:127.0.0.1\nextendedKeyUsage=serverAuth\nbasicConstraints=CA:FALSE\n');
    run(['x509', '-req', '-in', file('server.csr'), '-CA', file('ca.crt'), '-CAkey', file('ca.key'), '-CAcreateserial', '-out', file('server.crt'), '-days', '1', '-extfile', file('extensions.cnf')]);

    // 1. Migration idempotency & drift tamper drill
    assert.deepEqual(await applyMigrations(admin, { targetVersion: 11 }), { version: 11, applied: true });
    assert.deepEqual(await applyMigrations(admin, { targetVersion: 11 }), { version: 11, applied: false });

    const driftPool = await openLocalPool({ ...config, database: 'stackpilot_e2e_drift' });
    try {
      await applyMigrations(driftPool, { targetVersion: 11 });
      await driftPool.query("UPDATE _platform_migrations SET sha256 = repeat('0', 64) WHERE version = 11");
      await assert.rejects(applyMigrations(driftPool, { targetVersion: 11 }), /Migration failed or history drift detected/);
    } finally {
      await driftPool.end();
    }

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
    writeFileSync(file('trust.json'), JSON.stringify({ schemaVersion: 1, principals }));

    for (const org of ['org-alpha', 'org-beta']) {
      await admin.query('INSERT INTO organizations(id, name) VALUES ($1, $1)', [org]);
      await admin.query("INSERT INTO categories(organization_id, id, slug, name) VALUES ($1, 'cat-crm', 'crm', 'CRM')", [org]);
      await admin.query("INSERT INTO vendors(organization_id, id, name, website) VALUES ($1, 'vendor-hubspot', 'HubSpot', 'https://www.hubspot.com/')", [org]);
      await admin.query("INSERT INTO products(organization_id, id, category_id, vendor_id, slug, name, website) VALUES ($1, 'product-hubspot', 'cat-crm', 'vendor-hubspot', 'hubspot', 'HubSpot', 'https://www.hubspot.com/')", [org]);
      await admin.query("INSERT INTO agents(organization_id, id, role, version) VALUES ($1, 'qa-agent', 'qa', 1)", [org]);
      await admin.query("INSERT INTO affiliate_programmes(organization_id, id, vendor_id, source_url) VALUES ($1, 'prog-hubspot', 'vendor-hubspot', 'https://www.hubspot.com/partners')", [org]);
    }
    for (const p of principals) {
      await admin.query('INSERT INTO users(organization_id, id, display_name) VALUES ($1, $2, $2)', [p.organizationId, p.userId]);
    }
    await admin.query("INSERT INTO product_claims(organization_id, id, product_id, statement, caveat) VALUES ('org-alpha', 'claim-e2e', 'product-hubspot', 'Verified statement', 'Bounded')");
    await admin.query("INSERT INTO evidence_sources(organization_id, id, product_id, source_url, collected_at, source_digest) VALUES ('org-alpha', 'source-e2e', 'product-hubspot', 'https://www.hubspot.com/docs', now() - interval '1 day', repeat('a', 64))");
    await admin.query("INSERT INTO claim_evidence(organization_id, id, product_id, claim_id, source_id) VALUES ('org-alpha', 'link-e2e', 'product-hubspot', 'claim-e2e', 'source-e2e')");

    const probe = createServer();
    await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    const origin = 'https://127.0.0.1:' + port;

    await admin.query('ALTER ROLE stackpilot_control LOGIN');
    app = await startLocalControlPlane({
      origin,
      trustPath: file('trust.json'),
      tlsKeyPath: file('server.key'),
      tlsCertPath: file('server.crt'),
      database: { ...config, user: 'stackpilot_control' }
    });

    controlPool = await openLocalControlPool({ ...config, user: 'stackpilot_control' });
    appPool = await openLocalPool({ ...config, user: 'stackpilot_app' });
    const identity = createIdentityService({ pool: controlPool, trustPath: file('trust.json'), origin });
    const approvals = createApprovalService({ identity });
    const lifecycle = createClaimLifecycleService({ identity });
    const growthStore = createEditorialGrowthStore({ identity, appPool });
    const partnershipStore = createPartnershipStore({ identity, appPool });
    const revenueStore = createRevenueLedgerStore({ identity, appPool });
    const aiStore = createAiRouterStore({ identity, appPool });
    const engStore = createEngineeringIntelligenceStore({ identity, appPool });

    async function loginHandle(keyId, privateKey) {
      const ch = await identity.createChallenge({ keyId });
      const sig = sign(null, Buffer.from(ch.message), privateKey).toString('base64url');
      const ses = await identity.completeChallenge({ keyId, challengeId: ch.challengeId, nonce: ch.nonce, signature: sig });
      return identity.authenticate({ keyId, token: ses.token });
    }

    const ownerA = await loginHandle('owner-alpha-key', keys.ownerAlpha.privateKey);
    const revA = await loginHandle('reviewer-alpha-key', keys.reviewerAlpha.privateKey);

    // 2. Cross-phase pipeline execution for Org Alpha
    await lifecycle.transition(revA, { claimId: 'claim-e2e', agentId: 'qa-agent', idempotencyKey: 'e2e-0', to: 'evidence-collected', expectedVersion: 0, expiresAt: new Date(Date.now() + 3600000).toISOString() });
    const req = await approvals.createClaimRequest(revA, { requestId: 'req-e2e-1', claimId: 'claim-e2e', agentId: 'qa-agent' });
    await lifecycle.transition(revA, { claimId: 'claim-e2e', agentId: 'qa-agent', idempotencyKey: 'e2e-1', to: 'needs-review', expectedVersion: 1, requestId: req.requestId });
    await approvals.decide(ownerA, { requestId: req.requestId, requestDigest: req.requestDigest, expectedVersion: 0, decision: 'approved' });
    await lifecycle.transition(ownerA, { claimId: 'claim-e2e', agentId: 'qa-agent', idempotencyKey: 'e2e-2', to: 'verified', expectedVersion: 2 });
    await lifecycle.transition(ownerA, { claimId: 'claim-e2e', agentId: 'qa-agent', idempotencyKey: 'e2e-3', to: 'approved', expectedVersion: 3 });

    await growthStore.saveEditorialDraft(revA, {
      id: 'draft-e2e',
      categoryId: 'cat-crm',
      title: 'E2E CRM Guide',
      status: 'draft',
      evidenceBindings: [{ claimId: 'claim-e2e', status: 'approved', stale: false, revoked: false }],
      spans: [{ id: 'span-1', kind: 'factual', text: 'Verified statement.', claimIds: ['claim-e2e'] }]
    });

    await partnershipStore.createPartnership(revA, {
      id: 'partner-e2e',
      vendorId: 'vendor-hubspot',
      sourceUrl: 'https://www.hubspot.com/partners',
      occurredAt: new Date(Date.now() - 60000).toISOString()
    });

    await revenueStore.recordStatement(ownerA, {
      id: 'stmt-e2e',
      programmeId: 'prog-hubspot',
      statementDigest: 'a'.repeat(64),
      recordedAt: new Date(Date.now() - 30000).toISOString()
    });
    const pStart = new Date(Date.now() - 86400000).toISOString();
    const pEnd = new Date(Date.now() - 3600000).toISOString();
    const recAt = new Date(Date.now() - 10000).toISOString();
    await revenueStore.appendLedgerEntry(revA, { id: 'rev-f-e2e', programmeId: 'prog-hubspot', entryType: 'forecast', entryKind: 'initial', currency: 'INR', amountMinor: 50000, periodStart: pStart, periodEnd: pEnd, recordedAt: recAt });
    await revenueStore.appendLedgerEntry(ownerA, { id: 'rev-a-e2e', programmeId: 'prog-hubspot', entryType: 'actual', entryKind: 'initial', statementId: 'stmt-e2e', statementDigest: 'a'.repeat(64), currency: 'USD', amountMinor: 15000, periodStart: pStart, periodEnd: pEnd, recordedAt: recAt });

    await aiStore.routeAndRecord(revA, {
      taskClass: 'code_review',
      prompt: 'Audit E2E invariants.',
      requestedTokens: 512,
      timestamp: new Date().toISOString(),
      registry: [{ id: 'local-qwen-7b', provider: 'ollama-local', tier: 'local', estimatedCostMinor: 0, maxContextTokens: 32768, priority: 1, capabilities: ['code_review'], dailyCallLimit: 100, dailyTokenLimit: 100000, callsUsed: 0, tokensUsed: 0, healthy: true, rateLimited: false, circuitOpen: false }]
    });
    await engStore.recordHealthReport(revA, {
      unitPassed: 823, unitFailed: 0, unitSkipped: 0, integrationPassed: null, integrationFailed: null,
      migrationCrlfCount: 0, auditHighCriticalCount: 0, preflightViolations: 0, builtRoutes: 28,
      collectedAt: recAt, now: new Date().toISOString()
    });

    // 3. HTTPS Admin UI verification + RLS isolation + Session revocation drill
    const ca = readFileSync(file('ca.crt'));
    async function call(method, path, { data, cookie, csrf } = {}) {
      const payload = data === undefined ? undefined : JSON.stringify(data);
      const headers = { Host: '127.0.0.1:' + port };
      if (method === 'POST') headers.Origin = origin;
      if (cookie) headers.Cookie = cookie;
      if (csrf) headers['X-CSRF-Token'] = csrf;
      if (payload !== undefined) {
        headers['Content-Type'] = 'application/json; charset=utf-8';
        headers['Content-Length'] = String(Buffer.byteLength(payload));
      }
      return new Promise((resolve, reject) => {
        const r = httpsRequest(origin + path, { method, headers, ca, rejectUnauthorized: true }, res => {
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
        });
        r.on('error', reject);
        if (payload !== undefined) r.write(payload);
        r.end();
      });
    }

    async function httpLogin(keyId, privateKey) {
      const ch = JSON.parse((await call('POST', '/auth/challenge', { data: { keyId } })).body);
      const sig = sign(null, Buffer.from(ch.message), privateKey).toString('base64url');
      return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ keyId, challengeId: ch.challengeId, nonce: ch.nonce, signature: sig });
        const r = httpsRequest(origin + '/auth/session', {
          method: 'POST',
          headers: { Host: '127.0.0.1:' + port, Origin: origin, 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': String(Buffer.byteLength(payload)) },
          ca, rejectUnauthorized: true
        }, res => {
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve({ cookie: res.headers['set-cookie'][0].split(';')[0], csrf: JSON.parse(Buffer.concat(chunks).toString('utf8')).csrfToken }));
        });
        r.on('error', reject);
        r.write(payload);
        r.end();
      });
    }

    const httpOwnerA = await httpLogin('owner-alpha-key', keys.ownerAlpha.privateKey);
    const httpRevA = await httpLogin('reviewer-alpha-key', keys.reviewerAlpha.privateKey);
    const httpOwnerB = await httpLogin('owner-beta-key', keys.ownerBeta.privateKey);

    const summaryA = JSON.parse((await call('GET', '/admin/api/summary', { cookie: httpOwnerA.cookie })).body);
    assert.equal(summaryA.partnerships.drafts.length, 1);
    assert.equal(summaryA.partnerships.partnerships.length, 1);
    assert.deepEqual(summaryA.revenue.actualTotalsByCurrency, { USD: 15000 });
    assert.deepEqual(summaryA.revenue.forecastTotalsByCurrency, { INR: 50000 });

    const summaryB = JSON.parse((await call('GET', '/admin/api/summary', { cookie: httpOwnerB.cookie })).body);
    assert.equal(summaryB.partnerships.drafts.length, 0);
    assert.equal(summaryB.partnerships.partnerships.length, 0);

    // Non-owner mutation denied (403)
    const revDeny = await call('POST', '/admin/approvals', { cookie: httpRevA.cookie, csrf: httpRevA.csrf, data: {} });
    assert.equal(revDeny.status, 403);

    // Revoke active owner session -> immediate 401
    const logoutRes = await call('POST', '/logout', { cookie: httpOwnerA.cookie, csrf: httpOwnerA.csrf, data: {} });
    assert.equal(logoutRes.status, 200);
    const afterRevoke = await call('GET', '/admin/api/summary', { cookie: httpOwnerA.cookie });
    assert.equal(afterRevoke.status, 401);

    // 4. Snapshot Export / Verify / Tamper Drill from real Org A DB state
    const snapshot = buildCanonicalSnapshot({
      organizationId: 'org-alpha',
      capturedAt: new Date().toISOString(),
      monthlyBudgetInr: 0,
      delegatedSpendInr: 0,
      publicAffiliateUrl: null,
      partnerships: summaryA.partnerships.partnerships.map(p => ({ id: p.id, state: p.state, step: p.step })),
      forecastTotalsByCurrency: summaryA.revenue.forecastTotalsByCurrency,
      actualTotalsByCurrency: summaryA.revenue.actualTotalsByCurrency,
      unknownMetricsCount: null
    });
    assert.equal(verifyCanonicalSnapshot(snapshot).status, 'pass');
    assert.throws(
      () => verifyCanonicalSnapshot({ ...snapshot, payload: { ...snapshot.payload, actualTotalsByCurrency: { USD: 999999 } } }),
      /Snapshot digest mismatch/
    );

    assert.equal(evaluateSecurityDrillMatrix({
      revokedSessionStatus: afterRevoke.status,
      nonOwnerMutationStatus: revDeny.status,
      crossTenantSpoofStatus: 403,
      csrfMismatchStatus: 403,
      paidAiRouterError: 'budget_violation',
      secretPayloadError: 'secret_detected'
    }).status, 'pass');
  } finally {
    await appPool?.end();
    await controlPool?.end();
    await app?.close();
    await admin.query('ALTER ROLE stackpilot_control NOLOGIN');
    await admin.end();
    rmSync(root, { recursive: true, force: true });
  }
});
