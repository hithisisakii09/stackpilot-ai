import { routeAiRequest } from '../src/platform/ai/router.mjs';
import {
  createFreeTierModelRegistry,
  createGeminiFreeAdapter,
  createOpenAIFallbackAdapter
} from '../src/platform/ai/live-adapters.mjs';
import { executeLiveRoutedPrompt } from '../src/platform/ai/live-runner.mjs';

const liveMode = process.argv.includes('--live');
const now = new Date().toISOString();
const registry = createFreeTierModelRegistry();
const geminiKey = process.env.GEMINI_API_KEY ?? '';
const openaiKey = process.env.OPENAI_API_KEY ?? '';

const baseStatus = {
  geminiKeyConfigured: geminiKey.trim().length > 0,
  openaiKeyConfigured: openaiKey.trim().length > 0,
  estimatedCostMinor: 0
};

if (!liveMode) {
  const routingPlan = routeAiRequest({
    taskClass: 'classification',
    prompt: 'Classify health check: OK',
    requestedTokens: 64,
    registry,
    timestamp: now
  });
  process.stdout.write(JSON.stringify({
    mode: 'dry-run',
    ok: routingPlan.allowed,
    ...baseStatus,
    routingPlan: {
      selectedModelId: routingPlan.selectedModelId,
      fallbackChainAttempted: routingPlan.fallbackChainAttempted,
      estimatedCostMinor: routingPlan.estimatedCostMinor
    },
    timestamp: now
  }, null, 2) + '\n');
} else {
  const result = await executeLiveRoutedPrompt({
    router: { routeAiRequest },
    adapters: {
      gemini: createGeminiFreeAdapter({ apiKey: geminiKey }),
      openai: createOpenAIFallbackAdapter({ apiKey: openaiKey })
    },
    registry,
    request: {
      taskClass: 'classification',
      prompt: 'Reply with a single word: OK',
      systemPrompt: 'You are a concise health check responder.',
      requestedTokens: 64,
      maxOutputTokens: 16
    },
    allowLiveNetwork: process.env.STACKPILOT_ALLOW_LIVE_AI === 'true',
    env: process.env,
    now
  });

  process.stdout.write(JSON.stringify({
    mode: 'live',
    ok: result.ok,
    reason: result.reason ?? null,
    ...baseStatus,
    provider: result.provider,
    selectedModel: result.selectedModel,
    attemptedModels: result.attemptedModels,
    latencyMs: result.latencyMs ?? null,
    inputTokens: result.inputTokens ?? null,
    outputTokens: result.outputTokens ?? null,
    estimatedCostMinor: result.estimatedCostMinor,
    timestamp: result.timestamp
  }, null, 2) + '\n');

  if (!result.ok) {
    process.exitCode = 1;
  }
}
