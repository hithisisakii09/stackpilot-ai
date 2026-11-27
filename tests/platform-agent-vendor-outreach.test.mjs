import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  validateOutreachDrafts,
  selectNextVendorForOutreach,
  runVendorOutreachAgent,
  formatOutreachReportMarkdown
} from '../src/platform/agents/vendor-outreach.mjs';
import { auditLocalControlPlaneExport } from '../src/lib/local-control-plane-export.mjs';
import { SITE_ORIGIN } from '../src/lib/site-origin.mjs';
import { routeAiRequest } from '../src/platform/ai/router.mjs';
import {
  createFreeTierModelRegistry,
  createGeminiFreeAdapter,
  createOpenAIFallbackAdapter
} from '../src/platform/ai/live-adapters.mjs';
import { executeLiveRoutedPrompt } from '../src/platform/ai/live-runner.mjs';

const NOW = '2026-11-27T04:30:00.000Z';
const TODAY = '2026-11-27';
const candidatesData = JSON.parse(readFileSync(new URL('../src/data/affiliate-programs.json', import.meta.url), 'utf8'));
const verifiedFacts = JSON.parse(readFileSync(new URL('../src/data/verified-vendor-facts.json', import.meta.url), 'utf8'));
const draftsData = JSON.parse(readFileSync(new URL('../src/data/agent-vendor-outreach-drafts.json', import.meta.url), 'utf8'));

const ALLOWED_SLUGS = ['hubspot', 'pipedrive', 'semrush', 'ahrefs', 'kinsta', 'cloudways'];
const ALLOWED_URLS = [
  'https://help.ahrefs.com/en/articles/9734884-what-is-the-difference-between-credit-based-plans-and-unlimited-credit-plans',
  'https://help.ahrefs.com/en/articles/3945807-about-shared-workspaces',
  'https://www.hubspot.com/partners/affiliates',
  'https://knowledge.hubspot.com/import-and-export/export-records'
];

function sampleDraft(overrides = {}) {
  return {
    id: 'outreach-ahrefs-2026-11-27',
    vendorSlug: 'ahrefs',
    outreachType: 'documentation_verification',
    status: 'pending_owner_review',
    draftedAt: TODAY,
    recipientTarget: 'Official Partner Program Portal / Vendor Partnerships Team',
    subject: 'ToolChoice Lab documentation verification and partnership inquiry for Ahrefs',
    body: `Hello Ahrefs Partnerships Team, we maintain an independent B2B software comparison directory at ${SITE_ORIGIN}/software/ahrefs/ and ${SITE_ORIGIN}/compare/semrush-vs-ahrefs/. Our directory summarizes your public pricing and credit documentation from https://help.ahrefs.com/en/articles/9734884-what-is-the-difference-between-credit-based-plans-and-unlimited-credit-plans for buyers evaluating SEO tools. We would appreciate confirming whether you offer an official partner program or documentation contact for keeping our facts accurate.`,
    referencedOfficialUrls: ['https://help.ahrefs.com/en/articles/9734884-what-is-the-difference-between-credit-based-plans-and-unlimited-credit-plans'],
    liveSiteUrls: [
      `${SITE_ORIGIN}/software/ahrefs/`,
      `${SITE_ORIGIN}/compare/semrush-vs-ahrefs/`
    ],
    ownerApprovalRequired: true,
    ...overrides
  };
}

test('default runVendorOutreachAgent fails closed with live_outreach_disabled and zero AI calls', async () => {
  let aiCalls = 0;
  const res = await runVendorOutreachAgent({
    candidates: candidatesData,
    existingDrafts: { schemaVersion: 1, drafts: [] },
    verifiedVendorFacts: verifiedFacts,
    siteOrigin: SITE_ORIGIN,
    runAiPrompt: async () => { aiCalls++; throw new Error('Must not call AI'); },
    allowLiveOutreach: false,
    allowLiveAi: false,
    now: NOW
  });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'live_outreach_disabled');
  assert.equal(res.estimatedCostMinor, 0);
  assert.equal(aiCalls, 0);
});

test('validateOutreachDrafts accepts valid pending_owner_review drafts and rejects unsafe states, URLs, emails, HTML, and Proxies', () => {
  const valid = validateOutreachDrafts(
    { schemaVersion: 1, drafts: [sampleDraft()] },
    ALLOWED_SLUGS,
    ALLOWED_URLS,
    { today: TODAY }
  );
  assert.equal(Object.isFrozen(valid), true);
  assert.equal(valid.drafts.length, 1);

  for (const badStatus of ['sent', 'approved', 'active']) {
    assert.throws(
      () => validateOutreachDrafts({ schemaVersion: 1, drafts: [sampleDraft({ status: badStatus })] }, ALLOWED_SLUGS, ALLOWED_URLS, { today: TODAY }),
      /pending_owner_review|status/i
    );
  }

  assert.throws(
    () => validateOutreachDrafts({ schemaVersion: 1, drafts: [sampleDraft({ referencedOfficialUrls: ['https://invented.example/partners'] })] }, ALLOWED_SLUGS, ALLOWED_URLS, { today: TODAY }),
    /allowlist|official|URL/i
  );

  assert.throws(
    () => validateOutreachDrafts({ schemaVersion: 1, drafts: [sampleDraft({ referencedOfficialUrls: ['https://ahrefs.com/pricing?utm_source=test'] })] }, ALLOWED_SLUGS, ALLOWED_URLS, { today: TODAY }),
    /tracking|allowlist|URL/i
  );

  assert.throws(
    () => validateOutreachDrafts({ schemaVersion: 1, drafts: [sampleDraft({ recipientTarget: 'partners@ahrefs.com' })] }, ALLOWED_SLUGS, ALLOWED_URLS, { today: TODAY }),
    /email/i
  );

  assert.throws(
    () => validateOutreachDrafts({ schemaVersion: 1, drafts: [sampleDraft({ body: sampleDraft().body + ' Contact john@ahrefs.com for details.' })] }, ALLOWED_SLUGS, ALLOWED_URLS, { today: TODAY }),
    /email/i
  );

  assert.throws(
    () => validateOutreachDrafts({ schemaVersion: 1, drafts: [sampleDraft({ body: '<script>alert(1)</script> ' + sampleDraft().body })] }, ALLOWED_SLUGS, ALLOWED_URLS, { today: TODAY }),
    /HTML/i
  );

  assert.throws(
    () => validateOutreachDrafts({ schemaVersion: 1, drafts: [sampleDraft({ ownerApprovalRequired: false })] }, ALLOWED_SLUGS, ALLOWED_URLS, { today: TODAY }),
    /ownerApprovalRequired/i
  );

  assert.throws(
    () => validateOutreachDrafts(new Proxy({ schemaVersion: 1, drafts: [] }, {}), ALLOWED_SLUGS, ALLOWED_URLS, { today: TODAY }),
    /Invalid/
  );
});

test('runVendorOutreachAgent wires cleanly through real executeLiveRoutedPrompt, routeAiRequest, and Gemini adapter with mock fetchImpl', async () => {
  const draft = sampleDraft();
  const capturedBodies = [];
  const mockFetch = async (url, init) => {
    assert.match(String(url), /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.5-flash-lite:generateContent$/);
    capturedBodies.push(JSON.parse(init.body));
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          candidates: [
            {
              finishReason: 'STOP',
              content: {
                parts: [
                  {
                    text: '```json\n' + JSON.stringify({
                      emailSubject: draft.subject,
                      emailBody: draft.body,
                      recipientTarget: draft.recipientTarget,
                      urls: draft.referencedOfficialUrls
                    }) + '\n```'
                  }
                ]
              }
            }
          ],
          usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 220 }
        });
      }
    };
  };

  const adapters = {
    gemini: createGeminiFreeAdapter({ apiKey: 'test-gemini-key-123456', fetchImpl: mockFetch }),
    openai: createOpenAIFallbackAdapter({ apiKey: '', fetchImpl: mockFetch })
  };
  const registry = createFreeTierModelRegistry();

  const next = selectNextVendorForOutreach({ candidates: candidatesData, existingDrafts: { schemaVersion: 1, drafts: [] } });
  assert.equal(next.productId, 'ahrefs');

  const res = await runVendorOutreachAgent({
    candidates: candidatesData,
    existingDrafts: { schemaVersion: 1, drafts: [] },
    verifiedVendorFacts: verifiedFacts,
    siteOrigin: SITE_ORIGIN,
    allowLiveOutreach: true,
    allowLiveAi: true,
    now: NOW,
    runAiPrompt: (request) => executeLiveRoutedPrompt({
      router: { routeAiRequest },
      adapters,
      registry,
      request: {
        taskClass: request.taskClass,
        prompt: request.prompt,
        systemPrompt: request.systemPrompt,
        requestedTokens: request.requestedTokens,
        maxOutputTokens: Math.max(Number(request.maxOutputTokens) || 0, 1536)
      },
      allowLiveNetwork: true,
      env: { STACKPILOT_ALLOW_LIVE_AI: 'true' },
      now: NOW
    })
  });

  assert.equal(res.ok, true);
  assert.equal(res.status, 'draft_created');
  assert.equal(res.selectedModel, 'gemini-3-5-flash-lite');
  assert.equal(res.estimatedCostMinor, 0);
  assert.equal(capturedBodies.length, 1);
  assert.equal(capturedBodies[0].generationConfig.maxOutputTokens, 1536);
  assert.equal(res.updatedDrafts.drafts.length, 1);
  assert.equal(res.generatedDraft.status, 'pending_owner_review');
  assert.equal(res.generatedDraft.ownerApprovalRequired, true);

  const md = formatOutreachReportMarkdown(res);
  assert.match(md, /pending_owner_review/);
  assert.match(md, /ToolChoice Lab/);
});

test('agent-vendor-outreach.mjs --dry-run exits 0 offline and dynamically matches current drafts count', () => {
  const out = execFileSync(process.execPath, ['scripts/agent-vendor-outreach.mjs', '--dry-run'], {
    encoding: 'utf8',
    env: { ...process.env, STACKPILOT_ALLOW_LIVE_OUTREACH: 'false', STACKPILOT_ALLOW_LIVE_AI: 'false' }
  });
  const report = JSON.parse(out);
  const expectedPending = draftsData.drafts.filter(d => d.status === 'pending_owner_review').length;
  assert.equal(report.mode, 'dry-run');
  assert.equal(report.ok, true);
  assert.equal(report.totalVendors, candidatesData.length);
  assert.equal(report.pendingDraftCount, expectedPending);
  assert.equal(report.estimatedCostMinor, 0);
});

test('agent-vendor-outreach.yml includes schedule, workflow_dispatch, scoped permissions, and never pushes to main', () => {
  const wf = readFileSync(new URL('../.github/workflows/agent-vendor-outreach.yml', import.meta.url), 'utf8');
  assert.match(wf, /cron:\s*'30 4 \* \* 2'/);
  assert.match(wf, /workflow_dispatch:/);
  assert.match(wf, /contents:\s*write/);
  assert.match(wf, /pull-requests:\s*write/);
  assert.match(wf, /gh pr create/);
  assert.doesNotMatch(wf, /git push[^\n]*\bmain\b/);
});

test('static leakage guard blocks Phase 14 vendor outreach files and markers from dist/', () => {
  for (const path of ['vendor-outreach.mjs', 'agent-vendor-outreach.mjs', 'agent-vendor-outreach-drafts.json']) {
    const res = auditLocalControlPlaneExport([{ path, content: 'clean' }]);
    assert.ok(res.violations.length > 0, `Expected leakage violation for ${path}`);
  }
  const markerRes = auditLocalControlPlaneExport([{ path: 'index.html', content: 'STACKPILOT_ALLOW_LIVE_OUTREACH' }]);
  assert.ok(markerRes.violations.length > 0);
});
