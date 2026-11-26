import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { request as httpsRequest } from 'node:https';
import { generateKeyPairSync, sign } from 'node:crypto';
import { openLocalPool } from '../../src/platform/persistence/connection.mjs';
import { applyMigrations } from '../../src/platform/persistence/migrate.mjs';
import { startLocalControlPlane } from '../../src/control-plane/server.mjs';

const config = JSON.parse(process.env.STACKPILOT_TEST_DB ?? 'null');
if (config?.database !== 'stackpilot_admin_test') {
  throw new Error('Use disposable admin UI integration harness');
}

const admin = await openLocalPool(config);
const root = realpathSync(mkdtempSync(join(tmpdir(), 'stackpilot-admin-')));
const openssl = process.platform === 'win32' ? 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe' : 'openssl';
const file = name => join(root, name);
const run = args => execFileSync(openssl, args, { stdio: 'ignore', windowsHide: true, timeout: 30000, env: { ...process.env, OPENSSL_CONF: file('openssl.cnf') } });
let app;

test('private admin UI over local HTTPS with RLS isolation and owner-only mutations', async () => {
  try {
    writeFileSync(file('openssl.cnf'), '[req]\ndistinguished_name=dn\n[dn]\n');
    run(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', file('ca.key'), '-out', file('ca.crt'), '-subj', '/CN=StackPilot Admin Test CA', '-days', '1', '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign']);
    run(['req', '-new', '-newkey', 'rsa:2048', '-nodes', '-keyout', file('server.key'), '-out', file('server.csr'), '-subj', '/CN=127.0.0.1']);
    writeFileSync(file('extensions.cnf'), 'subjectAltName=IP:127.0.0.1\nextendedKeyUsage=serverAuth\nbasicConstraints=CA:FALSE\n');
    run(['x509', '-req', '-in', file('server.csr'), '-CA', file('ca.crt'), '-CAkey', file('ca.key'), '-CAcreateserial', '-out', file('server.crt'), '-days', '1', '-extfile', file('extensions.cnf')]);

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
    writeFileSync(file('trust.json'), JSON.stringify({ schemaVersion: 1, principals }));

    for (const org of ['org-alpha', 'org-beta']) {
      await admin.query('INSERT INTO organizations(id, name) VALUES ($1, $1)', [org]);
      await admin.query("INSERT INTO categories(organization_id, id, slug, name) VALUES ($1, 'cat-crm', 'crm', 'CRM')", [org]);
      await admin.query("INSERT INTO vendors(organization_id, id, name, website) VALUES ($1, 'vendor-test', 'Vendor', 'https://example.com/')", [org]);
      await admin.query("INSERT INTO products(organization_id, id, category_id, vendor_id, slug, name, website) VALUES ($1, 'product-test', 'cat-crm', 'vendor-test', 'product-test', 'Product', 'https://example.com/')", [org]);
      await admin.query("INSERT INTO agents(organization_id, id, role, version) VALUES ($1, 'qa-agent', 'qa', 1)", [org]);
      await admin.query("INSERT INTO affiliate_programmes(organization_id, id, vendor_id, source_url) VALUES ($1, 'prog-test', 'vendor-test', 'https://example.com/partners')", [org]);
    }
    for (const p of principals) {
      await admin.query('INSERT INTO users(organization_id, id, display_name) VALUES ($1, $2, $2)', [p.organizationId, p.userId]);
    }

    // Seed org-alpha partnership, forecast vs actual revenue, and AI routing telemetry
    await admin.query("INSERT INTO partnerships(organization_id, id, vendor_id, step, status) VALUES ('org-alpha', 'partner-alpha', 'vendor-test', 1, 'draft')");
    await admin.query(`INSERT INTO partnership_events(organization_id, id, partnership_id, kind, evidence) VALUES ('org-alpha', 'pevt-1', 'partner-alpha', 'owner_application_approved', '{"seq":1,"to":"owner_application_approved","step":5}'::jsonb)`);
    await admin.query("INSERT INTO external_statements(organization_id, id, programme_id, statement_digest, recorded_at) VALUES ('org-alpha', 'stmt-alpha', 'prog-test', repeat('a', 64), now() - interval '1 hour')");
    await admin.query("INSERT INTO revenue_ledger_entries(organization_id, id, programme_id, entry_type, entry_kind, currency, amount_minor, period_start, period_end, recorded_at) VALUES ('org-alpha', 'rev-f-1', 'prog-test', 'forecast', 'initial', 'INR', 100000, now() - interval '2 days', now() - interval '1 day', now() - interval '1 hour')");
    await admin.query("INSERT INTO revenue_ledger_entries(organization_id, id, programme_id, entry_type, entry_kind, statement_id, statement_digest, currency, amount_minor, period_start, period_end, recorded_at) VALUES ('org-alpha', 'rev-a-1', 'prog-test', 'actual', 'initial', 'stmt-alpha', repeat('a', 64), 'USD', 25000, now() - interval '2 days', now() - interval '1 day', now() - interval '1 hour')");
    await admin.query(`INSERT INTO audit_events(organization_id, id, actor_id, request_id, action, target_id, data) VALUES ('org-alpha', 'ai-evt-1', 'reviewer-alpha', 'req-ai-1', 'ai-routing-decision', 'local-qwen-7b', '{"allowed":true,"telemetry":{"taskClass":"code_review","selectedModelId":"local-qwen-7b","estimatedCostMinor":0}}'::jsonb)`);
    await admin.query(`INSERT INTO audit_events(organization_id, id, actor_id, request_id, action, target_id, data) VALUES ('org-alpha', 'eng-evt-1', 'reviewer-alpha', 'req-eng-1', 'engineering-health-report', 'healthy', '{"status":"healthy","findings":[]}'::jsonb)`);

    // Seed claim + approval request for org-alpha
    await admin.query("INSERT INTO product_claims(organization_id, id, product_id, statement, caveat) VALUES ('org-alpha', 'claim-alpha', 'product-test', 'Verified statement', 'Bounded')");
    await admin.query("INSERT INTO evidence_sources(organization_id, id, product_id, source_url, collected_at, source_digest) VALUES ('org-alpha', 'source-alpha', 'product-test', 'https://example.com/docs', now() - interval '1 day', repeat('a', 64))");
    await admin.query("INSERT INTO claim_evidence(organization_id, id, product_id, claim_id, source_id) VALUES ('org-alpha', 'link-alpha', 'product-test', 'claim-alpha', 'source-alpha')");

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
        const req = httpsRequest(origin + path, { method, headers, ca, rejectUnauthorized: true }, res => {
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
        });
        req.on('error', reject);
        if (payload !== undefined) req.write(payload);
        req.end();
      });
    }

    async function login(keyId, privateKey) {
      const ch = await call('POST', '/auth/challenge', { data: { keyId } });
      assert.equal(ch.status, 200);
      const challenge = JSON.parse(ch.body);
      const signature = sign(null, Buffer.from(challenge.message), privateKey).toString('base64url');
      const ses = await call('POST', '/auth/session', { data: { keyId, challengeId: challenge.challengeId, nonce: challenge.nonce, signature } });
      assert.equal(ses.status, 200);
      const parsed = JSON.parse(ses.body);
      return { cookie: ses.headers['set-cookie'][0].split(';')[0], csrf: parsed.csrfToken };
    }

    const ownerAlpha = await login('owner-alpha-key', keys.ownerAlpha.privateKey);
    const reviewerAlpha = await login('reviewer-alpha-key', keys.reviewerAlpha.privateKey);
    const ownerBeta = await login('owner-beta-key', keys.ownerBeta.privateKey);

    // 1. Unauthenticated /admin fails closed (401)
    assert.equal((await call('GET', '/admin')).status, 401);

    // 2. Authenticated admin HTML views return 200 with strict headers & tenant data
    for (const path of ['/admin', '/admin/approvals', '/admin/claims', '/admin/partnerships', '/admin/revenue', '/admin/ai-engineering']) {
      const res = await call('GET', path, { cookie: ownerAlpha.cookie });
      assert.equal(res.status, 200, 'Expected 200 for ' + path);
      assert.equal(res.headers['cache-control'], 'no-store');
      assert.match(res.headers['x-robots-tag'], /noindex, nofollow/);
      assert.match(res.headers['content-security-policy'], /default-src 'none'/);
    }

    const revHtml = await call('GET', '/admin/revenue', { cookie: ownerAlpha.cookie });
    assert.match(revHtml.body, /INR 1000\.00/);
    assert.match(revHtml.body, /USD 250\.00/);

    // 3. Cross-tenant RLS isolation in /admin/api/summary
    const alphaSummary = JSON.parse((await call('GET', '/admin/api/summary', { cookie: ownerAlpha.cookie })).body);
    assert.equal(alphaSummary.partnerships.partnerships.length, 1);
    assert.equal(alphaSummary.aiEngineering.routing.length, 1);

    const betaSummary = JSON.parse((await call('GET', '/admin/api/summary', { cookie: ownerBeta.cookie })).body);
    assert.equal(betaSummary.partnerships.partnerships.length, 0);
    assert.equal(betaSummary.aiEngineering.routing.length, 0);

    // 4. Reviewer POST to /admin/approvals is denied with 403
    const reqRes = await call('POST', '/approval-requests', {
      cookie: reviewerAlpha.cookie,
      csrf: reviewerAlpha.csrf,
      data: { requestId: 'req-admin-1', claimId: 'claim-alpha', agentId: 'qa-agent' }
    });
    assert.equal(reqRes.status, 200);
    const createdReq = JSON.parse(reqRes.body);

    const revDeny = await call('POST', '/admin/approvals', {
      cookie: reviewerAlpha.cookie,
      csrf: reviewerAlpha.csrf,
      data: { requestId: createdReq.requestId, decision: 'approved', expectedVersion: 0, requestDigest: createdReq.requestDigest }
    });
    assert.equal(revDeny.status, 403);

    // Owner POST to /admin/approvals succeeds
    const ownerOk = await call('POST', '/admin/approvals', {
      cookie: ownerAlpha.cookie,
      csrf: ownerAlpha.csrf,
      data: { requestId: createdReq.requestId, decision: 'approved', expectedVersion: 0, requestDigest: createdReq.requestDigest }
    });
    assert.equal(ownerOk.status, 200);
  } finally {
    await app?.close();
    await admin.query('ALTER ROLE stackpilot_control NOLOGIN');
    await admin.end();
    rmSync(root, { recursive: true, force: true });
  }
});
