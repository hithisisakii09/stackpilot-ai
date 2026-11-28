#!/usr/bin/env node
/**
 * scripts/agent-traffic-distribution.mjs
 *
 * Phase 15 — Traffic, Distribution & GSC Feedback Agent CLI
 *
 * Usage:
 *   node scripts/agent-traffic-distribution.mjs --dry-run
 *   node scripts/agent-traffic-distribution.mjs --live --write [--slug <slug>]
 *
 * Zero new npm dependencies. Uses Node 26 built-in fetch.
 * Fail-closed: requires STACKPILOT_ALLOW_LIVE_DISTRIBUTION=true and
 * STACKPILOT_ALLOW_LIVE_AI=true for any live AI calls or writes.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ── Flags ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isLive = args.includes('--live');
const isWrite = args.includes('--write');
const slugIdx = args.indexOf('--slug');
const preferredSlug = slugIdx !== -1 ? args[slugIdx + 1] : undefined;

const allowLiveDistribution = process.env.STACKPILOT_ALLOW_LIVE_DISTRIBUTION === 'true';
const allowLiveAi = process.env.STACKPILOT_ALLOW_LIVE_AI === 'true';

// ── Load data ──────────────────────────────────────────────────────────────

const guides = JSON.parse(readFileSync(join(root, 'src/data/agent-buyer-guides.json'), 'utf8'));
const verifiedVendorFacts = JSON.parse(readFileSync(join(root, 'src/data/verified-vendor-facts.json'), 'utf8'));
const extendedCatalog = JSON.parse(readFileSync(join(root, 'src/data/extended-catalog.json'), 'utf8'));
const existingPacks = JSON.parse(readFileSync(join(root, 'src/data/agent-distribution-drafts.json'), 'utf8'));

// ── Import agent + router + live runner ────────────────────────────────────

const {
  runTrafficDistributionAgent,
  selectNextContentForDistribution,
  formatDistributionReportMarkdown,
} = await import('../src/platform/agents/traffic-distribution.mjs');

const { routeAiRequest, redactSecrets } = await import('../src/platform/ai/router.mjs');
const {
  createFreeTierModelRegistry,
  createGeminiFreeAdapter,
  createOpenAIFallbackAdapter,
} = await import('../src/platform/ai/live-adapters.mjs');
const { executeLiveRoutedPrompt } = await import('../src/platform/ai/live-runner.mjs');

// ── SITE_ORIGIN ─────────────────────────────────────────────────────────────

const { SITE_ORIGIN } = await import('../src/lib/site-origin.mjs');

// ── Dry-run mode ───────────────────────────────────────────────────────────

if (isDryRun || !isLive) {
  const draftedSlugs = new Set((existingPacks.packs || []).map(p => p.targetSlug));

  const guideTargets = (guides.guides || []).map(g => g.slug);
  const extendedComparisonTargets = (extendedCatalog.comparisons || []).map(c => c.slug).filter(Boolean);
  const comparisonTargets = [...new Set([...Object.keys(verifiedVendorFacts), ...extendedComparisonTargets])];
  const eligibleTargets = [
    ...guideTargets.filter(s => !draftedSlugs.has(s)),
    ...comparisonTargets.filter(s => !draftedSlugs.has(s)),
  ];

  const pendingPackCount = (existingPacks.packs || []).filter(p => p.status === 'pending_owner_review').length;
  const nextTarget = selectNextContentForDistribution({
    guides,
    verifiedVendorFacts,
    extendedCatalog,
    existingPacks,
    preferredSlug,
  });

  const report = {
    eligibleTargets,
    pendingPackCount,
    nextTargetSlug: nextTarget?.targetSlug || null,
    estimatedCostMinor: 0,
    status: 'dry_run',
    _note: 'No live AI calls. Set STACKPILOT_ALLOW_LIVE_DISTRIBUTION=true and STACKPILOT_ALLOW_LIVE_AI=true with --live --write for live execution.',
  };

  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exit(0);
}

// ── Live mode ──────────────────────────────────────────────────────────────

const now = new Date();
const adapters = {
  gemini: createGeminiFreeAdapter({ apiKey: process.env.GEMINI_API_KEY ?? '' }),
  openai: createOpenAIFallbackAdapter({ apiKey: process.env.OPENAI_API_KEY ?? '' }),
};
const registry = createFreeTierModelRegistry();

async function runAiPrompt(request) {
  const res = await executeLiveRoutedPrompt({
    router: { routeAiRequest },
    adapters,
    registry,
    request: {
      taskClass: request.taskClass || 'editorial_draft',
      prompt: request.prompt,
      systemPrompt: request.systemPrompt,
      requestedTokens: request.requestedTokens || Math.ceil(((request.prompt?.length || 0) + (request.systemPrompt?.length || 0)) / 4) + 1536,
      maxOutputTokens: Math.max(Number(request.maxOutputTokens) || 0, 1536),
    },
    allowLiveNetwork: allowLiveAi,
    env: process.env,
    now: now.toISOString(),
  });
  if (!res.ok) {
    throw new Error(res.reason || 'live_ai_failed');
  }
  return res.text;
}

let result;
try {
  result = await runTrafficDistributionAgent({
    guides,
    existingPacks,
    verifiedVendorFacts,
    extendedCatalog,
    siteOrigin: SITE_ORIGIN,
    preferredSlug,
    runAiPrompt,
    allowLiveDistribution,
    allowLiveAi,
    now,
  });
} catch (err) {
  const safeErr = typeof redactSecrets === 'function' ? redactSecrets(err.message || String(err)) : (err.message || String(err));
  process.stderr.write(`[agent-traffic-distribution] Error: ${safeErr}\n`);
  process.exit(1);
}

// Print markdown report to stdout (for GitHub Actions Step Summary)
const markdown = formatDistributionReportMarkdown(result);
process.stdout.write(markdown + '\n');

// If --live was requested but live flags are disabled, fail closed with non-zero exit code
if (result.status === 'live_distribution_disabled' || result.status === 'live_ai_disabled') {
  process.stderr.write(`[agent-traffic-distribution] Failed closed: ${result.status}\n`);
  process.exit(1);
}

if (result.status === 'no_eligible_targets') {
  process.stderr.write(`[agent-traffic-distribution] Status: ${result.status}\n`);
  process.exit(0);
}

// If we got an error status, exit non-zero
if (result.status === 'ai_error' || result.status === 'invalid_ai_response') {
  process.stderr.write(`[agent-traffic-distribution] ${result.status}: ${result.error || ''}\n`);
  process.exit(1);
}

// If drafted and --write, persist to agent-distribution-drafts.json
if (result.status === 'drafted' && result.newPack && isWrite) {
  existingPacks.packs.push(result.newPack);
  writeFileSync(
    join(root, 'src/data/agent-distribution-drafts.json'),
    JSON.stringify(existingPacks, null, 2) + '\n',
    'utf8',
  );
  process.stderr.write(`[agent-traffic-distribution] Drafted pack for: ${result.newPack.targetSlug}\n`);
}

process.exit(0);
