import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminUiRouter } from '../src/platform/admin-ui/routes.mjs';
import { auditLocalControlPlaneExport } from '../src/lib/local-control-plane-export.mjs';

function mockRes() {
  const state = { status: null, headers: null, body: '' };
  return {
    destroyed: false,
    writableEnded: false,
    writeHead(status, headers) {
      state.status = status;
      state.headers = headers;
    },
    end(chunk = '') {
      state.body = String(chunk ?? '');
      this.writableEnded = true;
    },
    state
  };
}

test('admin UI router enforces authentication, role gating, security headers, and sanitized errors', async () => {
  const fakeIdentity = {
    async requirePrincipal(handle) {
      if (!handle || !handle.role) throw new Error('Identity operation failed');
      return handle;
    }
  };
  const fakeReader = {
    async loadOverview() {
      return {
        monthlyBudgetInr: 0,
        delegatedSpendInr: 0,
        publicAffiliateUrl: null,
        noindexActive: true,
        healthStatus: 'healthy',
        findingsCount: 0
      };
    },
    async loadApprovals() { return []; },
    async loadClaims() { return []; },
    async loadPartnerships() { return { drafts: [], partnerships: [] }; },
    async loadRevenue() { return { forecastTotalsByCurrency: {}, actualTotalsByCurrency: {} }; },
    async loadAiEngineering() { return { routing: [], triage: [] }; }
  };

  let decisionCalled = false;
  const router = createAdminUiRouter({
    identity: fakeIdentity,
    reader: fakeReader,
    onApprovalDecision: async () => {
      decisionCalled = true;
      return { ok: true };
    }
  });

  // 1. Unauthenticated request fails closed (401)
  const unauthRes = mockRes();
  await router.handle({ method: 'GET' }, unauthRes, { path: '/admin', handle: null });
  assert.equal(unauthRes.state.status, 401);

  // 2. Authenticated GET /admin returns 200 HTML with strict security headers
  const okRes = mockRes();
  await router.handle({ method: 'GET' }, okRes, {
    path: '/admin',
    handle: { organizationId: 'org-alpha', userId: 'reviewer-1', role: 'reviewer' }
  });
  assert.equal(okRes.state.status, 200);
  assert.equal(okRes.state.headers['Cache-Control'], 'no-store');
  assert.equal(okRes.state.headers['X-Robots-Tag'], 'noindex, nofollow');
  assert.match(okRes.state.body, /Governance &amp; Health Overview/);

  // 3. Authenticated GET /admin/api/summary returns JSON
  const jsonRes = mockRes();
  await router.handle({ method: 'GET' }, jsonRes, {
    path: '/admin/api/summary',
    handle: { organizationId: 'org-alpha', userId: 'owner-1', role: 'owner' }
  });
  assert.equal(jsonRes.state.status, 200);
  assert.equal(JSON.parse(jsonRes.state.body).organizationId, 'org-alpha');

  // 4. Reviewer POST mutation is denied with 403
  const revPostRes = mockRes();
  await router.handle({ method: 'POST' }, revPostRes, {
    path: '/admin/approvals',
    handle: { organizationId: 'org-alpha', userId: 'reviewer-1', role: 'reviewer' },
    body: { requestId: 'req-1', decision: 'approved', expectedVersion: 0, requestDigest: 'a'.repeat(64) }
  });
  assert.equal(revPostRes.state.status, 403);
  assert.equal(decisionCalled, false);

  // 5. Owner POST mutation succeeds
  const ownerPostRes = mockRes();
  await router.handle({ method: 'POST' }, ownerPostRes, {
    path: '/admin/approvals',
    handle: { organizationId: 'org-alpha', userId: 'owner-1', role: 'owner' },
    body: { requestId: 'req-1', decision: 'approved', expectedVersion: 0, requestDigest: 'a'.repeat(64) }
  });
  assert.equal(ownerPostRes.state.status, 200);
  assert.equal(decisionCalled, true);
});

test('auditLocalControlPlaneExport blocks Phase 8 private admin UI paths and markers in dist', () => {
  for (const marker of [
    'createAdminUiRouter',
    'createAdminDbReader',
    'renderAdminPage',
    'presentAdminOverview',
    'presentAdminRevenue',
    'ADMIN_SECURITY_HEADERS'
  ]) {
    const res = auditLocalControlPlaneExport([{ path: 'assets/app.js', content: `export const x = "${marker}";` }]);
    assert.equal(res.violations.length, 1);
  }
  for (const path of [
    'platform/admin-ui/routes.mjs',
    'admin/index.html',
    'admin/revenue/index.html',
    'admin/api/summary/index.json'
  ]) {
    const res = auditLocalControlPlaneExport([{ path, content: 'ok' }]);
    assert.equal(res.violations.length, 1);
  }
});
