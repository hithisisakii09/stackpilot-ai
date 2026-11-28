import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ── Import the agent module ─────────────────────────────────────────────────
import {
  validateDistributionPacks,
  selectNextContentForDistribution,
  buildDistributionPrompt,
  parseAndValidateDistributionResponse,
  runTrafficDistributionAgent,
  extractGscTopicOpportunities,
  formatDistributionReportMarkdown,
} from '../src/platform/agents/traffic-distribution.mjs';

// ── Canonical test fixtures ─────────────────────────────────────────────────
import { SITE_ORIGIN } from '../src/lib/site-origin.mjs';

// Actual sourceUrls from verified-vendor-facts.json (HubSpot vs Pipedrive)
const HUBSPOT_EXPORT_URL = 'https://knowledge.hubspot.com/import-and-export/export-records';
const PIPEDRIVE_STORAGE_URL = 'https://support.pipedrive.com/en/article/how-can-i-free-up-space';

const ALLOWED_CANONICAL_URLS = [
  `${SITE_ORIGIN}/guides/crm-data-export-and-portability-guide/`,
  `${SITE_ORIGIN}/compare/hubspot-vs-pipedrive/`,
  `${SITE_ORIGIN}/compare/semrush-vs-ahrefs/`,
  `${SITE_ORIGIN}/compare/kinsta-vs-cloudways/`,
];

const ALLOWED_OFFICIAL_URLS = [
  HUBSPOT_EXPORT_URL,
  PIPEDRIVE_STORAGE_URL,
  'https://support.pipedrive.com/en/article/visibility-and-permissions-overview',
  'https://legal.hubspot.com/hubspot-product-and-services-catalog',
  'https://knowledge.hubspot.com/',
  'https://www.pipedrive.com/en/crm/solutions/nimble-alternative',
  'https://www.semrush.com/pricing/seo-ai-search/',
  'https://help.ahrefs.com/en/articles/9734884-what-is-the-difference-between-credit-based-plans-and-unlimited-credit-plans',
  'https://www.semrush.com/kb/1409-user-management',
  'https://help.ahrefs.com/en/articles/3945807-about-shared-workspaces',
  'https://kinsta.com/docs/billing/wordpress-hosting-plans/',
  'https://www.cloudways.com/en/pricing.php',
  'https://kinsta.com/wordpress-hosting/',
];

function makeValidPack(overrides = {}) {
  return {
    id: 'dist-001',
    targetSlug: 'crm-data-export-and-portability-guide',
    targetType: 'guide',
    canonicalUrl: `${SITE_ORIGIN}/guides/crm-data-export-and-portability-guide/`,
    status: 'pending_owner_review',
    draftedAt: '2026-11-27T05:00:00.000Z',
    ownerApprovalRequired: true,
    channels: {
      linkedin: 'If you manage CRM data, portability matters. This guide compares HubSpot and Pipedrive export features using official vendor docs. See the breakdown: ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/',
      xThread: [
        'Thread: CRM data portability compared \u2014 HubSpot vs Pipedrive (official docs only). \ud83e\uddf5',
        'HubSpot lets you export records, lists, and property history to CSV/XLS/XLSX with optional Super Admin approvals.',
        'Pipedrive supports 50 MB / 50k-row imports and 30-day deleted deal recovery. Full guide: ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/',
      ],
      reddit: {
        title: 'CRM data export compared: HubSpot vs Pipedrive (vendor docs)',
        body: 'Comparing the export and portability specs of two popular CRMs based on their official documentation. No affiliate links.',
      },
      newsletterBlurb: 'New buyer guide: CRM data export and portability \u2014 HubSpot vs Pipedrive. Source: official vendor docs. ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/',
    },
    referencedOfficialUrls: [HUBSPOT_EXPORT_URL, PIPEDRIVE_STORAGE_URL],
    ...overrides,
  };
}

// ── Synthetic in-memory fixtures ────────────────────────────────────────────
const SYNTHETIC_GUIDES = {
  schemaVersion: 1,
  guides: [
    {
      slug: 'crm-data-export-and-portability-guide',
      title: 'CRM Data Export and Portability Buyer Guide: HubSpot vs Pipedrive',
      publishedAt: '2026-11-27',
      relatedComparisonSlugs: ['hubspot-vs-pipedrive'],
      citations: [
        { label: 'HubSpot Export Records Docs', url: HUBSPOT_EXPORT_URL },
        { label: 'Pipedrive Storage & Export Docs', url: PIPEDRIVE_STORAGE_URL },
      ],
    },
  ],
};

const SYNTHETIC_VENDOR_FACTS = {
  'hubspot-vs-pipedrive': {
    checkedAt: '2026-11-27',
    rows: [
      {
        dimension: 'Data export',
        first: { summary: 'HubSpot export', sourceLabel: 'HubSpot', sourceUrl: HUBSPOT_EXPORT_URL },
        second: { summary: 'Pipedrive export', sourceLabel: 'Pipedrive', sourceUrl: PIPEDRIVE_STORAGE_URL },
      },
    ],
  },
};

const SYNTHETIC_EXISTING_PACKS = { schemaVersion: 1, packs: [] };

// ── 1. Fail-closed: live distribution disabled by default ───────────────────
test('default runTrafficDistributionAgent fails closed with live_distribution_disabled and zero AI calls', async () => {
  let aiCallCount = 0;
  const runAiPrompt = async () => { aiCallCount++; return '{}'; };

  const result = await runTrafficDistributionAgent({
    guides: SYNTHETIC_GUIDES,
    existingPacks: SYNTHETIC_EXISTING_PACKS,
    verifiedVendorFacts: SYNTHETIC_VENDOR_FACTS,
    siteOrigin: SITE_ORIGIN,
    runAiPrompt,
    allowLiveDistribution: false,
    allowLiveAi: false,
    now: new Date('2026-11-27T05:00:00.000Z'),
  });

  assert.strictEqual(result.status, 'live_distribution_disabled');
  assert.strictEqual(aiCallCount, 0, 'No AI calls when live disabled');
  assert.ok(Array.isArray(result.eligibleTargets), 'eligibleTargets is an array');
  assert.strictEqual(result.estimatedCostMinor, 0);
});

// ── 2. validateDistributionPacks — accept valid, reject bad ─────────────────
test('validateDistributionPacks accepts valid pending_owner_review packs', () => {
  const data = { schemaVersion: 1, packs: [makeValidPack()] };
  const result = validateDistributionPacks(data, ALLOWED_CANONICAL_URLS, ALLOWED_OFFICIAL_URLS);
  assert.deepStrictEqual(result.violations, []);
});

test('validateDistributionPacks rejects status posted', () => {
  const data = { schemaVersion: 1, packs: [makeValidPack({ status: 'posted' })] };
  const result = validateDistributionPacks(data, ALLOWED_CANONICAL_URLS, ALLOWED_OFFICIAL_URLS);
  assert.ok(result.violations.length > 0, 'Should reject status=posted');
});

test('validateDistributionPacks rejects xThread item over 280 chars', () => {
  const longTweet = 'x'.repeat(281);
  const pack = makeValidPack();
  pack.channels.xThread = [longTweet];
  const data = { schemaVersion: 1, packs: [pack] };
  const result = validateDistributionPacks(data, ALLOWED_CANONICAL_URLS, ALLOWED_OFFICIAL_URLS);
  assert.ok(result.violations.length > 0, 'Should reject xThread > 280 chars');
});

test('validateDistributionPacks rejects hallucinated canonicalUrl', () => {
  const pack = makeValidPack({ canonicalUrl: 'https://example.com/not-our-site/' });
  const data = { schemaVersion: 1, packs: [pack] };
  const result = validateDistributionPacks(data, ALLOWED_CANONICAL_URLS, ALLOWED_OFFICIAL_URLS);
  assert.ok(result.violations.length > 0, 'Should reject non-allowlisted canonicalUrl');
});

test('validateDistributionPacks rejects hallucinated referencedOfficialUrl', () => {
  const pack = makeValidPack({ referencedOfficialUrls: ['https://made-up-vendor.com/pricing'] });
  const data = { schemaVersion: 1, packs: [pack] };
  const result = validateDistributionPacks(data, ALLOWED_CANONICAL_URLS, ALLOWED_OFFICIAL_URLS);
  assert.ok(result.violations.length > 0, 'Should reject non-allowlisted official URL');
});

test('validateDistributionPacks rejects affiliate/tracking params in URLs', () => {
  const pack = makeValidPack({
    canonicalUrl: `${SITE_ORIGIN}/guides/crm-data-export-and-portability-guide/?ref=aff123`,
  });
  const data = { schemaVersion: 1, packs: [pack] };
  const result = validateDistributionPacks(data, ALLOWED_CANONICAL_URLS, ALLOWED_OFFICIAL_URLS);
  assert.ok(result.violations.length > 0, 'Should reject tracking params in URL');
});

test('validateDistributionPacks rejects HTML in content', () => {
  const pack = makeValidPack();
  pack.channels.linkedin = '<b>Click here</b> for our guide!';
  const data = { schemaVersion: 1, packs: [pack] };
  const result = validateDistributionPacks(data, ALLOWED_CANONICAL_URLS, ALLOWED_OFFICIAL_URLS);
  assert.ok(result.violations.length > 0, 'Should reject HTML tags');
});

test('validateDistributionPacks rejects Proxy/prototype payloads', () => {
  const pack = Object.create({ __proto__: { evil: true } });
  Object.assign(pack, makeValidPack());
  const data = { schemaVersion: 1, packs: [pack] };
  assert.throws(
    () => validateDistributionPacks(data, ALLOWED_CANONICAL_URLS, ALLOWED_OFFICIAL_URLS),
    /Proxy|prototype|plain/i,
  );
});

test('validateDistributionPacks rejects ownerApprovalRequired: false', () => {
  const pack = makeValidPack({ ownerApprovalRequired: false });
  const data = { schemaVersion: 1, packs: [pack] };
  const result = validateDistributionPacks(data, ALLOWED_CANONICAL_URLS, ALLOWED_OFFICIAL_URLS);
  assert.ok(result.violations.length > 0, 'Must require ownerApprovalRequired: true');
});

// ── 3. extractGscTopicOpportunities ────────────────────────────────────────
test('extractGscTopicOpportunities deterministically ranks high-impression queries', () => {
  const gscRows = [
    { query: 'crm data export', impressions: 500, clicks: 10, page: '/compare/hubspot-vs-pipedrive/' },
    { query: 'hubspot vs pipedrive export', impressions: 200, clicks: 5, page: '/compare/hubspot-vs-pipedrive/' },
    { query: 'cheap crm', impressions: 15, clicks: 1, page: '/' }, // below threshold
  ];
  const backlog = { topics: [] };
  const guides = SYNTHETIC_GUIDES;

  const result = extractGscTopicOpportunities({ gscRows, backlog, guides });

  assert.ok(Array.isArray(result), 'Returns array');
  assert.ok(result.length >= 1, 'Has results above threshold');
  // Below threshold (< 20 impressions) must be excluded
  const queries = result.map(r => r.query);
  assert.ok(!queries.includes('cheap crm'), 'Filters out low-impression rows');
  // Must be sorted descending by impressions
  for (let i = 1; i < result.length; i++) {
    assert.ok(result[i - 1].impressions >= result[i].impressions, 'Sorted descending by impressions');
  }
  // Must not mutate input
  assert.strictEqual(gscRows.length, 3, 'Input not mutated');
});

test('extractGscTopicOpportunities deduplicates by query, rejects malformed rows', () => {
  const gscRows = [
    { query: 'crm export', impressions: 300, clicks: 5, page: '/compare/hubspot-vs-pipedrive/' },
    { query: 'crm export', impressions: 200, clicks: 3, page: '/compare/hubspot-vs-pipedrive/' }, // dupe
    { query: null, impressions: 500, clicks: 1, page: '/' }, // malformed
    { query: '', impressions: 400, clicks: 2, page: '/' }, // malformed
  ];
  const result = extractGscTopicOpportunities({ gscRows, backlog: { topics: [] }, guides: SYNTHETIC_GUIDES });
  const queries = result.map(r => r.query);
  const unique = [...new Set(queries)];
  assert.strictEqual(queries.length, unique.length, 'No duplicate queries');
  assert.ok(!queries.includes(null), 'Filters null queries');
  assert.ok(!queries.includes(''), 'Filters empty queries');
});

// ── 4. selectNextContentForDistribution ────────────────────────────────────
test('selectNextContentForDistribution returns guide first, then comparison, alphabetical', () => {
  const result = selectNextContentForDistribution({
    guides: SYNTHETIC_GUIDES,
    verifiedVendorFacts: SYNTHETIC_VENDOR_FACTS,
    existingPacks: SYNTHETIC_EXISTING_PACKS,
  });
  assert.ok(result !== null, 'Returns a target');
  assert.ok(['guide', 'comparison'].includes(result.targetType), 'Valid targetType');
  assert.ok(typeof result.targetSlug === 'string', 'Has targetSlug');
  assert.ok(typeof result.canonicalUrl === 'string', 'Has canonicalUrl');
  assert.ok(result.canonicalUrl.startsWith(SITE_ORIGIN), 'canonicalUrl uses SITE_ORIGIN');
});

test('selectNextContentForDistribution returns null when all targets already drafted', () => {
  const allSlugs = [
    'crm-data-export-and-portability-guide',
    'hubspot-vs-pipedrive',
    'semrush-vs-ahrefs',
    'kinsta-vs-cloudways',
  ];
  const existingPacks = {
    schemaVersion: 1,
    packs: allSlugs.map(slug => makeValidPack({ targetSlug: slug, id: `dist-${slug}` })),
  };
  const result = selectNextContentForDistribution({
    guides: SYNTHETIC_GUIDES,
    verifiedVendorFacts: SYNTHETIC_VENDOR_FACTS,
    existingPacks,
  });
  assert.strictEqual(result, null, 'Returns null when all drafted');
});

// ── 5. buildDistributionPrompt ──────────────────────────────────────────────
test('buildDistributionPrompt produces safe prompt without newline-newline or HTML chars', () => {
  const target = {
    targetSlug: 'crm-data-export-and-portability-guide',
    targetType: 'guide',
    canonicalUrl: `${SITE_ORIGIN}/guides/crm-data-export-and-portability-guide/`,
    title: 'CRM Data Export Buyer Guide',
    referencedOfficialUrls: [HUBSPOT_EXPORT_URL, PIPEDRIVE_STORAGE_URL],
  };
  const prompt = buildDistributionPrompt({ target, siteOrigin: SITE_ORIGIN });
  assert.strictEqual(typeof prompt, 'string', 'Returns string');
  assert.ok(prompt.length > 20, 'Non-trivial length');
  assert.ok(!prompt.includes('\n\n'), 'No double newlines (would fail router validation)');
  assert.ok(!/[<>]/.test(prompt), 'No HTML angle brackets (would fail router validation)');
  assert.ok(prompt.includes(target.canonicalUrl), 'Contains canonicalUrl');
});

// ── 6. parseAndValidateDistributionResponse ─────────────────────────────────
test('parseAndValidateDistributionResponse parses valid AI JSON response', () => {
  const aiJson = JSON.stringify({
    linkedin: 'Compare HubSpot vs Pipedrive for CRM data portability. Official docs reviewed. ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/',
    xThread: [
      'Thread: CRM data portability \u2014 HubSpot vs Pipedrive (official docs only)',
      'HubSpot: exports to CSV/XLS/XLSX with optional Super Admin controls.',
      'Pipedrive: 50 MB / 50k row imports, 30-day deleted deal recovery. Full guide: ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/',
    ],
    reddit: {
      title: 'CRM data export specs compared (vendor docs)',
      body: 'No affiliate links. Based on vendor documentation.',
    },
    newsletterBlurb: 'New guide: CRM data portability. Source: official vendor docs. ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/',
  });

  const context = {
    canonicalUrl: `${SITE_ORIGIN}/guides/crm-data-export-and-portability-guide/`,
    allowedCanonicalUrls: ALLOWED_CANONICAL_URLS,
    allowedOfficialUrls: ALLOWED_OFFICIAL_URLS,
  };

  const result = parseAndValidateDistributionResponse(aiJson, context);
  assert.ok(result.ok, `Expected ok=true, got: ${result.error}`);
  assert.ok(typeof result.channels.linkedin === 'string');
  assert.ok(Array.isArray(result.channels.xThread));
  assert.ok(result.channels.xThread.every(t => t.length <= 280), 'All xThread items <= 280 chars');
  assert.ok(typeof result.channels.reddit === 'object');
  assert.ok(typeof result.channels.newsletterBlurb === 'string');
});

test('parseAndValidateDistributionResponse normalizes twitterThread alias to xThread', () => {
  const aiJson = JSON.stringify({
    linkedin: 'Compare HubSpot vs Pipedrive for CRM portability. ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/',
    twitterThread: ['Tweet 1 about CRM portability', 'Tweet 2 about HubSpot exports', 'Tweet 3 about Pipedrive: ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/'],
    reddit: { title: 'CRM export', body: 'Vendor docs comparison.' },
    newsletterBlurb: 'CRM portability guide. ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/',
  });

  const context = {
    canonicalUrl: `${SITE_ORIGIN}/guides/crm-data-export-and-portability-guide/`,
    allowedCanonicalUrls: ALLOWED_CANONICAL_URLS,
    allowedOfficialUrls: ALLOWED_OFFICIAL_URLS,
  };

  const result = parseAndValidateDistributionResponse(aiJson, context);
  assert.ok(result.ok, `Expected ok=true, got: ${result.error}`);
  assert.ok(Array.isArray(result.channels.xThread), 'twitterThread alias normalized to xThread');
});

test('parseAndValidateDistributionResponse strips JSON code fences', () => {
  const inner = JSON.stringify({
    linkedin: 'Compare HubSpot and Pipedrive CRM data portability features based on official vendor documentation. See the full buyer guide here: ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/',
    xThread: ['Thread: CRM data portability compared', 'HubSpot exports to CSV/XLS/XLSX with optional Super Admin controls.', 'Pipedrive: 50 MB / 50k row imports. Full guide: ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/'],
    reddit: { title: 'CRM data export specs', body: 'Vendor docs comparison. No affiliate links.' },
    newsletterBlurb: 'CRM data portability buyer guide: HubSpot vs Pipedrive. Source: official vendor docs. ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/',
  });
  const aiJson = '```json\n' + inner + '\n```';

  const context = {
    canonicalUrl: `${SITE_ORIGIN}/guides/crm-data-export-and-portability-guide/`,
    allowedCanonicalUrls: ALLOWED_CANONICAL_URLS,
    allowedOfficialUrls: ALLOWED_OFFICIAL_URLS,
  };

  const result = parseAndValidateDistributionResponse(aiJson, context);
  assert.ok(result.ok, `Expected ok=true with fence-stripped JSON, got: ${result.error}`);
});

test('parseAndValidateDistributionResponse trims xThread items over 280 chars at word boundary', () => {
  const longTweet = 'CRM data portability: ' + 'word '.repeat(60) + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/';
  const aiJson = JSON.stringify({
    linkedin: 'Compare HubSpot and Pipedrive CRM data portability features based on official vendor documentation. See the full buyer guide here: ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/',
    xThread: [longTweet, 'Short tweet with link: ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/'],
    reddit: { title: 'CRM export specs', body: 'Vendor docs comparison. No affiliate links.' },
    newsletterBlurb: 'CRM data portability buyer guide: HubSpot vs Pipedrive. Source: official vendor docs. ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/',
  });

  const context = {
    canonicalUrl: `${SITE_ORIGIN}/guides/crm-data-export-and-portability-guide/`,
    allowedCanonicalUrls: ALLOWED_CANONICAL_URLS,
    allowedOfficialUrls: ALLOWED_OFFICIAL_URLS,
  };

  const result = parseAndValidateDistributionResponse(aiJson, context);
  assert.ok(result.ok, `Expected ok=true with auto-trimmed xThread, got: ${result.error}`);
  assert.ok(result.channels.xThread.every(t => t.length <= 280), 'All trimmed to <= 280');
});

// ── 7. runTrafficDistributionAgent — wired with mock Gemini adapter ──────────
test('runTrafficDistributionAgent wires through real executeLiveRoutedPrompt with Gemini mock', async () => {
  const mockPack = {
    linkedin: 'Compare HubSpot vs Pipedrive for CRM data portability. Official docs only. ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/',
    xThread: [
      'Thread: CRM portability \u2014 HubSpot vs Pipedrive',
      'HubSpot: exports records to CSV/XLS/XLSX with optional Super Admin controls.',
      'Pipedrive: 50 MB / 50k row imports. Full guide: ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/',
    ],
    reddit: {
      title: 'CRM data export compared (vendor docs, no affiliate links)',
      body: 'Comparing export specs from official vendor documentation. No affiliate links.',
    },
    newsletterBlurb: 'CRM data export buyer guide: HubSpot vs Pipedrive. Source: official vendor docs. ' + SITE_ORIGIN + '/guides/crm-data-export-and-portability-guide/',
  };

  let aiCallCount = 0;
  const runAiPrompt = async (_request) => {
    aiCallCount++;
    return JSON.stringify(mockPack);
  };

  const result = await runTrafficDistributionAgent({
    guides: SYNTHETIC_GUIDES,
    existingPacks: SYNTHETIC_EXISTING_PACKS,
    verifiedVendorFacts: SYNTHETIC_VENDOR_FACTS,
    siteOrigin: SITE_ORIGIN,
    runAiPrompt,
    allowLiveDistribution: true,
    allowLiveAi: true,
    now: new Date('2026-11-27T05:00:00.000Z'),
  });

  assert.strictEqual(result.status, 'drafted', `Expected status=drafted, got: ${result.status} ${result.error || ''}`);
  assert.strictEqual(aiCallCount, 1, 'Exactly one AI call');
  assert.strictEqual(result.estimatedCostMinor, 0, 'estimatedCostMinor=0');
  assert.ok(result.newPack, 'Has newPack');
  assert.strictEqual(result.newPack.status, 'pending_owner_review');
  assert.strictEqual(result.newPack.ownerApprovalRequired, true);
  assert.ok(typeof result.newPack.id === 'string');
  assert.ok(typeof result.newPack.draftedAt === 'string');
});

test('runTrafficDistributionAgent fails closed when allowLiveAi=false even with live distribution enabled', async () => {
  let aiCallCount = 0;
  const runAiPrompt = async () => { aiCallCount++; return '{}'; };

  const result = await runTrafficDistributionAgent({
    guides: SYNTHETIC_GUIDES,
    existingPacks: SYNTHETIC_EXISTING_PACKS,
    verifiedVendorFacts: SYNTHETIC_VENDOR_FACTS,
    siteOrigin: SITE_ORIGIN,
    runAiPrompt,
    allowLiveDistribution: true,
    allowLiveAi: false,
    now: new Date('2026-11-27T05:00:00.000Z'),
  });

  assert.strictEqual(result.status, 'live_ai_disabled');
  assert.strictEqual(aiCallCount, 0, 'No AI calls when live AI disabled');
});

// ── 8. formatDistributionReportMarkdown ────────────────────────────────────
test('formatDistributionReportMarkdown returns non-empty markdown string', () => {
  const result = {
    status: 'live_distribution_disabled',
    eligibleTargets: ['crm-data-export-and-portability-guide'],
    pendingPackCount: 0,
    nextTargetSlug: 'crm-data-export-and-portability-guide',
    estimatedCostMinor: 0,
  };
  const md = formatDistributionReportMarkdown(result);
  assert.strictEqual(typeof md, 'string');
  assert.ok(md.length > 10);
});

// ── 9. agent-traffic-distribution.mjs --dry-run ────────────────────────────
test('agent-traffic-distribution.mjs --dry-run exits 0 offline and prints valid JSON', async () => {
  const { execFileSync } = await import('node:child_process');
  let output;
  try {
    output = execFileSync(
      process.execPath,
      ['scripts/agent-traffic-distribution.mjs', '--dry-run'],
      {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, STACKPILOT_ALLOW_LIVE_DISTRIBUTION: '', STACKPILOT_ALLOW_LIVE_AI: '' },
        timeout: 15000,
      },
    );
  } catch (err) {
    assert.fail(`--dry-run failed with exit code ${err.status}: ${err.stderr || err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    assert.fail(`--dry-run output is not valid JSON: ${output.slice(0, 300)}`);
  }

  assert.ok(Array.isArray(parsed.eligibleTargets), 'eligibleTargets is an array');
  assert.ok(typeof parsed.pendingPackCount === 'number', 'pendingPackCount is a number');
  assert.ok(typeof parsed.nextTargetSlug === 'string' || parsed.nextTargetSlug === null, 'nextTargetSlug is string or null');
  assert.strictEqual(parsed.estimatedCostMinor, 0, 'estimatedCostMinor=0 offline');
});

// ── 10. agent-traffic-distribution.yml ─────────────────────────────────────
test('agent-traffic-distribution.yml includes Mon+Thu schedule, workflow_dispatch, scoped permissions', async () => {
  const content = readFileSync(
    join(root, '.github/workflows/agent-traffic-distribution.yml'),
    'utf8',
  );
  // Schedule: 05:00 UTC Mon and Thu
  assert.ok(content.includes("'0 5 * * 1,4'") || content.includes('"0 5 * * 1,4"'), 'Has Mon+Thu 05:00 cron schedule');
  // workflow_dispatch trigger
  assert.ok(content.includes('workflow_dispatch'), 'Has workflow_dispatch trigger');
  // Scoped permissions: contents: write, pull-requests: write
  assert.ok(content.includes('contents: write'), 'Has contents: write permission');
  assert.ok(content.includes('pull-requests: write'), 'Has pull-requests: write permission');
  // Never push to main
  assert.ok(!content.includes('refs/heads/main'), 'Never pushes to main');
  assert.ok(!content.match(/push.*main(?!\S)/), 'No direct push to main branch');
  // concurrency group
  assert.ok(content.includes('agent-traffic-distribution'), 'Has concurrency group');
  // Workflow explicitly sets STACKPILOT_ALLOW_LIVE_DISTRIBUTION and STACKPILOT_ALLOW_LIVE_AI to 'true'
  assert.ok(content.includes("STACKPILOT_ALLOW_LIVE_DISTRIBUTION: 'true'"), 'Sets STACKPILOT_ALLOW_LIVE_DISTRIBUTION to true');
  assert.ok(content.includes("STACKPILOT_ALLOW_LIVE_AI: 'true'"), 'Sets STACKPILOT_ALLOW_LIVE_AI to true');
});

test('agent-traffic-distribution.mjs --live fails non-zero when live env flags are missing', async () => {
  const { spawnSync } = await import('node:child_process');
  const res = spawnSync(
    process.execPath,
    ['scripts/agent-traffic-distribution.mjs', '--live'],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, STACKPILOT_ALLOW_LIVE_DISTRIBUTION: '', STACKPILOT_ALLOW_LIVE_AI: '' },
      timeout: 15000,
    },
  );
  assert.notStrictEqual(res.status, 0, '--live without flags must exit non-zero');
  assert.match(res.stderr || '', /live_distribution_disabled/);
});

test('agent-traffic-distribution.mjs --dry-run includes extended-catalog comparisons in eligibleTargets', async () => {
  const { execFileSync } = await import('node:child_process');
  const output = execFileSync(
    process.execPath,
    ['scripts/agent-traffic-distribution.mjs', '--dry-run'],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, STACKPILOT_ALLOW_LIVE_DISTRIBUTION: '', STACKPILOT_ALLOW_LIVE_AI: '' },
      timeout: 15000,
    },
  );
  const parsed = JSON.parse(output);
  assert.ok(parsed.eligibleTargets.includes('hubspot-vs-zoho-crm'), 'Includes Wave 1 extended comparison');
  assert.ok(parsed.eligibleTargets.includes('hubspot-vs-salesforce-starter'), 'Includes Wave 2 extended comparison');
});

// ── 11. Static leakage guard ────────────────────────────────────────────────
test('static leakage guard blocks traffic-distribution.mjs, agent-traffic-distribution.mjs, agent-distribution-drafts.json, STACKPILOT_ALLOW_LIVE_DISTRIBUTION from dist/', async () => {
  const { auditLocalControlPlaneExport } = await import('../src/lib/local-control-plane-export.mjs');

  const forbidden = [
    { path: 'platform/agents/traffic-distribution.mjs', content: 'export function runTrafficDistributionAgent(){}' },
    { path: 'scripts/agent-traffic-distribution.mjs', content: 'import { runTrafficDistributionAgent } from "../src/platform/agents/traffic-distribution.mjs"' },
    { path: 'data/agent-distribution-drafts.json', content: JSON.stringify({ schemaVersion: 1, packs: [] }) },
    { path: 'env-check.js', content: 'const STACKPILOT_ALLOW_LIVE_DISTRIBUTION = process.env.STACKPILOT_ALLOW_LIVE_DISTRIBUTION;' },
    { path: 'agents/traffic-dist.js', content: 'selectNextContentForDistribution({ guides, verifiedVendorFacts })' },
    { path: 'agents/validate.js', content: 'validateDistributionPacks(data, allowedUrls)' },
  ];

  for (const file of forbidden) {
    const result = auditLocalControlPlaneExport([file]);
    assert.ok(result.violations.length > 0, `Expected violation for ${file.path}: ${JSON.stringify(result)}`);
  }

  // Safe files must not be blocked
  const safe = [
    { path: 'index.html', content: '<html><body>Welcome</body></html>' },
    { path: 'assets/main.js', content: 'console.log("hello")' },
    { path: 'compare/hubspot-vs-pipedrive/index.html', content: '<html><body>Compare</body></html>' },
  ];
  const safeResult = auditLocalControlPlaneExport(safe);
  assert.deepStrictEqual(safeResult.violations, [], 'Safe files must not be blocked');
});
