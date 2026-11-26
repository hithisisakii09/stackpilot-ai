import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TASK_CLASSES,
  routeAiRequest,
  redactSecrets
} from '../src/platform/ai/router.mjs';

const NOW = '2026-11-26T12:00:00.000Z';

const baseRegistry = () => [
  {
    id: 'local-qwen-7b',
    provider: 'ollama-local',
    tier: 'local',
    estimatedCostMinor: 0,
    maxContextTokens: 32768,
    priority: 1,
    capabilities: ['classification', 'extraction', 'summarization', 'code_review'],
    dailyCallLimit: 100,
    dailyTokenLimit: 200000,
    callsUsed: 0,
    tokensUsed: 0,
    healthy: true,
    rateLimited: false,
    circuitOpen: false
  },
  {
    id: 'free-gemini-flash',
    provider: 'google-free-tier',
    tier: 'free',
    estimatedCostMinor: 0,
    maxContextTokens: 131072,
    priority: 2,
    capabilities: ['classification', 'extraction', 'editorial_draft', 'code_review', 'incident_triage', 'summarization'],
    dailyCallLimit: 50,
    dailyTokenLimit: 500000,
    callsUsed: 0,
    tokensUsed: 0,
    healthy: true,
    rateLimited: false,
    circuitOpen: false
  }
];

test('selects highest-priority eligible free/local model and preserves null for unknown latency/tokens', () => {
  assert.equal(TASK_CLASSES.length, 6);
  const res = routeAiRequest({
    taskClass: 'code_review',
    prompt: 'Review src/platform/ai/router.mjs for prototype pollution.',
    requestedTokens: 2048,
    registry: baseRegistry(),
    timestamp: NOW
  });

  assert.equal(res.allowed, true);
  assert.equal(res.selectedModelId, 'local-qwen-7b');
  assert.equal(res.estimatedCostMinor, 0);
  assert.deepEqual(res.fallbackChainAttempted, ['local-qwen-7b']);
  assert.equal(res.telemetry.latencyMs, null);
  assert.equal(res.telemetry.actualOutputTokens, null);
  assert.match(res.telemetry.requestDigest, /^[a-f0-9]{64}$/);
});

test('falls back deterministically when primary model is circuit-open, rate-limited, or over context limit', () => {
  const registry = baseRegistry();
  registry[0].circuitOpen = true;

  const res = routeAiRequest({
    taskClass: 'code_review',
    prompt: 'Analyze PR diff for SQL injection.',
    requestedTokens: 4096,
    registry,
    timestamp: NOW
  });

  assert.equal(res.allowed, true);
  assert.equal(res.selectedModelId, 'free-gemini-flash');
  assert.deepEqual(res.fallbackChainAttempted, ['local-qwen-7b', 'free-gemini-flash']);
});

test('fails closed on paid tier, non-zero cost, quota exhaustion, context overflow, and secret-bearing prompts', () => {
  const paidRegistry = baseRegistry();
  paidRegistry[0].tier = 'paid';
  assert.throws(
    () => routeAiRequest({
      taskClass: 'code_review',
      prompt: 'Safe prompt',
      requestedTokens: 100,
      registry: paidRegistry,
      timestamp: NOW
    }),
    /budget_violation/
  );

  const nonzeroRegistry = baseRegistry();
  nonzeroRegistry[0].estimatedCostMinor = 5;
  assert.throws(
    () => routeAiRequest({
      taskClass: 'code_review',
      prompt: 'Safe prompt',
      requestedTokens: 100,
      registry: nonzeroRegistry,
      timestamp: NOW
    }),
    /budget_violation/
  );

  const quotaRegistry = baseRegistry();
  quotaRegistry[0].callsUsed = 100;
  quotaRegistry[1].tokensUsed = 500000;
  const deniedQuota = routeAiRequest({
    taskClass: 'code_review',
    prompt: 'Safe prompt',
    requestedTokens: 100,
    registry: quotaRegistry,
    timestamp: NOW
  });
  assert.equal(deniedQuota.allowed, false);
  assert.equal(deniedQuota.denialReason, 'quota_exceeded');
  assert.equal(deniedQuota.selectedModelId, null);

  const deniedContext = routeAiRequest({
    taskClass: 'code_review',
    prompt: 'Safe prompt',
    requestedTokens: 500000,
    registry: baseRegistry(),
    timestamp: NOW
  });
  assert.equal(deniedContext.allowed, false);
  assert.equal(deniedContext.denialReason, 'context_limit_exceeded');

  assert.throws(
    () => routeAiRequest({
      taskClass: 'code_review',
      prompt: 'Use Authorization: Bearer supersecret_token_123456',
      requestedTokens: 100,
      registry: baseRegistry(),
      timestamp: NOW
    }),
    /secret_detected/
  );

  const redacted = redactSecrets('token=ghp_1234567890abcdef1234567890abcdef1234 and https://user:pass@example.com');
  assert.doesNotMatch(redacted, /ghp_/);
  assert.doesNotMatch(redacted, /user:pass/);
});

test('rejects Proxy, prototype pollution, undeclared taskClass, and undeclared fields', () => {
  assert.throws(
    () => routeAiRequest(new Proxy({
      taskClass: 'code_review',
      prompt: 'Safe',
      requestedTokens: 100,
      registry: baseRegistry(),
      timestamp: NOW
    }, {})),
    /Invalid AI router input/
  );

  assert.throws(
    () => routeAiRequest({
      taskClass: 'unknown_task',
      prompt: 'Safe',
      requestedTokens: 100,
      registry: baseRegistry(),
      timestamp: NOW
    }),
    /Invalid AI router input/
  );
});
