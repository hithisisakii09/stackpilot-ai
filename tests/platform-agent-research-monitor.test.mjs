import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  collectMonitoredVendorUrls,
  normalizeDocumentText,
  computeDocumentFingerprint,
  fetchVendorDocument,
  runResearchMonitor,
  formatMonitorReportMarkdown
} from '../src/platform/agents/research-monitor.mjs';
import { auditLocalControlPlaneExport } from '../src/lib/local-control-plane-export.mjs';

const NOW = '2026-11-27T02:30:00.000Z';
const verifiedFacts = JSON.parse(readFileSync(new URL('../src/data/verified-vendor-facts.json', import.meta.url), 'utf8'));

test('default runResearchMonitor fails closed with live_monitor_disabled and zero fetch/AI calls', async () => {
  let fetches = 0;
  let aiCalls = 0;
  const res = await runResearchMonitor({
    verifiedFacts,
    fingerprints: { schemaVersion: 1, updatedAt: null, urls: {} },
    fetchImpl: async () => { fetches++; throw new Error('Must not fetch'); },
    runAiPrompt: async () => { aiCalls++; throw new Error('Must not call AI'); },
    allowLiveMonitor: false,
    now: NOW
  });

  assert.equal(res.ok, false);
  assert.equal(res.reason, 'live_monitor_disabled');
  assert.equal(res.estimatedCostMinor, 0);
  assert.equal(fetches, 0);
  assert.equal(aiCalls, 0);
});

test('collectMonitoredVendorUrls extracts sorted deduplicated URLs and rejects SSRF/non-HTTPS/tracking URLs', () => {
  const entries = collectMonitoredVendorUrls(verifiedFacts);
  assert.equal(entries.length, 13);
  assert.deepEqual(
    entries.map(e => e.url),
    [...entries.map(e => e.url)].sort((a, b) => a.localeCompare(b, 'en'))
  );
  const cloudways = entries.find(e => e.url === 'https://www.cloudways.com/en/pricing.php');
  assert.ok(cloudways);
  assert.equal(cloudways.references.length, 2);

  const badHost = structuredClone(verifiedFacts);
  badHost['hubspot-vs-pipedrive'].rows[0].first.sourceUrl = 'https://evil.example/docs';
  assert.throws(() => collectMonitoredVendorUrls(badHost), /official|domain|allowlist/i);

  const badHttp = structuredClone(verifiedFacts);
  badHttp['hubspot-vs-pipedrive'].rows[0].first.sourceUrl = 'http://legal.hubspot.com/hubspot-product-and-services-catalog';
  assert.throws(() => collectMonitoredVendorUrls(badHttp), /HTTPS/i);

  const badUtm = structuredClone(verifiedFacts);
  badUtm['hubspot-vs-pipedrive'].rows[0].first.sourceUrl = 'https://legal.hubspot.com/hubspot-product-and-services-catalog?utm_source=test';
  assert.throws(() => collectMonitoredVendorUrls(badUtm), /tracking|referral/i);
});

test('normalizeDocumentText strips scripts/styles/tags cleanly and computeDocumentFingerprint is deterministic', () => {
  const html = `
    <!doctype html>
    <html>
      <head>
        <title>Pricing</title>
        <style>.x { color: red; }</style>
        <script>console.log("secret_js");</script>
      </head>
      <body>
        <!-- ignore comment -->
        <svg><path d="M0 0"/></svg>
        <noscript>Enable JS</noscript>
        <h1>Starter &amp; Pro Plans</h1>
        <p>Price is &lt;$20/mo&gt; &nbsp; per seat.</p>
      </body>
    </html>
  `;
  const text = normalizeDocumentText(html);
  assert.doesNotMatch(text, /secret_js|color: red|ignore comment|Enable JS|<svg|<script/i);
  assert.match(text, /Starter & Pro Plans/);
  assert.match(text, /Price is <\$20\/mo> per seat\./);

  const fp1 = computeDocumentFingerprint(html, 6000);
  const fp2 = computeDocumentFingerprint(html, 6000);
  assert.equal(fp1.contentHash, fp2.contentHash);
  assert.match(fp1.contentHash, /^[a-f0-9]{64}$/);
  assert.ok(fp1.excerpt.length <= 6000);
});

test('unchanged baseline triggers 0 AI calls; changed baseline triggers 1 AI extraction call and formats report', async () => {
  const entries = collectMonitoredVendorUrls(verifiedFacts);
  const baseHtml = '<html><body><p>Stable official pricing $20/mo</p></body></html>';
  const changedHtml = '<html><body><p>Updated official pricing $25/mo</p></body></html>';
  const baseHash = computeDocumentFingerprint(baseHtml).contentHash;

  const targetUrl = entries[0].url;
  const baselineUrls = {};
  for (const entry of entries) {
    baselineUrls[entry.url] = { contentHash: baseHash, lastCheckedAt: '2026-11-26T02:30:00.000Z' };
  }

  let aiCalls = 0;
  const res = await runResearchMonitor({
    verifiedFacts,
    fingerprints: { schemaVersion: 1, updatedAt: '2026-11-26T02:30:00.000Z', urls: baselineUrls },
    fetchImpl: async (url) => ({
      ok: true,
      status: 200,
      async text() {
        return url === targetUrl ? changedHtml : baseHtml;
      }
    }),
    runAiPrompt: async () => {
      aiCalls++;
      return {
        ok: true,
        provider: 'gemini',
        selectedModel: 'gemini-3-5-flash-lite',
        estimatedCostMinor: 0,
        text: JSON.stringify({
          meaningfulChange: true,
          summary: 'Starter seat price increased from $20/mo to $25/mo.',
          affectedRows: ['Seat & pricing structure'],
          recommendedAction: 'Update verified-vendor-facts.json after owner review.'
        })
      };
    },
    allowLiveMonitor: true,
    allowLiveAi: true,
    now: NOW
  });

  assert.equal(res.ok, true);
  assert.equal(aiCalls, 1);
  assert.equal(res.counts.unchanged, entries.length - 1);
  assert.equal(res.counts.changed, 1);
  assert.equal(res.estimatedCostMinor, 0);
  assert.equal(res.updatedFingerprints.urls[targetUrl].contentHash, computeDocumentFingerprint(changedHtml).contentHash);

  const md = formatMonitorReportMarkdown(res);
  assert.match(md, /Starter seat price increased from \$20\/mo to \$25\/mo\./);
  assert.match(md, /\*\*estimatedCostMinor:\*\*\s*0/);
});

test('fetch errors (403/404/timeout/oversize) are captured gracefully without overwriting prior good hashes', async () => {
  const entries = collectMonitoredVendorUrls(verifiedFacts);
  const priorHash = 'a'.repeat(64);
  const baselineUrls = {};
  for (const entry of entries) {
    baselineUrls[entry.url] = { contentHash: priorHash, lastCheckedAt: '2026-11-26T02:30:00.000Z' };
  }

  const u0 = entries[0].url;
  const u1 = entries[1].url;
  const u2 = entries[2].url;
  const u3 = entries[3].url;

  const oversizeOut = await fetchVendorDocument({
    url: u3,
    maxBytes: 20,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async text() { return 'x'.repeat(100); }
    })
  });
  assert.equal(oversizeOut.ok, false);
  assert.equal(oversizeOut.errorCode, 'response_too_large');

  const res = await runResearchMonitor({
    verifiedFacts,
    fingerprints: { schemaVersion: 1, updatedAt: '2026-11-26T02:30:00.000Z', urls: baselineUrls },
    fetchImpl: async (url) => {
      if (url === u0) return { ok: false, status: 403, async text() { return 'Forbidden'; } };
      if (url === u1) return { ok: false, status: 404, async text() { return 'Not Found'; } };
      if (url === u2) {
        const err = new Error('Timed out');
        err.name = 'TimeoutError';
        throw err;
      }
      if (url === u3) return { ok: true, status: 200, async text() { return 'x'.repeat(2_000_000); } };
      return { ok: true, status: 200, async text() { return '<html><body>Ok</body></html>'; } };
    },
    runAiPrompt: async () => ({ ok: true, estimatedCostMinor: 0, text: '{"meaningfulChange":false,"summary":"No diff","affectedRows":[],"recommendedAction":"None"}' }),
    allowLiveMonitor: true,
    allowLiveAi: true,
    now: NOW
  });

  assert.equal(res.ok, true);
  assert.equal(res.counts.fetchError, 4);
  assert.equal(res.updatedFingerprints.urls[u0].contentHash, priorHash);
  assert.equal(res.updatedFingerprints.urls[u1].contentHash, priorHash);
  assert.equal(res.updatedFingerprints.urls[u2].contentHash, priorHash);
  assert.equal(res.updatedFingerprints.urls[u3].contentHash, priorHash);
});

test('agent-research-monitor.mjs --dry-run runs offline and emits valid JSON with estimatedCostMinor 0', () => {
  const out = execFileSync(process.execPath, ['scripts/agent-research-monitor.mjs', '--dry-run'], {
    encoding: 'utf8',
    env: { ...process.env, STACKPILOT_ALLOW_LIVE_MONITOR: 'false', STACKPILOT_ALLOW_LIVE_AI: 'false' }
  });
  const report = JSON.parse(out);
  assert.equal(report.mode, 'dry-run');
  assert.equal(report.ok, true);
  assert.equal(report.monitoredUrlCount, 13);
  assert.equal(report.estimatedCostMinor, 0);
});

test('agent-research-monitor.yml uses schedule, workflow_dispatch, scoped permissions, and PR flow', () => {
  const wf = readFileSync(new URL('../.github/workflows/agent-research-monitor.yml', import.meta.url), 'utf8');
  assert.match(wf, /cron:\s*'30 2 \* \* \*'/);
  assert.match(wf, /workflow_dispatch:/);
  assert.match(wf, /contents:\s*write/);
  assert.match(wf, /pull-requests:\s*write/);
  assert.match(wf, /gh pr create/);
  assert.doesNotMatch(wf, /git push[^\n]*\bmain\b/);
});

test('static leakage guard blocks Phase 12 monitor files and markers from dist/', () => {
  for (const path of ['research-monitor.mjs', 'agent-research-monitor.mjs', 'vendor-doc-fingerprints.json']) {
    const res = auditLocalControlPlaneExport([{ path, content: 'clean' }]);
    assert.ok(res.violations.length > 0, `Expected leakage violation for ${path}`);
  }
  const markerRes = auditLocalControlPlaneExport([{ path: 'index.html', content: 'STACKPILOT_ALLOW_LIVE_MONITOR' }]);
  assert.ok(markerRes.violations.length > 0);
});
