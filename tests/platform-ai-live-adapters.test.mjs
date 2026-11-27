import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  createFreeTierModelRegistry,
  createGeminiFreeAdapter,
  createOpenAIFallbackAdapter,
  validateProviderEndpoint
} from '../src/platform/ai/live-adapters.mjs';
import { executeLiveRoutedPrompt } from '../src/platform/ai/live-runner.mjs';
import { routeAiRequest } from '../src/platform/ai/router.mjs';
import { auditLocalControlPlaneExport } from '../src/lib/local-control-plane-export.mjs';

const NOW = '2026-11-27T12:00:00.000Z';
const DUMMY_GEMINI_KEY = 'AIzaSyDUMMY1234567890123456789012345';
const DUMMY_OPENAI_KEY = 'sk-proj-DUMMY1234567890123456789012345';

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    }
  };
}

test('default live runner fails closed with live_network_disabled and zero fetch calls', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    throw new Error('Should not be called');
  };

  const res = await executeLiveRoutedPrompt({
    router: { routeAiRequest },
    adapters: {
      gemini: createGeminiFreeAdapter({ apiKey: DUMMY_GEMINI_KEY, fetchImpl }),
      openai: createOpenAIFallbackAdapter({ apiKey: DUMMY_OPENAI_KEY, fetchImpl })
    },
    request: {
      taskClass: 'summarization',
      prompt: 'Summarize this release note.',
      requestedTokens: 256
    },
    env: {},
    now: NOW
  });

  assert.equal(res.ok, false);
  assert.equal(res.reason, 'live_network_disabled');
  assert.equal(res.estimatedCostMinor, 0);
  assert.equal(calls, 0);
});

test('Gemini adapter sends x-goog-api-key header (never query string), parses usage, and preserves null when omitted', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, init });
    return jsonResponse(200, {
      candidates: [
        {
          content: { parts: [{ text: 'Gemini summary ok' }] },
          finishReason: 'STOP'
        }
      ],
      usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 5 }
    });
  };

  const adapter = createGeminiFreeAdapter({ apiKey: DUMMY_GEMINI_KEY, fetchImpl, timeoutMs: 3000 });
  const out = await adapter.generate({
    modelId: 'gemini-2.5-flash',
    prompt: 'Summarize',
    systemPrompt: 'Be concise.'
  });

  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
  assert.equal(seen[0].url.includes('key='), false);
  assert.equal(seen[0].init.headers['x-goog-api-key'], DUMMY_GEMINI_KEY);
  assert.equal(out.provider, 'gemini');
  assert.equal(out.text, 'Gemini summary ok');
  assert.equal(out.inputTokens, 12);
  assert.equal(out.outputTokens, 5);
  assert.equal(out.estimatedCostMinor, 0);

  const nullUsageAdapter = createGeminiFreeAdapter({
    apiKey: DUMMY_GEMINI_KEY,
    fetchImpl: async () => jsonResponse(200, {
      candidates: [{ content: { parts: [{ text: 'No usage' }] }, finishReason: 'STOP' }]
    })
  });
  const outNull = await nullUsageAdapter.generate({ modelId: 'gemini-2.5-flash', prompt: 'Hi' });
  assert.equal(outNull.inputTokens, null);
  assert.equal(outNull.outputTokens, null);
});

test('OpenAI fallback adapter sends Authorization Bearer header, caps max_tokens, parses usage, and preserves null when omitted', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, init });
    return jsonResponse(200, {
      choices: [{ message: { content: 'OpenAI summary ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 18, completion_tokens: 7 }
    });
  };

  const adapter = createOpenAIFallbackAdapter({ apiKey: DUMMY_OPENAI_KEY, fetchImpl, timeoutMs: 3000 });
  const out = await adapter.generate({
    modelId: 'gpt-4o-mini',
    prompt: 'Summarize',
    systemPrompt: 'Be concise.',
    maxOutputTokens: 2048
  });

  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(seen[0].init.headers.Authorization, `Bearer ${DUMMY_OPENAI_KEY}`);
  assert.equal(JSON.parse(seen[0].init.body).max_tokens, 512);
  assert.equal(out.provider, 'openai');
  assert.equal(out.text, 'OpenAI summary ok');
  assert.equal(out.inputTokens, 18);
  assert.equal(out.outputTokens, 7);
  assert.equal(out.estimatedCostMinor, 0);

  const nullUsageAdapter = createOpenAIFallbackAdapter({
    apiKey: DUMMY_OPENAI_KEY,
    fetchImpl: async () => jsonResponse(200, {
      choices: [{ message: { content: 'No usage' }, finish_reason: 'stop' }]
    })
  });
  const outNull = await nullUsageAdapter.generate({ modelId: 'gpt-4o-mini', prompt: 'Hi' });
  assert.equal(outNull.inputTokens, null);
  assert.equal(outNull.outputTokens, null);
});

test('runner falls back from Gemini 429 rate_limited to OpenAI 200 and records attempts with zero cost', async () => {
  const registry = createFreeTierModelRegistry();
  assert.equal(registry.every(m => m.tier === 'free' && m.estimatedCostMinor === 0), true);

  const geminiAdapter = createGeminiFreeAdapter({
    apiKey: DUMMY_GEMINI_KEY,
    fetchImpl: async () => jsonResponse(429, { error: { message: `Quota exceeded for ${DUMMY_GEMINI_KEY}` } })
  });
  const openaiAdapter = createOpenAIFallbackAdapter({
    apiKey: DUMMY_OPENAI_KEY,
    fetchImpl: async () => jsonResponse(200, {
      choices: [{ message: { content: 'Fallback ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 9, completion_tokens: 3 }
    })
  });

  const res = await executeLiveRoutedPrompt({
    router: { routeAiRequest },
    adapters: { gemini: geminiAdapter, openai: openaiAdapter },
    request: {
      taskClass: 'classification',
      prompt: 'Classify: build passed',
      requestedTokens: 128
    },
    allowLiveNetwork: true,
    now: NOW
  });

  assert.equal(res.ok, true);
  assert.equal(res.provider, 'openai');
  assert.equal(res.selectedModel, 'gpt-4o-mini');
  assert.equal(res.estimatedCostMinor, 0);
  assert.equal(res.attemptedModels.length, 2);
  assert.equal(res.attemptedModels[0].provider, 'gemini');
  assert.equal(res.attemptedModels[0].code, 'rate_limited');
  assert.equal(res.attemptedModels[1].provider, 'openai');
  assert.equal(res.attemptedModels[1].ok, true);

  const serialized = JSON.stringify(res);
  assert.equal(serialized.includes(DUMMY_GEMINI_KEY), false);
  assert.equal(serialized.includes(DUMMY_OPENAI_KEY), false);
});

test('runner falls back on timeout/503 and fails closed when both Gemini and OpenAI fail without leaking secrets', async () => {
  const timeoutErr = new Error(`Request timeout with Bearer ${DUMMY_GEMINI_KEY}`);
  timeoutErr.name = 'TimeoutError';

  const geminiAdapter = createGeminiFreeAdapter({
    apiKey: DUMMY_GEMINI_KEY,
    fetchImpl: async () => { throw timeoutErr; }
  });
  const openaiAdapter = createOpenAIFallbackAdapter({
    apiKey: DUMMY_OPENAI_KEY,
    fetchImpl: async () => jsonResponse(503, `Upstream error for ${DUMMY_OPENAI_KEY}`)
  });

  const res = await executeLiveRoutedPrompt({
    router: { routeAiRequest },
    adapters: { gemini: geminiAdapter, openai: openaiAdapter },
    request: {
      taskClass: 'summarization',
      prompt: 'Summarize',
      requestedTokens: 128
    },
    allowLiveNetwork: true,
    now: NOW
  });

  assert.equal(res.ok, false);
  assert.equal(res.reason, 'all_free_providers_failed');
  assert.equal(res.estimatedCostMinor, 0);
  assert.equal(res.attemptedModels.length, 2);
  assert.equal(res.attemptedModels[0].code, 'timeout');
  assert.equal(res.attemptedModels[1].code, 'provider_unavailable');

  const serialized = JSON.stringify(res);
  assert.equal(serialized.includes(DUMMY_GEMINI_KEY), false);
  assert.equal(serialized.includes(DUMMY_OPENAI_KEY), false);
});

test('rejects SSRF hosts, non-HTTPS remote URLs, paid tiers, Proxy payloads, and secret-bearing prompts', async () => {
  assert.throws(() => validateProviderEndpoint('https://evil.example/v1/chat', 'free'), /allowlist|host/i);
  assert.throws(() => validateProviderEndpoint('https://api.groq.com/openai/v1/chat/completions', 'free'), /allowlist|host/i);
  assert.throws(() => validateProviderEndpoint('http://api.openai.com/v1/chat/completions', 'free'), /HTTPS/i);
  assert.throws(() => validateProviderEndpoint('http://127.0.0.1:11434/api/generate', 'free'), /HTTPS|local/i);
  assert.doesNotThrow(() => validateProviderEndpoint('http://127.0.0.1:11434/api/generate', 'local'));

  let fetchCalls = 0;
  const fetchImpl = async () => {
    fetchCalls++;
    return jsonResponse(200, {});
  };

  await assert.rejects(
    () => executeLiveRoutedPrompt({
      router: { routeAiRequest },
      adapters: { gemini: createGeminiFreeAdapter({ apiKey: DUMMY_GEMINI_KEY, fetchImpl }) },
      registry: [{
        id: 'paid-model',
        provider: 'gemini',
        tier: 'paid',
        estimatedCostMinor: 100,
        maxContextTokens: 8192,
        priority: 1,
        capabilities: ['summarization'],
        dailyCallLimit: 100,
        dailyTokenLimit: 100000,
        callsUsed: 0,
        tokensUsed: 0,
        healthy: true,
        rateLimited: false,
        circuitOpen: false
      }],
      request: { taskClass: 'summarization', prompt: 'Hello', requestedTokens: 10 },
      allowLiveNetwork: true,
      now: NOW
    }),
    /budget_violation/
  );

  await assert.rejects(
    () => executeLiveRoutedPrompt(new Proxy({
      router: { routeAiRequest },
      adapters: {},
      request: { taskClass: 'summarization', prompt: 'Hello', requestedTokens: 10 },
      allowLiveNetwork: true
    }, {})),
    /Invalid/
  );

  await assert.rejects(
    () => executeLiveRoutedPrompt({
      router: { routeAiRequest },
      adapters: { gemini: createGeminiFreeAdapter({ apiKey: DUMMY_GEMINI_KEY, fetchImpl }) },
      request: {
        taskClass: 'summarization',
        prompt: `Here is my key ${DUMMY_OPENAI_KEY}`,
        requestedTokens: 10
      },
      allowLiveNetwork: true,
      now: NOW
    }),
    /secret_detected/
  );

  assert.equal(fetchCalls, 0);
});

test('ai-router-smoke.mjs --dry-run runs offline, reports key booleans without secrets, and keeps estimatedCostMinor 0', () => {
  const out = execFileSync(process.execPath, ['scripts/ai-router-smoke.mjs', '--dry-run'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      GEMINI_API_KEY: DUMMY_GEMINI_KEY,
      OPENAI_API_KEY: DUMMY_OPENAI_KEY,
      STACKPILOT_ALLOW_LIVE_AI: 'false'
    }
  });
  const report = JSON.parse(out);
  assert.equal(report.mode, 'dry-run');
  assert.equal(report.estimatedCostMinor, 0);
  assert.equal(report.geminiKeyConfigured, true);
  assert.equal(report.openaiKeyConfigured, true);
  assert.equal(out.includes(DUMMY_GEMINI_KEY), false);
  assert.equal(out.includes(DUMMY_OPENAI_KEY), false);
});

test('static leakage guard blocks Phase 11B live LLM files and OpenAI markers from dist/', () => {
  for (const path of ['live-adapters.mjs', 'live-runner.mjs', 'ai-router-smoke.mjs']) {
    const res = auditLocalControlPlaneExport([{ path, content: 'clean' }]);
    assert.ok(res.violations.length > 0, `Expected leakage violation for ${path}`);
  }
  for (const marker of ['generativelanguage.googleapis.com', 'api.openai.com', 'OPENAI_API_KEY', 'STACKPILOT_ALLOW_LIVE_AI']) {
    const res = auditLocalControlPlaneExport([{ path: 'index.html', content: `marker:${marker}` }]);
    assert.ok(res.violations.length > 0, `Expected leakage violation for ${marker}`);
  }
});

test('Gemini handles multi-part/thinking candidate parts and uses gemini-2.5-flash endpoint', async () => {
  let requestedUrl = '';
  const adapter = createGeminiFreeAdapter({
    apiKey: DUMMY_GEMINI_KEY,
    fetchImpl: async (url) => {
      requestedUrl = url;
      return jsonResponse(200, {
        candidates: [{
          content: {
            parts: [
              { thought: true, text: 'internal reasoning' },
              { text: 'OK' },
              { text: '!' }
            ]
          },
          finishReason: 'STOP'
        }]
      });
    }
  });
  const out = await adapter.generate({ modelId: 'gemini-2-5-flash', prompt: 'Reply OK' });
  assert.equal(requestedUrl, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
  assert.equal(out.text, 'OK!');
});

test('runner records sanitized httpStatus and falls back from Gemini 400/404 to OpenAI 200 without leaking secrets', async () => {
  for (const [status, expectedCode] of [[400, 'invalid_provider_response'], [404, 'model_not_found']]) {
    const geminiAdapter = createGeminiFreeAdapter({
      apiKey: DUMMY_GEMINI_KEY,
      fetchImpl: async () => jsonResponse(status, { error: { message: `Bad request with ${DUMMY_GEMINI_KEY}` } })
    });
    const openaiAdapter = createOpenAIFallbackAdapter({
      apiKey: DUMMY_OPENAI_KEY,
      fetchImpl: async () => jsonResponse(200, {
        choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 1 }
      })
    });

    const res = await executeLiveRoutedPrompt({
      router: { routeAiRequest },
      adapters: { gemini: geminiAdapter, openai: openaiAdapter },
      request: {
        taskClass: 'classification',
        prompt: 'Reply with a single word: OK',
        requestedTokens: 64
      },
      allowLiveNetwork: true,
      now: NOW
    });

    assert.equal(res.ok, true);
    assert.equal(res.provider, 'openai');
    assert.equal(res.selectedModel, 'gpt-4o-mini');
    assert.equal(res.attemptedModels.length, 2);
    assert.equal(res.attemptedModels[0].code, expectedCode);
    assert.equal(res.attemptedModels[0].httpStatus, status);
    assert.equal(res.attemptedModels[1].httpStatus, 200);
    const serialized = JSON.stringify(res);
    assert.equal(serialized.includes(DUMMY_GEMINI_KEY), false);
    assert.equal(serialized.includes(DUMMY_OPENAI_KEY), false);
  }
});
