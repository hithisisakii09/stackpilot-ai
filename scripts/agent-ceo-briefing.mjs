#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectCompanyOperationsSnapshot,
  validateCeoBriefings,
  runCeoBriefingAgent,
  formatCeoBriefingMarkdown,
} from '../src/platform/agents/ceo-briefing.mjs';
import { routeAiRequest, redactSecrets } from '../src/platform/ai/router.mjs';
import {
  createFreeTierModelRegistry,
  createGeminiFreeAdapter,
  createOpenAIFallbackAdapter,
} from '../src/platform/ai/live-adapters.mjs';
import { executeLiveRoutedPrompt } from '../src/platform/ai/live-runner.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const liveMode = process.argv.includes('--live');
const writeMode = process.argv.includes('--write');
const reportIdx = process.argv.indexOf('--report-out');
const reportOut = reportIdx >= 0 ? process.argv[reportIdx + 1] : null;

function readJson(relPath) {
  return JSON.parse(readFileSync(join(root, relPath), 'utf8'));
}

const fingerprints = readJson('src/data/vendor-doc-fingerprints.json');
const guides = readJson('src/data/agent-buyer-guides.json');
const backlog = readJson('src/data/seo-topic-backlog.json');
const verifiedVendorFacts = readJson('src/data/verified-vendor-facts.json');
const distributionDrafts = readJson('src/data/agent-distribution-drafts.json');
const outreachDrafts = readJson('src/data/agent-vendor-outreach-drafts.json');
const products = readJson('src/data/products.json');
const operatingPolicy = readJson('config/operating-policy.json');
const sitemapPath = join(root, 'public/sitemap.xml');
const sitemapXml = existsSync(sitemapPath) ? readFileSync(sitemapPath, 'utf8') : '';

const briefingsPath = join(root, 'src/data/agent-ceo-briefings.json');
const existingBriefings = readJson('src/data/agent-ceo-briefings.json');
validateCeoBriefings(existingBriefings);

const inputs = {
  fingerprints,
  guides,
  backlog,
  verifiedVendorFacts,
  sitemapXml,
  distributionDrafts,
  outreachDrafts,
  products,
  operatingPolicy,
};

const now = new Date().toISOString();

if (!liveMode) {
  const snapshot = collectCompanyOperationsSnapshot(inputs);
  process.stdout.write(JSON.stringify({
    mode: 'dry-run',
    ok: true,
    snapshot,
    existingBriefingCount: existingBriefings.briefings.length,
    estimatedCostMinor: 0,
    timestamp: now,
  }, null, 2) + '\n');
} else {
  const allowLiveBriefing = process.env.STACKPILOT_ALLOW_LIVE_CEO_BRIEF === 'true';
  const allowLiveAi = process.env.STACKPILOT_ALLOW_LIVE_AI === 'true';

  const adapters = {
    gemini: createGeminiFreeAdapter({ apiKey: process.env.GEMINI_API_KEY ?? '' }),
    openai: createOpenAIFallbackAdapter({ apiKey: process.env.OPENAI_API_KEY ?? '' }),
  };
  const registry = createFreeTierModelRegistry();

  const result = await runCeoBriefingAgent({
    inputs,
    existingBriefings,
    allowLiveBriefing,
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
        maxOutputTokens: Math.max(Number(request.maxOutputTokens) || 0, 1024),
      },
      allowLiveNetwork: allowLiveAi,
      env: process.env,
      now,
    }),
  });

  if (result.ok && result.status === 'briefing_created' && writeMode && result.updatedBriefings) {
    writeFileSync(briefingsPath, JSON.stringify(result.updatedBriefings, null, 2) + '\n', 'utf8');
  }

  const markdown = formatCeoBriefingMarkdown(result);
  if (reportOut) {
    writeFileSync(reportOut, markdown, 'utf8');
  }

  const sanitizedReason = result.reason ? redactSecrets(String(result.reason)) : null;

  process.stdout.write(JSON.stringify({
    mode: 'live',
    ok: result.ok,
    status: result.status,
    reason: sanitizedReason,
    briefingId: result.generatedBriefing?.id ?? null,
    estimatedCostMinor: result.estimatedCostMinor,
    executedAt: result.executedAt,
  }, null, 2) + '\n');

  if (!result.ok) {
    process.stderr.write(`[agent-ceo-briefing] failed: ${sanitizedReason ?? 'unknown_error'}\n`);
    process.exitCode = 1;
  }
}
