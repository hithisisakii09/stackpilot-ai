import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { getVerifiedVendorFactsForProduct } from '../src/lib/verified-vendor-facts.mjs';
import { validateAgentBuyerGuides } from '../src/lib/agent-buyer-guides.mjs';
import { buildSitemapXml } from '../src/lib/sitemap-sync.mjs';
import { runSeoContentBuilder, parseAndValidateAiGuideResponse } from '../src/platform/agents/seo-content-builder.mjs';
import { auditLocalControlPlaneExport } from '../src/lib/local-control-plane-export.mjs';
import { routeAiRequest } from '../src/platform/ai/router.mjs';
import {
  createFreeTierModelRegistry,
  createGeminiFreeAdapter,
  createOpenAIFallbackAdapter
} from '../src/platform/ai/live-adapters.mjs';
import { executeLiveRoutedPrompt } from '../src/platform/ai/live-runner.mjs';

const NOW = '2026-11-27T03:30:00.000Z';
const verifiedFacts = JSON.parse(readFileSync(new URL('../src/data/verified-vendor-facts.json', import.meta.url), 'utf8'));
const backlogData = JSON.parse(readFileSync(new URL('../src/data/seo-topic-backlog.json', import.meta.url), 'utf8'));
const guidesData = JSON.parse(readFileSync(new URL('../src/data/agent-buyer-guides.json', import.meta.url), 'utf8'));

function sampleGuide(overrides = {}) {
  return {
    slug: 'crm-data-export-and-portability-guide',
    title: 'CRM Data Export and Portability Buyer Guide',
    metaDescription: 'Compare HubSpot and Pipedrive CSV/XLSX export capabilities, record limits, and portability checks.',
    publishedAt: '2026-11-27',
    summary: 'Grounded buyer verification guide comparing HubSpot and Pipedrive export and archive capabilities.',
    relatedComparisonSlugs: ['hubspot-vs-pipedrive'],
    sections: [
      {
        heading: 'Spreadsheet export formats and limits',
        body: 'HubSpot supports CSV, XLS, and XLSX exports for CRM records and lists. Pipedrive supports CSV, XLS, and XLSX import/export up to 50 MB or 50,000 rows.'
      },
      {
        heading: 'Admin governance and recovery',
        body: 'HubSpot provides optional Super Admin export approvals. Pipedrive offers 30-day deleted-deal recovery and archived lead limits.'
      }
    ],
    checklist: [
      'Confirm whether custom fields and associations export cleanly to CSV.',
      'Check Super Admin export approval controls before migration.',
      'Test restoring archived or deleted records in a sandbox.'
    ],
    citations: [
      {
        label: 'HubSpot Export Records Docs',
        url: 'https://knowledge.hubspot.com/import-and-export/export-records'
      },
      {
        label: 'Pipedrive Storage & Export Docs',
        url: 'https://support.pipedrive.com/en/article/how-can-i-free-up-space'
      }
    ],
    ...overrides
  };
}

test('default runSeoContentBuilder fails closed with live_seo_disabled and zero AI calls', async () => {
  let aiCalls = 0;
  const res = await runSeoContentBuilder({
    backlog: backlogData,
    existingGuides: guidesData,
    verifiedVendorFacts: verifiedFacts,
    runAiPrompt: async () => { aiCalls++; throw new Error('Must not call AI'); },
    allowLiveSeo: false,
    allowLiveAi: false,
    now: NOW
  });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'live_seo_disabled');
  assert.equal(res.estimatedCostMinor, 0);
  assert.equal(aiCalls, 0);
});

test('getVerifiedVendorFactsForProduct returns snapshots for all 6 vendors and /software/* pages render them safely', () => {
  for (const productId of ['hubspot', 'pipedrive', 'semrush', 'ahrefs', 'kinsta', 'cloudways']) {
    const snapshot = getVerifiedVendorFactsForProduct(productId, { today: '2026-11-27' });
    assert.equal(Object.isFrozen(snapshot), true);
    assert.ok(snapshot.rows.length >= 2);
    assert.ok(snapshot.comparisonSlug);

    const distFile = new URL(`../dist/software/${productId}/index.html`, import.meta.url);
    if (existsSync(distFile)) {
      const html = readFileSync(distFile, 'utf8');
      assert.match(html, /First-party vendor documentation snapshot \(checked 2026-11-27\)/);
      for (const row of snapshot.rows) {
        assert.ok(html.includes(`href="${row.entry.sourceUrl}"`), `${productId} missing ${row.entry.sourceUrl}`);
      }
      const section = html.split('id="verified-docs"')[1]?.split('</section>')[0] ?? '';
      assert.match(section, /rel="noopener noreferrer"/);
      assert.match(section, /target="_blank"/);
    }
  }
});

test('validateAgentBuyerGuides accepts grounded guides and rejects hallucinated URLs, HTML tags, collisions, and Proxies', () => {
  const valid = validateAgentBuyerGuides({ schemaVersion: 1, guides: [sampleGuide()] }, verifiedFacts, { today: '2026-11-27' });
  assert.equal(Object.isFrozen(valid), true);
  assert.equal(valid.guides.length, 1);

  assert.throws(
    () => validateAgentBuyerGuides({
      schemaVersion: 1,
      guides: [sampleGuide({ citations: [{ label: 'Invented', url: 'https://invented.example/pricing' }] })]
    }, verifiedFacts, { today: '2026-11-27' }),
    /citation|verified|allowlist/i
  );

  assert.throws(
    () => validateAgentBuyerGuides({
      schemaVersion: 1,
      guides: [sampleGuide({ citations: [{ label: 'Tracked', url: 'https://knowledge.hubspot.com/import-and-export/export-records?utm_source=x' }] })]
    }, verifiedFacts, { today: '2026-11-27' }),
    /citation|verified|tracking/i
  );

  assert.throws(
    () => validateAgentBuyerGuides({
      schemaVersion: 1,
      guides: [sampleGuide({ summary: '<script>alert(1)</script> bad html' })]
    }, verifiedFacts, { today: '2026-11-27' }),
    /HTML|unsafe/i
  );

  assert.throws(
    () => validateAgentBuyerGuides({
      schemaVersion: 1,
      guides: [sampleGuide({ slug: 'crm-migration-checklist' })]
    }, verifiedFacts, { today: '2026-11-27' }),
    /collide|static|reserved/i
  );

  assert.throws(
    () => validateAgentBuyerGuides({
      schemaVersion: 1,
      guides: [sampleGuide(), sampleGuide()]
    }, verifiedFacts, { today: '2026-11-27' }),
    /Duplicate/i
  );

  assert.throws(
    () => validateAgentBuyerGuides(new Proxy({ schemaVersion: 1, guides: [] }, {}), verifiedFacts),
    /Invalid/
  );
});

test('runSeoContentBuilder parses fenced AI JSON, appends guide, updates backlog, and syncs sitemap without private routes', async () => {
  const guide = sampleGuide();
  const res = await runSeoContentBuilder({
    backlog: backlogData,
    existingGuides: guidesData,
    verifiedVendorFacts: verifiedFacts,
    allowLiveSeo: true,
    allowLiveAi: true,
    now: NOW,
    runAiPrompt: async () => ({
      ok: true,
      provider: 'gemini',
      selectedModel: 'gemini-3-5-flash-lite',
      estimatedCostMinor: 0,
      text: '```json\n' + JSON.stringify({
        title: guide.title,
        metaDescription: guide.metaDescription,
        summary: guide.summary,
        sections: guide.sections,
        checklist: guide.checklist,
        citations: guide.citations
      }) + '\n```'
    })
  });

  assert.equal(res.ok, true);
  assert.equal(res.status, 'guide_drafted');
  assert.equal(res.estimatedCostMinor, 0);
  assert.equal(res.updatedGuides.guides.length, 1);
  assert.equal(res.updatedGuides.guides[0].slug, 'crm-data-export-and-portability-guide');
  assert.equal(res.updatedBacklog.topics[0].status, 'drafted');
  assert.equal(res.updatedBacklog.topics[0].generatedAt, '2026-11-27');

  const xml = buildSitemapXml(res.updatedGuides);
  assert.match(xml, /https:\/\/inspiring-chaja-cfb85f\.netlify\.app\/guides\/crm-data-export-and-portability-guide\//);
  assert.doesNotMatch(xml, /private-uat-worksheet|preview-build|\/research\//);
});

test('agent-seo-builder.mjs --dry-run runs offline and reports 6 pending topics with estimatedCostMinor 0', () => {
  const out = execFileSync(process.execPath, ['scripts/agent-seo-builder.mjs', '--dry-run'], {
    encoding: 'utf8',
    env: { ...process.env, STACKPILOT_ALLOW_LIVE_SEO: 'false', STACKPILOT_ALLOW_LIVE_AI: 'false' }
  });
  const report = JSON.parse(out);
  assert.equal(report.mode, 'dry-run');
  assert.equal(report.ok, true);
  assert.equal(report.pendingTopics, 6);
  assert.equal(report.publishedGuides, 0);
  assert.equal(report.nextTopicSlug, 'crm-data-export-and-portability-guide');
  assert.equal(report.estimatedCostMinor, 0);
});

test('agent-seo-builder.yml uses schedule, workflow_dispatch, scoped permissions, and PR flow', () => {
  const wf = readFileSync(new URL('../.github/workflows/agent-seo-builder.yml', import.meta.url), 'utf8');
  assert.match(wf, /cron:\s*'30 3 \* \* 1,3,5'/);
  assert.match(wf, /workflow_dispatch:/);
  assert.match(wf, /contents:\s*write/);
  assert.match(wf, /pull-requests:\s*write/);
  assert.match(wf, /gh pr create/);
  assert.doesNotMatch(wf, /git push[^\n]*\bmain\b/);
});

test('static leakage guard blocks Phase 13 SEO builder files and markers from dist/', () => {
  for (const path of ['seo-content-builder.mjs', 'agent-seo-builder.mjs', 'seo-topic-backlog.json']) {
    const res = auditLocalControlPlaneExport([{ path, content: 'clean' }]);
    assert.ok(res.violations.length > 0, `Expected leakage violation for ${path}`);
  }
  const markerRes = auditLocalControlPlaneExport([{ path: 'index.html', content: 'STACKPILOT_ALLOW_LIVE_SEO' }]);
  assert.ok(markerRes.violations.length > 0);
});

test('runSeoContentBuilder wires cleanly through real executeLiveRoutedPrompt, routeAiRequest, and Gemini adapter with mock fetchImpl', async () => {
  const guide = sampleGuide();
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
                    text: JSON.stringify({
                      title: guide.title,
                      metaDescription: guide.metaDescription,
                      summary: guide.summary,
                      sections: guide.sections,
                      checklist: guide.checklist,
                      citations: guide.citations
                    })
                  }
                ]
              }
            }
          ],
          usageMetadata: {
            promptTokenCount: 420,
            candidatesTokenCount: 310
          }
        });
      }
    };
  };

  const adapters = {
    gemini: createGeminiFreeAdapter({ apiKey: 'test-gemini-key-123456', fetchImpl: mockFetch }),
    openai: createOpenAIFallbackAdapter({ apiKey: '', fetchImpl: mockFetch })
  };
  const registry = createFreeTierModelRegistry();

  const res = await runSeoContentBuilder({
    backlog: backlogData,
    existingGuides: guidesData,
    verifiedVendorFacts: verifiedFacts,
    allowLiveSeo: true,
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
        maxOutputTokens: Math.max(Number(request.maxOutputTokens) || 0, 2048)
      },
      allowLiveNetwork: true,
      env: { STACKPILOT_ALLOW_LIVE_AI: 'true' },
      now: NOW
    })
  });

  assert.equal(res.ok, true);
  assert.equal(res.status, 'guide_drafted');
  assert.equal(res.selectedModel, 'gemini-3-5-flash-lite');
  assert.equal(res.estimatedCostMinor, 0);
  assert.equal(capturedBodies.length, 1);
  assert.equal(capturedBodies[0].generationConfig.maxOutputTokens, 2048);
  assert.equal(res.updatedGuides.guides.length, 1);
});

test('parseAndValidateAiGuideResponse normalizes string-array citations and shapes while keeping strict URL allowlist', () => {
  const topic = backlogData.topics[0];
  const guide = sampleGuide();
  const normalized = parseAndValidateAiGuideResponse(JSON.stringify({
    title: guide.title,
    metaDescription: 'Compare HubSpot and Pipedrive CSV and XLSX export capabilities, record limits, Super Admin export approvals, and archive portability checks before CRM migration planning.',
    summary: guide.summary,
    sections: [
      { title: guide.sections[0].heading, content: guide.sections[0].body },
      { title: guide.sections[1].heading, text: guide.sections[1].body }
    ],
    checklist: [
      { text: guide.checklist[0] },
      { item: guide.checklist[1] },
      guide.checklist[2]
    ],
    citations: [
      'https://knowledge.hubspot.com/import-and-export/export-records',
      'https://knowledge.hubspot.com/import-and-export/export-records',
      { title: 'Pipedrive Storage & Export Docs', url: 'https://support.pipedrive.com/en/article/how-can-i-free-up-space' }
    ]
  }), topic, verifiedFacts, '2026-11-27');

  assert.ok(normalized.metaDescription.length <= 160);
  assert.ok(normalized.metaDescription.length >= 50);
  assert.equal(normalized.citations.length, 2);
  assert.deepEqual(normalized.citations[0], {
    label: 'HubSpot Export Records Docs',
    url: 'https://knowledge.hubspot.com/import-and-export/export-records'
  });
  assert.deepEqual(normalized.citations[1], {
    label: 'Pipedrive Storage & Export Docs',
    url: 'https://support.pipedrive.com/en/article/how-can-i-free-up-space'
  });

  const validated = validateAgentBuyerGuides({ schemaVersion: 1, guides: [normalized] }, verifiedFacts, { today: '2026-11-27' });
  assert.equal(validated.guides.length, 1);
});

test('parseAndValidateAiGuideResponse rejects hallucinated string URLs in citations fail-closed', () => {
  const topic = backlogData.topics[0];
  const guide = sampleGuide();
  assert.throws(
    () => parseAndValidateAiGuideResponse(JSON.stringify({
      title: guide.title,
      metaDescription: guide.metaDescription,
      summary: guide.summary,
      sections: guide.sections,
      checklist: guide.checklist,
      citations: ['https://invented.example/pricing']
    }), topic, verifiedFacts, '2026-11-27'),
    /citation|verified|allowlist/i
  );
});
