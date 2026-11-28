import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  selectNextTargetForShort,
  buildShortsScriptPrompt,
  validateShortsStoryboard,
  renderSlideHtml,
  exchangeYouTubeRefreshToken,
  uploadYouTubeShort,
  validateShortsUploads,
  runYouTubeShortsAgent,
} from '../src/platform/agents/youtube-shorts.mjs';

import { routeAiRequest } from '../src/platform/ai/router.mjs';
import { createFreeTierModelRegistry, createGeminiFreeAdapter } from '../src/platform/ai/live-adapters.mjs';
import { executeLiveRoutedPrompt } from '../src/platform/ai/live-runner.mjs';
import { auditLocalControlPlaneExport } from '../src/lib/local-control-plane-export.mjs';
import { SITE_ORIGIN } from '../src/lib/site-origin.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const CANONICAL_GUIDE_URL = `${SITE_ORIGIN}/guides/crm-data-export-and-portability-guide/`;

const SYNTHETIC_GUIDES = {
  schemaVersion: 1,
  guides: [
    {
      slug: 'crm-data-export-and-portability-guide',
      title: 'CRM Data Export and Portability Buyer Guide: HubSpot vs Pipedrive',
      publishedAt: '2026-11-27',
      summary: 'Comparing CRM export formats and limits using official vendor docs.',
      citations: [
        { label: 'HubSpot Export Docs', url: 'https://knowledge.hubspot.com/import-and-export/export-records' },
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
        first: { summary: 'HubSpot CSV/XLSX export', sourceLabel: 'HubSpot', sourceUrl: 'https://knowledge.hubspot.com/import-and-export/export-records' },
        second: { summary: 'Pipedrive 50MB import/export', sourceLabel: 'Pipedrive', sourceUrl: 'https://support.pipedrive.com/en/article/how-can-i-free-up-space' },
      },
    ],
  },
};

const SYNTHETIC_EXTENDED_CATALOG = {
  schemaVersion: 1,
  comparisons: [
    {
      slug: 'hubspot-vs-zoho-crm',
      title: 'HubSpot vs Zoho CRM',
      rows: [
        {
          dimension: 'Editions',
          first: { summary: 'HubSpot tiers', sourceLabel: 'HubSpot', sourceUrl: 'https://legal.hubspot.com/hubspot-product-and-services-catalog' },
          second: { summary: 'Zoho editions', sourceLabel: 'Zoho', sourceUrl: 'https://www.zoho.com/crm/complete-feature-list.html' },
        },
      ],
    },
  ],
};

function makeValidStoryboard(overrides = {}) {
  return {
    title: 'HubSpot vs Pipedrive CRM Data Export Compared',
    description: `Compare CRM data export formats, row limits, and admin controls from official vendor docs. Read the full breakdown at ${CANONICAL_GUIDE_URL}`,
    hashtags: ['#SaaS', '#CRM', '#Shorts'],
    slides: [
      { kicker: '01 / OVERVIEW', headline: 'CRM Data Export Compared', body: 'Evaluating HubSpot and Pipedrive export formats and admin controls using official docs.' },
      { kicker: '02 / HUBSPOT', headline: 'CSV, XLS & XLSX Exports', body: 'Supports exporting records, lists, and property history with Super Admin approval gates.' },
      { kicker: '03 / PIPEDRIVE', headline: '50 MB Import & Recovery', body: 'Supports CSV/XLS/XLSX spreadsheets up to 50 MB or 50,000 rows with 30-day deal recovery.' },
      { kicker: '04 / FULL GUIDE', headline: 'Verify Specs Before Migrating', body: 'Check file limits, association exports, and backup rules before switching CRMs.' },
    ],
    ...overrides,
  };
}

// ── 1. Fail-closed default behavior ─────────────────────────────────────────

test('runYouTubeShortsAgent fails closed with live_youtube_disabled and zero AI/fetch calls', async () => {
  let aiCalled = 0;
  let fetchCalled = 0;

  const result = await runYouTubeShortsAgent({
    guides: SYNTHETIC_GUIDES,
    verifiedVendorFacts: SYNTHETIC_VENDOR_FACTS,
    extendedCatalog: SYNTHETIC_EXTENDED_CATALOG,
    existingUploads: { schemaVersion: 1, uploads: [] },
    siteOrigin: SITE_ORIGIN,
    runAiPrompt: async () => { aiCalled++; return '{}'; },
    fetchImpl: async () => { fetchCalled++; throw new Error('should not fetch'); },
  });

  assert.equal(result.status, 'live_youtube_disabled');
  assert.equal(result.estimatedCostMinor, 0);
  assert.equal(aiCalled, 0);
  assert.equal(fetchCalled, 0);
});

test('scripts/agent-youtube-shorts.mjs --live exits non-zero when live env flags are absent', () => {
  const cleanEnv = { ...process.env };
  delete cleanEnv.STACKPILOT_ALLOW_LIVE_YOUTUBE;
  delete cleanEnv.STACKPILOT_ALLOW_LIVE_AI;

  let exitCode = 0;
  let stderr = '';
  try {
    execFileSync(process.execPath, ['scripts/agent-youtube-shorts.mjs', '--live'], {
      cwd: root,
      env: cleanEnv,
      encoding: 'utf8',
    });
  } catch (err) {
    exitCode = err.status ?? 1;
    stderr = (err.stderr || '') + (err.stdout || '');
  }

  assert.notEqual(exitCode, 0);
  assert.match(stderr, /live_youtube_disabled/);
});

// ── 2. Target selection across guides + 16 comparisons ──────────────────────

test('selectNextTargetForShort collects guides and both legacy + extended comparisons', () => {
  const realGuides = JSON.parse(readFileSync(join(root, 'src/data/agent-buyer-guides.json'), 'utf8'));
  const realFacts = JSON.parse(readFileSync(join(root, 'src/data/verified-vendor-facts.json'), 'utf8'));
  const realExtended = JSON.parse(readFileSync(join(root, 'src/data/extended-catalog.json'), 'utf8'));

  const first = selectNextTargetForShort({
    guides: realGuides,
    comparisons: { verifiedVendorFacts: realFacts, extendedCatalog: realExtended },
    existingUploads: { schemaVersion: 1, uploads: [] },
  });
  assert.ok(first);
  assert.equal(first.targetType, 'guide');

  const pickedExt = selectNextTargetForShort({
    guides: realGuides,
    comparisons: { verifiedVendorFacts: realFacts, extendedCatalog: realExtended },
    existingUploads: { schemaVersion: 1, uploads: [] },
    preferredSlug: 'hubspot-vs-salesforce-starter',
  });
  assert.ok(pickedExt);
  assert.equal(pickedExt.targetSlug, 'hubspot-vs-salesforce-starter');
  assert.equal(pickedExt.targetType, 'comparison');
  assert.equal(pickedExt.canonicalUrl, `${SITE_ORIGIN}/compare/hubspot-vs-salesforce-starter/`);
});

// ── 3. Storyboard validation & HTML escaping ────────────────────────────────

test('validateShortsStoryboard enforces 4 slides, #Shorts title <= 100 chars, canonical URL, and clean hashtags', () => {
  const res = validateShortsStoryboard(makeValidStoryboard(), CANONICAL_GUIDE_URL);
  assert.equal(res.ok, true);
  assert.match(res.storyboard.title, /#Shorts$/);
  assert.ok(res.storyboard.title.length <= 100);
  assert.equal(res.storyboard.slides.length, 4);
});

test('validateShortsStoryboard rejects raw HTML, affiliate/UTM params, and Proxy payloads', () => {
  const htmlRes = validateShortsStoryboard(
    makeValidStoryboard({ title: 'CRM <script>alert(1)</script> Guide' }),
    CANONICAL_GUIDE_URL,
  );
  assert.equal(htmlRes.ok, false);

  const utmRes = validateShortsStoryboard(
    makeValidStoryboard({
      description: `Compare CRM data export formats at ${CANONICAL_GUIDE_URL}?utm_source=yt&ref=abc123 for full official docs.`,
    }),
    CANONICAL_GUIDE_URL,
  );
  assert.equal(utmRes.ok, false);

  const proxyPayload = new Proxy(makeValidStoryboard(), {});
  assert.throws(() => validateShortsStoryboard(proxyPayload, CANONICAL_GUIDE_URL), /plain object|Proxy/i);
});

test('renderSlideHtml escapes HTML injection and renders 1080x1920 Executive Slate layout', () => {
  const html = renderSlideHtml({
    slide: { kicker: '01 <script>', headline: 'Test & "Quote"', body: 'Body <img src=x onerror=alert(1)>' },
    slideIndex: 0,
    totalSlides: 4,
    brandName: 'StackPilot AI',
    siteHost: 'stackpilot-ai.hithisisakii09.workers.dev',
  });
  assert.ok(html.includes('#0F172A'));
  assert.ok(html.includes('#34D399'));
  assert.ok(html.includes('1080px'));
  assert.ok(html.includes('1920px'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img '));
  assert.ok(html.includes('&lt;script&gt;'));
});

// ── 4. OAuth & YouTube Data API v3 Resumable Uploader + SSRF + Scrubbing ─────

test('exchangeYouTubeRefreshToken and uploadYouTubeShort enforce SSRF allowlist and scrub secrets', async () => {
  const calls = [];
  const mockFetch = async (url, init) => {
    calls.push({ url, method: init?.method, headers: init?.headers });
    if (url === 'https://oauth2.googleapis.com/token') {
      return new Response(JSON.stringify({ access_token: 'ya29.mock-access-token-secret', expires_in: 3600 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (init?.method === 'POST' && url.startsWith('https://www.googleapis.com/upload/youtube/v3/videos')) {
      return new Response('', {
        status: 200,
        headers: { Location: 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=abc123' },
      });
    }
    if (init?.method === 'PUT' && url === 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=abc123') {
      return new Response(JSON.stringify({ id: 'dQw4w9WgXcQ' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const token = await exchangeYouTubeRefreshToken({
    clientId: 'client-id-secret-123',
    clientSecret: 'client-secret-xyz-999',
    refreshToken: '1//0g-refresh-token-secret',
    fetchImpl: mockFetch,
  });
  assert.equal(token.accessToken, 'ya29.mock-access-token-secret');

  const uploaded = await uploadYouTubeShort({
    accessToken: token.accessToken,
    videoBuffer: Buffer.from('fake-mp4-bytes'),
    metadata: {
      title: 'CRM Export #Shorts',
      description: `Read more at ${CANONICAL_GUIDE_URL}`,
      hashtags: ['#SaaS', '#CRM', '#Shorts'],
    },
    privacyStatus: 'private',
    fetchImpl: mockFetch,
  });

  assert.equal(uploaded.videoId, 'dQw4w9WgXcQ');
  assert.equal(uploaded.shortsUrl, 'https://youtube.com/shorts/dQw4w9WgXcQ');
  assert.equal(uploaded.privacyStatus, 'private');
  assert.equal(calls.length, 3);

  // SSRF check: reject non-www.googleapis.com Location header
  await assert.rejects(
    () => uploadYouTubeShort({
      accessToken: 'ya29.mock-access-token-secret',
      videoBuffer: Buffer.from('fake-mp4-bytes'),
      metadata: { title: 'Test #Shorts', description: CANONICAL_GUIDE_URL, hashtags: ['#Shorts'] },
      privacyStatus: 'private',
      fetchImpl: async () => new Response('', { status: 200, headers: { Location: 'https://evil.example.com/upload' } }),
    }),
    /allowlisted|googleapis\.com/i,
  );

  // Secret scrubbing check on token exchange error
  await assert.rejects(
    async () => {
      await exchangeYouTubeRefreshToken({
        clientId: 'my-client-id-999',
        clientSecret: 'my-super-secret-value',
        refreshToken: '1//my-refresh-token-value',
        fetchImpl: async () => new Response('invalid_grant for my-super-secret-value and 1//my-refresh-token-value', { status: 400 }),
      });
    },
    (err) => {
      assert.ok(!err.message.includes('my-super-secret-value'));
      assert.ok(!err.message.includes('1//my-refresh-token-value'));
      return true;
    },
  );
});

// ── 5. Integration-seam test through REAL executeLiveRoutedPrompt + routeAiRequest ──

test('integration seam: storyboard prompt executes through real executeLiveRoutedPrompt + routeAiRequest', async () => {
  const validJson = JSON.stringify(makeValidStoryboard());
  const mockFetch = async () => new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: validJson }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 180 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

  const adapters = { gemini: createGeminiFreeAdapter({ apiKey: 'AIzaTestFakeKeyForIntegrationSeamOnly12345', fetchImpl: mockFetch }) };
  const registry = createFreeTierModelRegistry();

  const target = selectNextTargetForShort({
    guides: SYNTHETIC_GUIDES,
    comparisons: { verifiedVendorFacts: SYNTHETIC_VENDOR_FACTS, extendedCatalog: SYNTHETIC_EXTENDED_CATALOG },
    existingUploads: { schemaVersion: 1, uploads: [] },
  });
  const prompt = buildShortsScriptPrompt({ target, siteOrigin: SITE_ORIGIN });

  const routed = await executeLiveRoutedPrompt({
    router: { routeAiRequest },
    adapters,
    registry,
    request: {
      taskClass: 'editorial_draft',
      prompt,
      systemPrompt: 'Respond ONLY with valid JSON.',
      requestedTokens: 600,
      maxOutputTokens: 1024,
    },
    allowLiveNetwork: true,
    now: '2026-11-28T06:00:00.000Z',
  });

  assert.equal(routed.ok, true);
  assert.equal(routed.estimatedCostMinor, 0);
  const validated = validateShortsStoryboard(JSON.parse(routed.text), target.canonicalUrl);
  assert.equal(validated.ok, true);
});

// ── 6. CLI --dry-run, workflow contract, upload history, & static leakage guard ──

test('scripts/agent-youtube-shorts.mjs --dry-run exits 0 offline and matches agent-youtube-shorts.json', () => {
  const out = execFileSync(process.execPath, ['scripts/agent-youtube-shorts.mjs', '--dry-run'], {
    cwd: root,
    encoding: 'utf8',
  });
  const parsed = JSON.parse(out);
  const store = JSON.parse(readFileSync(join(root, 'src/data/agent-youtube-shorts.json'), 'utf8'));

  assert.equal(parsed.status, 'dry_run');
  assert.equal(parsed.estimatedCostMinor, 0);
  assert.equal(parsed.uploadedCount, store.uploads.length);
  assert.equal(typeof parsed.youtubeCredentialsConfigured, 'boolean');
  assert.equal(typeof parsed.geminiKeyConfigured, 'boolean');
  assert.ok(parsed.eligibleCount >= 18);

  const validation = validateShortsUploads(store);
  assert.deepEqual(validation.violations, []);
});

test('.github/workflows/agent-youtube-shorts.yml uses node 22.23.4, unique GITHUB_RUN_ID branch, live flags, and never pushes to main', () => {
  const wf = readFileSync(join(root, '.github/workflows/agent-youtube-shorts.yml'), 'utf8');
  assert.match(wf, /node-version:\s*'22\.23\.4'/);
  assert.match(wf, /STACKPILOT_ALLOW_LIVE_YOUTUBE:\s*'true'/);
  assert.match(wf, /STACKPILOT_ALLOW_LIVE_AI:\s*'true'/);
  assert.match(wf, /agent\/youtube-shorts-\$\{?DATE\}?-\$\{?GITHUB_RUN_ID\}?/);
  assert.ok(!/git push[^\n]*\bmain\b/.test(wf));
});

test('auditLocalControlPlaneExport blocks youtube-shorts files and markers from dist/', () => {
  const cases = [
    { path: 'youtube-shorts.mjs', content: 'export const x = 1;' },
    { path: 'agent-youtube-shorts.mjs', content: 'export const x = 1;' },
    { path: 'agent-youtube-shorts.json', content: '{}' },
    { path: 'bundle.js', content: 'const flag = "STACKPILOT_ALLOW_LIVE_YOUTUBE";' },
  ];
  for (const c of cases) {
    const res = auditLocalControlPlaneExport([c]);
    assert.ok(res.violations.length > 0, `Expected leakage violation for ${c.path}`);
  }
});
