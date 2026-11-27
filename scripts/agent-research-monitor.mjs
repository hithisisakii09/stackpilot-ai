import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectMonitoredVendorUrls,
  runResearchMonitor,
  formatMonitorReportMarkdown
} from '../src/platform/agents/research-monitor.mjs';
import { routeAiRequest } from '../src/platform/ai/router.mjs';
import {
  createFreeTierModelRegistry,
  createGeminiFreeAdapter,
  createOpenAIFallbackAdapter
} from '../src/platform/ai/live-adapters.mjs';
import { executeLiveRoutedPrompt } from '../src/platform/ai/live-runner.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const liveMode = process.argv.includes('--live');
const updateFingerprints = process.argv.includes('--update-fingerprints');
const reportIdx = process.argv.indexOf('--report-out');
const reportOut = reportIdx >= 0 ? process.argv[reportIdx + 1] : null;

const factsPath = join(root, 'src', 'data', 'verified-vendor-facts.json');
const fingerprintsPath = join(root, 'src', 'data', 'vendor-doc-fingerprints.json');

const verifiedFacts = JSON.parse(readFileSync(factsPath, 'utf8'));
const fingerprints = JSON.parse(readFileSync(fingerprintsPath, 'utf8'));
const monitored = collectMonitoredVendorUrls(verifiedFacts);
const now = new Date().toISOString();

if (!liveMode) {
  process.stdout.write(JSON.stringify({
    mode: 'dry-run',
    ok: true,
    monitoredUrlCount: monitored.length,
    baselinedUrlCount: Object.keys(fingerprints.urls ?? {}).length,
    estimatedCostMinor: 0,
    timestamp: now
  }, null, 2) + '\n');
} else {
  const allowLiveMonitor = process.env.STACKPILOT_ALLOW_LIVE_MONITOR === 'true';
  const allowLiveAi = process.env.STACKPILOT_ALLOW_LIVE_AI === 'true';

  const adapters = {
    gemini: createGeminiFreeAdapter({ apiKey: process.env.GEMINI_API_KEY ?? '' }),
    openai: createOpenAIFallbackAdapter({ apiKey: process.env.OPENAI_API_KEY ?? '' })
  };
  const registry = createFreeTierModelRegistry();

  const result = await runResearchMonitor({
    verifiedFacts,
    fingerprints,
    allowLiveMonitor,
    allowLiveAi,
    now,
    runAiPrompt: (request) => executeLiveRoutedPrompt({
      router: { routeAiRequest },
      adapters,
      registry,
      request,
      allowLiveNetwork: allowLiveAi,
      env: process.env,
      now
    })
  });

  if (result.ok && updateFingerprints) {
    const serialized = JSON.stringify(result.updatedFingerprints, null, 2) + '\n';
    writeFileSync(fingerprintsPath, serialized, 'utf8');
  }

  const markdown = formatMonitorReportMarkdown(result);
  if (reportOut) {
    writeFileSync(reportOut, markdown, 'utf8');
  }

  process.stdout.write(JSON.stringify({
    mode: 'live',
    ok: result.ok,
    reason: result.reason ?? null,
    counts: result.counts,
    estimatedCostMinor: result.estimatedCostMinor,
    updatedAt: result.updatedAt
  }, null, 2) + '\n');

  if (!result.ok) {
    process.exitCode = 1;
  }
}
