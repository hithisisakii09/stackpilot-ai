import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAgentBuyerGuides } from '../src/lib/agent-buyer-guides.mjs';
import { syncPublicSitemap } from '../src/lib/sitemap-sync.mjs';
import {
  selectNextPendingTopic,
  runSeoContentBuilder,
  formatSeoBuilderReportMarkdown
} from '../src/platform/agents/seo-content-builder.mjs';
import { routeAiRequest, redactSecrets } from '../src/platform/ai/router.mjs';
import {
  createFreeTierModelRegistry,
  createGeminiFreeAdapter,
  createOpenAIFallbackAdapter
} from '../src/platform/ai/live-adapters.mjs';
import { executeLiveRoutedPrompt } from '../src/platform/ai/live-runner.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const liveMode = process.argv.includes('--live');
const writeMode = process.argv.includes('--write');
const reportIdx = process.argv.indexOf('--report-out');
const reportOut = reportIdx >= 0 ? process.argv[reportIdx + 1] : null;

const factsPath = join(root, 'src', 'data', 'verified-vendor-facts.json');
const guidesPath = join(root, 'src', 'data', 'agent-buyer-guides.json');
const backlogPath = join(root, 'src', 'data', 'seo-topic-backlog.json');

const verifiedVendorFacts = JSON.parse(readFileSync(factsPath, 'utf8'));
const existingGuides = JSON.parse(readFileSync(guidesPath, 'utf8'));
const backlog = JSON.parse(readFileSync(backlogPath, 'utf8'));
validateAgentBuyerGuides(existingGuides, verifiedVendorFacts);

const now = new Date().toISOString();
const pendingTopics = (backlog.topics ?? []).filter(t => t.status === 'pending').length;
const nextTopic = selectNextPendingTopic(backlog);

if (!liveMode) {
  process.stdout.write(JSON.stringify({
    mode: 'dry-run',
    ok: true,
    pendingTopics,
    publishedGuides: existingGuides.guides.length,
    nextTopicSlug: nextTopic?.slug ?? null,
    estimatedCostMinor: 0,
    timestamp: now
  }, null, 2) + '\n');
} else {
  const allowLiveSeo = process.env.STACKPILOT_ALLOW_LIVE_SEO === 'true';
  const allowLiveAi = process.env.STACKPILOT_ALLOW_LIVE_AI === 'true';

  const adapters = {
    gemini: createGeminiFreeAdapter({ apiKey: process.env.GEMINI_API_KEY ?? '' }),
    openai: createOpenAIFallbackAdapter({ apiKey: process.env.OPENAI_API_KEY ?? '' })
  };
  const registry = createFreeTierModelRegistry();

  const result = await runSeoContentBuilder({
    backlog,
    existingGuides,
    verifiedVendorFacts,
    allowLiveSeo,
    allowLiveAi,
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
        maxOutputTokens: Math.max(Number(request.maxOutputTokens) || 0, 3072)
      },
      allowLiveNetwork: allowLiveAi,
      env: process.env,
      now
    })
  });

  if (result.ok && result.status === 'guide_drafted' && writeMode) {
    writeFileSync(guidesPath, JSON.stringify(result.updatedGuides, null, 2) + '\n', 'utf8');
    writeFileSync(backlogPath, JSON.stringify(result.updatedBacklog, null, 2) + '\n', 'utf8');
    syncPublicSitemap(root);
  }

  const markdown = formatSeoBuilderReportMarkdown(result);
  if (reportOut) {
    writeFileSync(reportOut, markdown, 'utf8');
  }

  const sanitizedReason = result.reason ? redactSecrets(String(result.reason)) : null;

  process.stdout.write(JSON.stringify({
    mode: 'live',
    ok: result.ok,
    status: result.status,
    reason: sanitizedReason,
    generatedSlug: result.generatedGuide?.slug ?? null,
    estimatedCostMinor: result.estimatedCostMinor,
    executedAt: result.executedAt
  }, null, 2) + '\n');

  if (!result.ok) {
    process.stderr.write(`[agent-seo-builder] failed: ${sanitizedReason ?? 'unknown_error'}\n`);
    process.exitCode = 1;
  }
}
