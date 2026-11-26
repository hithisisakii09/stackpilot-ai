import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_SECURITY_HEADERS,
  escapeHtml,
  formatMinorCurrency,
  presentAdminOverview,
  presentAdminApprovals,
  presentAdminClaims,
  presentAdminPartnerships,
  presentAdminRevenue,
  presentAdminAiEngineering
} from '../src/platform/admin-ui/presenter.mjs';
import { renderAdminPage } from '../src/platform/admin-ui/views.mjs';

test('ADMIN_SECURITY_HEADERS and escapeHtml enforce strict CSP, no-store, noindex, and XSS escaping', () => {
  assert.equal(ADMIN_SECURITY_HEADERS['Cache-Control'], 'no-store');
  assert.equal(ADMIN_SECURITY_HEADERS['X-Robots-Tag'], 'noindex, nofollow');
  assert.equal(ADMIN_SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff');
  assert.equal(ADMIN_SECURITY_HEADERS['Referrer-Policy'], 'no-referrer');
  assert.match(ADMIN_SECURITY_HEADERS['Content-Security-Policy'], /default-src 'none'/);
  assert.match(ADMIN_SECURITY_HEADERS['Content-Security-Policy'], /frame-ancestors 'none'/);

  assert.equal(
    escapeHtml(`<script>alert("x&'y")</script>`),
    '&lt;script&gt;alert(&quot;x&amp;&#39;y&quot;)&lt;/script&gt;'
  );
  assert.equal(formatMinorCurrency(null, 'USD'), '—');
  assert.equal(formatMinorCurrency(12505, 'USD'), 'USD 125.05');
  assert.equal(formatMinorCurrency(-500, 'INR'), 'INR -5.00');
});

test('all six admin views render cleanly, preserve null as —, and escape untrusted strings', () => {
  const principal = { organizationId: 'org-alpha', userId: 'owner-1', role: 'owner' };

  const overview = presentAdminOverview({
    principal,
    monthlyBudgetInr: 0,
    delegatedSpendInr: 0,
    publicAffiliateUrl: null,
    noindexActive: true,
    healthStatus: 'healthy',
    findingsCount: 0
  });
  const overviewHtml = renderAdminPage('overview', overview);
  assert.match(overviewHtml, /Governance &amp; Health Overview/);
  assert.match(overviewHtml, /monthly_budget_inr = 0/);

  const approvals = presentAdminApprovals({
    principal,
    items: [{ id: 'req-1', kind: 'claim', status: 'pending', title: '<img src=x onerror=alert(1)>' }]
  });
  const approvalsHtml = renderAdminPage('approvals', approvals);
  assert.doesNotMatch(approvalsHtml, /<img src=x/);
  assert.match(approvalsHtml, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(approvalsHtml, /Owner approval controls enabled/);

  const reviewerApprovals = presentAdminApprovals({
    principal: { organizationId: 'org-alpha', userId: 'rev-1', role: 'reviewer' },
    items: [{ id: 'req-1', kind: 'claim', status: 'pending', title: 'Claim 1' }]
  });
  assert.match(renderAdminPage('approvals', reviewerApprovals), /Read-only \(owner required for mutations\)/);

  const claims = presentAdminClaims({
    principal,
    claims: [{ id: 'claim-1', status: 'candidate', freshness: 'unverified', observedPriceMinor: null, currency: 'USD' }]
  });
  const claimsHtml = renderAdminPage('claims', claims);
  assert.match(claimsHtml, /<td>—<\/td>/);

  const partnerships = presentAdminPartnerships({
    principal,
    drafts: [{ id: 'draft-1', title: 'CRM Guide', status: 'draft', citedCount: 1 }],
    partnerships: [{ id: 'p-1', vendorId: 'hubspot', state: 'owner_application_approved', step: 5, publicAffiliateUrl: null }]
  });
  assert.match(renderAdminPage('partnerships', partnerships), /owner_application_approved/);

  const revenue = presentAdminRevenue({
    principal,
    forecastTotalsByCurrency: { INR: 100000 },
    actualTotalsByCurrency: { USD: 20000 }
  });
  const revHtml = renderAdminPage('revenue', revenue);
  assert.match(revHtml, /Forecasts \(Non-Authoritative\)/);
  assert.match(revHtml, /Statement-Backed Actuals/);
  assert.match(revHtml, /INR 1000\.00/);
  assert.match(revHtml, /USD 200\.00/);

  const aiEng = presentAdminAiEngineering({
    principal,
    routing: [{ id: 'evt-1', taskClass: 'code_review', selectedModelId: 'local-qwen-7b', tier: 'local', estimatedCostMinor: 0, allowed: true }],
    triage: [{ id: 'tri-1', candidateStatus: 'degraded', classifications: ['test_failure'] }]
  });
  assert.match(renderAdminPage('ai-engineering', aiEng), /local-qwen-7b/);
});

test('presenter rejects Proxy, prototype payloads, non-zero budget, and active affiliateUrl', () => {
  const principal = { organizationId: 'org-alpha', userId: 'owner-1', role: 'owner' };
  assert.throws(
    () => presentAdminOverview(new Proxy({
      principal,
      monthlyBudgetInr: 0,
      delegatedSpendInr: 0,
      publicAffiliateUrl: null,
      noindexActive: true,
      healthStatus: 'healthy',
      findingsCount: 0
    }, {})),
    /Invalid admin UI input/
  );

  assert.throws(
    () => presentAdminOverview({
      principal,
      monthlyBudgetInr: 100,
      delegatedSpendInr: 0,
      publicAffiliateUrl: null,
      noindexActive: true,
      healthStatus: 'healthy',
      findingsCount: 0
    }),
    /Invalid admin UI input/
  );
});
