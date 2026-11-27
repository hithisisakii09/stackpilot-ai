import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  collectCompanyOperationsSnapshot,
  validateCeoBriefings,
  buildCeoBriefingPrompt,
  runCeoBriefingAgent,
  formatCeoBriefingMarkdown,
} from '../src/platform/agents/ceo-briefing.mjs';
import { routeAiRequest } from '../src/platform/ai/router.mjs';
import {
  createFreeTierModelRegistry,
  createGeminiFreeAdapter,
  createOpenAIFallbackAdapter,
} from '../src/platform/ai/live-adapters.mjs';
import { executeLiveRoutedPrompt } from '../src/platform/ai/live-runner.mjs';
import { auditLocalControlPlaneExport } from '../src/lib/local-control-plane-export.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function makeSyntheticInputs() {
  return {
    fingerprints: {
      schemaVersion: 1,
      updatedAt: '2026-11-27T13:33:59.839Z',
      urls: {
        'https://legal.hubspot.com/hubspot-product-and-services-catalog': {
          contentHash: 'abc123',
          lastCheckedAt: '2026-11-27T13:33:59.839Z',
        },
        'https://www.semrush.com/pricing/seo-ai-search/': {
          contentHash: 'def456',
          lastCheckedAt: '2026-11-27T13:33:59.839Z',
        },
      },
    },
    guides: {
      schemaVersion: 1,
      guides: [
        { slug: 'crm-data-export-and-portability-guide', title: 'CRM Data Export' },
      ],
    },
    backlog: {
      schemaVersion: 1,
      topics: [
        { slug: 'crm-data-export-and-portability-guide', status: 'drafted' },
        { slug: 'seo-tool-team-seat-pricing-guide', status: 'pending' },
        { slug: 'managed-wordpress-hosting-billing-models-guide', status: 'pending' },
      ],
    },
    verifiedVendorFacts: {
      'hubspot-vs-pipedrive': { checkedAt: '2026-11-27', rows: [] },
      'semrush-vs-ahrefs': { checkedAt: '2026-11-27', rows: [] },
    },
    sitemapXml: '<?xml version="1.0"?><urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/compare/</loc></url></urlset>',
    distributionDrafts: {
      schemaVersion: 1,
      packs: [
        {
          id: 'dist-001',
          targetSlug: 'crm-data-export-and-portability-guide',
          status: 'pending_owner_review',
        },
      ],
    },
    outreachDrafts: {
      schemaVersion: 1,
      drafts: [
        {
          id: 'outreach-ahrefs',
          vendorSlug: 'ahrefs',
          status: 'pending_owner_review',
        },
      ],
    },
    products: [
      { id: 'hubspot', name: 'HubSpot', affiliateUrl: null },
      { id: 'pipedrive', name: 'Pipedrive', affiliateUrl: null },
      { id: 'ahrefs', name: 'Ahrefs', affiliateUrl: null },
    ],
    operatingPolicy: {
      policyVersion: 1,
      monthlyBudgetINR: 0,
      delegatedSpendINR: 0,
      hostingCandidate: 'netlify-free',
      commercialHostingApproved: false,
      productionLaunchApproved: true,
      affiliateActivationApproved: false,
      paidServicesApproved: false,
    },
  };
}

function makeValidBriefing(overrides = {}) {
  const snapshot = collectCompanyOperationsSnapshot(makeSyntheticInputs());
  return {
    id: 'ceo-briefing-2026-11-27',
    generatedAt: '2026-11-27',
    snapshot,
    executiveSummary: 'All four operational agents remain active under zero-budget governance. Two vendor docs are baselined, one buyer guide is published, and external analytics remain uncollected pending owner setup.',
    topPriorities: [
      'Review and approve the pending buyer guide distribution pack before posting.',
      'Review pending vendor outreach draft for Ahrefs under zero-budget policy.',
      'Connect Google Search Console telemetry to populate external click metrics.',
    ],
    aiSynthesized: true,
    estimatedCostMinor: 0,
    ...overrides,
  };
}

// ── 1. Fail-closed by default ───────────────────────────────────────────────
test('default runCeoBriefingAgent fails closed with live_ceo_brief_disabled and zero AI calls', async () => {
  let aiCalls = 0;
  const result = await runCeoBriefingAgent({
    inputs: makeSyntheticInputs(),
    existingBriefings: { schemaVersion: 1, briefings: [] },
    runAiPrompt: async () => {
      aiCalls++;
      return '{}';
    },
    allowLiveBriefing: false,
    allowLiveAi: false,
    now: '2026-11-27T03:30:00.000Z',
  });

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 'live_ceo_brief_disabled');
  assert.strictEqual(aiCalls, 0);
  assert.strictEqual(result.estimatedCostMinor, 0);
  assert.ok(result.snapshot, 'Includes computed snapshot even when fail-closed');
});

// ── 2. collectCompanyOperationsSnapshot ─────────────────────────────────────
test('collectCompanyOperationsSnapshot computes exact counts, preserves null, and does not mutate inputs', () => {
  const inputs = makeSyntheticInputs();
  const before = JSON.stringify(inputs);

  const snapshot = collectCompanyOperationsSnapshot(inputs);

  assert.strictEqual(JSON.stringify(inputs), before, 'Inputs must not be mutated');
  assert.deepStrictEqual(snapshot.researchMonitor, {
    monitoredUrlCount: 2,
    baselinedUrlCount: 2,
    lastUpdatedAt: '2026-11-27T13:33:59.839Z',
  });
  assert.deepStrictEqual(snapshot.seoBuilder, {
    publishedGuidesCount: 1,
    pendingTopicsCount: 2,
    publicSitemapUrlCount: 2,
  });
  assert.deepStrictEqual(snapshot.trafficDistribution, {
    pendingPacksCount: 1,
    uncoveredPublishedCount: 2,
  });
  assert.deepStrictEqual(snapshot.vendorOutreach, {
    totalCatalogVendors: 3,
    pendingDraftsCount: 1,
    remainingVendorsCount: 2,
    activeAffiliateLinksCount: 0,
  });
  assert.deepStrictEqual(snapshot.governanceAndRevenue, {
    monthlyBudgetINR: 0,
    affiliateActivationApproved: false,
    verifiedRevenueMinorUnits: 0,
    externalClicksLast7d: null,
    externalImpressionsLast7d: null,
    estimatedAiSpendMinor: 0,
  });
  assert.strictEqual(snapshot.governanceAndRevenue.externalClicksLast7d, null);
  assert.strictEqual(snapshot.governanceAndRevenue.externalImpressionsLast7d, null);
});

// ── 3. validateCeoBriefings ─────────────────────────────────────────────────
test('validateCeoBriefings accepts valid briefing records', () => {
  const validated = validateCeoBriefings(
    { schemaVersion: 1, briefings: [makeValidBriefing()] },
    { today: '2026-11-27' },
  );
  assert.strictEqual(validated.briefings.length, 1);
  assert.strictEqual(validated.briefings[0].estimatedCostMinor, 0);
});

test('validateCeoBriefings rejects non-zero estimatedCostMinor', () => {
  assert.throws(
    () => validateCeoBriefings(
      { schemaVersion: 1, briefings: [makeValidBriefing({ estimatedCostMinor: 10 })] },
      { today: '2026-11-27' },
    ),
    /estimatedCostMinor/i,
  );
});

test('validateCeoBriefings rejects raw HTML tags in executiveSummary and topPriorities', () => {
  assert.throws(
    () => validateCeoBriefings(
      {
        schemaVersion: 1,
        briefings: [makeValidBriefing({ executiveSummary: '<script>alert(1)</script> ' + 'x'.repeat(80) })],
      },
      { today: '2026-11-27' },
    ),
    /HTML/i,
  );
});

test('validateCeoBriefings rejects future generatedAt dates', () => {
  assert.throws(
    () => validateCeoBriefings(
      { schemaVersion: 1, briefings: [makeValidBriefing({ generatedAt: '2026-12-01' })] },
      { today: '2026-11-27' },
    ),
    /future/i,
  );
});

test('validateCeoBriefings rejects Proxy payloads', () => {
  const proxied = new Proxy(makeValidBriefing(), {});
  assert.throws(
    () => validateCeoBriefings({ schemaVersion: 1, briefings: [proxied] }, { today: '2026-11-27' }),
    /invalid/i,
  );
});

test('validateCeoBriefings rejects malformed topPriorities', () => {
  assert.throws(
    () => validateCeoBriefings(
      { schemaVersion: 1, briefings: [makeValidBriefing({ topPriorities: ['Only one item that is long enough'] })] },
      { today: '2026-11-27' },
    ),
    /topPriorities/i,
  );
});

// ── 4. Integration seam with REAL executeLiveRoutedPrompt + Gemini mock ─────
test('runCeoBriefingAgent wires through real executeLiveRoutedPrompt + routeAiRequest with Gemini mock', async () => {
  const geminiJson = JSON.stringify({
    executiveSummary: 'StackPilot operations remain strictly zero-budget with two vendor URLs baselined, one buyer guide published, and two distribution/outreach items awaiting owner review. External click and impression metrics remain null.',
    topPriorities: [
      'Review and approve the pending buyer guide distribution pack for publication.',
      'Review the pending Ahrefs vendor outreach draft before sending.',
      'Connect Google Search Console to replace null traffic telemetry.',
    ],
  });

  const mockFetch = async () => ({
    ok: true,
    status: 200,
    async text() {
      return JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: '```json\n' + geminiJson + '\n```' }],
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: { promptTokenCount: 150, candidatesTokenCount: 120 },
      });
    },
  });

  const adapters = {
    gemini: createGeminiFreeAdapter({ apiKey: 'test-gemini-key-1234567890', fetchImpl: mockFetch }),
    openai: createOpenAIFallbackAdapter({ apiKey: '', fetchImpl: mockFetch }),
  };
  const registry = createFreeTierModelRegistry();
  const now = '2026-11-27T03:30:00.000Z';

  const result = await runCeoBriefingAgent({
    inputs: makeSyntheticInputs(),
    existingBriefings: { schemaVersion: 1, briefings: [] },
    allowLiveBriefing: true,
    allowLiveAi: true,
    now,
    runAiPrompt: (request) => executeLiveRoutedPrompt({
      router: { routeAiRequest },
      adapters,
      registry,
      request: {
        taskClass: request.taskClass,
        prompt: request.prompt,
        systemPrompt: request.systemPrompt,
        requestedTokens: request.requestedTokens,
        maxOutputTokens: Math.max(Number(request.maxOutputTokens) || 0, 1024),
      },
      allowLiveNetwork: true,
      env: { STACKPILOT_ALLOW_LIVE_AI: 'true' },
      now,
    }),
  });

  assert.strictEqual(result.ok, true, `Expected ok=true, got ${result.status}: ${result.reason}`);
  assert.strictEqual(result.status, 'briefing_created');
  assert.strictEqual(result.estimatedCostMinor, 0);
  assert.strictEqual(result.generatedBriefing.id, 'ceo-briefing-2026-11-27');
  assert.strictEqual(result.generatedBriefing.aiSynthesized, true);
  assert.strictEqual(result.generatedBriefing.snapshot.governanceAndRevenue.externalClicksLast7d, null);

  const md = formatCeoBriefingMarkdown(result);
  assert.ok(md.includes('Weekly CEO Briefing'), 'Markdown includes title');
  assert.ok(md.includes('null'), 'Markdown preserves explicit null');
});

// ── 5. buildCeoBriefingPrompt contract ──────────────────────────────────────
test('buildCeoBriefingPrompt avoids double-newlines and HTML chars', () => {
  const snapshot = collectCompanyOperationsSnapshot(makeSyntheticInputs());
  const prompt = buildCeoBriefingPrompt(snapshot);
  assert.ok(!prompt.includes('\n\n'));
  assert.ok(!/[<>]/.test(prompt));
  assert.ok(prompt.includes('executiveSummary'));
  assert.ok(prompt.includes('topPriorities'));
});

// ── 6. CLI --dry-run matches live repo state offline ────────────────────────
test('scripts/agent-ceo-briefing.mjs --dry-run exits 0 offline and matches dynamic repo state', () => {
  const output = execFileSync(
    process.execPath,
    ['scripts/agent-ceo-briefing.mjs', '--dry-run'],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, STACKPILOT_ALLOW_LIVE_CEO_BRIEF: '', STACKPILOT_ALLOW_LIVE_AI: '' },
      timeout: 15000,
    },
  );

  const parsed = JSON.parse(output);
  const expectedGuides = JSON.parse(readFileSync(join(root, 'src/data/agent-buyer-guides.json'), 'utf8')).guides.length;
  const expectedBriefings = JSON.parse(readFileSync(join(root, 'src/data/agent-ceo-briefings.json'), 'utf8')).briefings.length;

  assert.strictEqual(parsed.mode, 'dry-run');
  assert.strictEqual(parsed.ok, true);
  assert.strictEqual(parsed.estimatedCostMinor, 0);
  assert.strictEqual(parsed.existingBriefingCount, expectedBriefings);
  assert.strictEqual(parsed.snapshot.seoBuilder.publishedGuidesCount, expectedGuides);
  assert.strictEqual(parsed.snapshot.governanceAndRevenue.externalClicksLast7d, null);
  assert.strictEqual(parsed.snapshot.governanceAndRevenue.externalImpressionsLast7d, null);
});

// ── 7. Workflow contract ────────────────────────────────────────────────────
test('agent-ceo-briefing.yml includes Sunday schedule, workflow_dispatch, scoped permissions, never pushes to main', () => {
  const yml = readFileSync(join(root, '.github/workflows/agent-ceo-briefing.yml'), 'utf8');
  assert.ok(yml.includes("cron: '30 3 * * 0'"));
  assert.ok(yml.includes('workflow_dispatch'));
  assert.ok(yml.includes('contents: write'));
  assert.ok(yml.includes('pull-requests: write'));
  assert.ok(yml.includes('ubuntu-24.04'));
  assert.ok(!yml.includes('refs/heads/main'));
});

// ── 8. Static leakage guard ─────────────────────────────────────────────────
test('static leakage guard blocks ceo-briefing files and STACKPILOT_ALLOW_LIVE_CEO_BRIEF from dist/', () => {
  const forbidden = [
    { path: 'platform/agents/ceo-briefing.mjs', content: 'export function runCeoBriefingAgent(){}' },
    { path: 'scripts/agent-ceo-briefing.mjs', content: 'collectCompanyOperationsSnapshot()' },
    { path: 'data/agent-ceo-briefings.json', content: '{"schemaVersion":1,"briefings":[]}' },
    { path: 'env.js', content: 'const flag = process.env.STACKPILOT_ALLOW_LIVE_CEO_BRIEF;' },
  ];

  for (const file of forbidden) {
    const res = auditLocalControlPlaneExport([file]);
    assert.ok(res.violations.length > 0, `Expected violation for ${file.path}`);
  }
});
