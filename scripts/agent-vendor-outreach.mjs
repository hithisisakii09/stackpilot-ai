import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_ORIGIN } from '../src/lib/site-origin.mjs';
import {
  collectAllowedOfficialUrls,
  validateOutreachDrafts,
  selectNextVendorForOutreach,
  runVendorOutreachAgent,
  formatOutreachReportMarkdown
} from '../src/platform/agents/vendor-outreach.mjs';
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
const vendorIdx = process.argv.indexOf('--vendor');
const preferredVendor = vendorIdx >= 0 ? process.argv[vendorIdx + 1] : (process.env.OUTREACH_VENDOR || null);

const candidatesPath = join(root, 'src', 'data', 'affiliate-programs.json');
const factsPath = join(root, 'src', 'data', 'verified-vendor-facts.json');
const draftsPath = join(root, 'src', 'data', 'agent-vendor-outreach-drafts.json');

const candidates = JSON.parse(readFileSync(candidatesPath, 'utf8'));
const verifiedVendorFacts = JSON.parse(readFileSync(factsPath, 'utf8'));
const existingDrafts = JSON.parse(readFileSync(draftsPath, 'utf8'));

const allowedVendorSlugs = candidates.map(c => c.productId);
const allowedOfficialUrls = collectAllowedOfficialUrls(candidates, verifiedVendorFacts);
validateOutreachDrafts(existingDrafts, allowedVendorSlugs, allowedOfficialUrls, { siteOrigin: SITE_ORIGIN });

const now = new Date().toISOString();
const pendingDraftCount = existingDrafts.drafts.filter(d => d.status === 'pending_owner_review').length;
const nextVendor = selectNextVendorForOutreach({ candidates, existingDrafts, preferredVendor });

if (!liveMode) {
  process.stdout.write(JSON.stringify({
    mode: 'dry-run',
    ok: true,
    totalVendors: candidates.length,
    pendingDraftCount,
    nextVendorSlug: nextVendor?.productId ?? null,
    estimatedCostMinor: 0,
    timestamp: now
  }, null, 2) + '\n');
} else {
  const allowLiveOutreach = process.env.STACKPILOT_ALLOW_LIVE_OUTREACH === 'true';
  const allowLiveAi = process.env.STACKPILOT_ALLOW_LIVE_AI === 'true';

  const adapters = {
    gemini: createGeminiFreeAdapter({ apiKey: process.env.GEMINI_API_KEY ?? '' }),
    openai: createOpenAIFallbackAdapter({ apiKey: process.env.OPENAI_API_KEY ?? '' })
  };
  const registry = createFreeTierModelRegistry();

  const result = await runVendorOutreachAgent({
    candidates,
    existingDrafts,
    verifiedVendorFacts,
    siteOrigin: SITE_ORIGIN,
    preferredVendor,
    allowLiveOutreach,
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
        maxOutputTokens: Math.max(Number(request.maxOutputTokens) || 0, 1536)
      },
      allowLiveNetwork: allowLiveAi,
      env: process.env,
      now
    })
  });

  if (result.ok && result.status === 'draft_created' && writeMode) {
    writeFileSync(draftsPath, JSON.stringify(result.updatedDrafts, null, 2) + '\n', 'utf8');
  }

  const markdown = formatOutreachReportMarkdown(result);
  if (reportOut) {
    writeFileSync(reportOut, markdown, 'utf8');
  }

  const sanitizedReason = result.reason ? redactSecrets(String(result.reason)) : null;

  process.stdout.write(JSON.stringify({
    mode: 'live',
    ok: result.ok,
    status: result.status,
    reason: sanitizedReason,
    draftId: result.generatedDraft?.id ?? null,
    vendorSlug: result.generatedDraft?.vendorSlug ?? null,
    estimatedCostMinor: result.estimatedCostMinor,
    executedAt: result.executedAt
  }, null, 2) + '\n');

  if (!result.ok) {
    process.stderr.write(`[agent-vendor-outreach] failed: ${sanitizedReason ?? 'unknown_error'}\n`);
    process.exitCode = 1;
  }
}
