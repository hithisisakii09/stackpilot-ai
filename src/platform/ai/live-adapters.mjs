import { types } from 'node:util';
import { redactSecrets } from './router.mjs';

const ALLOWED_FREE_HOSTS = new Set([
  'generativelanguage.googleapis.com',
  'api.openai.com'
]);

const ALLOWED_LOCAL_HOSTS = new Set([
  '127.0.0.1',
  'localhost'
]);

function fail(message = 'Invalid live adapter configuration') {
  throw new Error(message);
}

function assertPlainObject(value, message = 'Invalid live adapter input') {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    types.isProxy(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail(message);
  }
  return value;
}

function scrubSecret(text, apiKey) {
  let cleaned = typeof text === 'string' ? text : String(text ?? '');
  if (typeof apiKey === 'string' && apiKey.length >= 6) {
    cleaned = cleaned.split(apiKey).join('[REDACTED]');
  }
  return redactSecrets(cleaned);
}

export class ProviderCallError extends Error {
  constructor({ code, retryable, provider, message, apiKey, httpStatus = null }) {
    super(scrubSecret(message, apiKey));
    this.name = 'ProviderCallError';
    this.code = code;
    this.retryable = Boolean(retryable);
    this.provider = provider;
    this.httpStatus = Number.isInteger(httpStatus) ? httpStatus : null;
  }
}

/**
 * Validates provider endpoint URL against strict SSRF host and HTTPS allowlist.
 */
export function validateProviderEndpoint(rawUrl, tier = 'free') {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0 || rawUrl.length > 2048) {
    fail('Invalid provider endpoint URL');
  }
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    fail('Invalid provider endpoint URL');
  }
  if (parsed.username || parsed.password) {
    fail('Provider endpoint must not embed credentials');
  }
  const host = parsed.hostname.toLowerCase();
  if (tier === 'local') {
    if (!ALLOWED_LOCAL_HOSTS.has(host)) {
      fail('Local tier endpoint must use 127.0.0.1 or localhost');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      fail('Invalid local provider protocol');
    }
    return parsed.href;
  }
  if (parsed.protocol !== 'https:') {
    fail('Remote free-tier provider endpoint must use HTTPS');
  }
  if (!ALLOWED_FREE_HOSTS.has(host)) {
    fail(`Provider host is not allowlisted: ${host}`);
  }
  return parsed.href;
}

/**
 * Returns the default ordered free-tier model registry compatible with routeAiRequest.
 */
export function createFreeTierModelRegistry() {
  return Object.freeze([
    Object.freeze({
      id: 'gemini-2-5-flash',
      provider: 'gemini',
      tier: 'free',
      estimatedCostMinor: 0,
      maxContextTokens: 131072,
      priority: 1,
      capabilities: Object.freeze([
        'classification',
        'extraction',
        'editorial_draft',
        'code_review',
        'incident_triage',
        'summarization'
      ]),
      dailyCallLimit: 250,
      dailyTokenLimit: 1_000_000,
      callsUsed: 0,
      tokensUsed: 0,
      healthy: true,
      rateLimited: false,
      circuitOpen: false
    }),
    Object.freeze({
      id: 'gpt-4o-mini',
      provider: 'openai',
      tier: 'free',
      estimatedCostMinor: 0,
      maxContextTokens: 128000,
      priority: 2,
      capabilities: Object.freeze([
        'classification',
        'extraction',
        'editorial_draft',
        'code_review',
        'incident_triage',
        'summarization'
      ]),
      dailyCallLimit: 250,
      dailyTokenLimit: 1_000_000,
      callsUsed: 0,
      tokensUsed: 0,
      healthy: true,
      rateLimited: false,
      circuitOpen: false
    })
  ]);
}

const API_MODEL_IDS = Object.freeze({
  'gemini-2-5-flash': 'gemini-2.5-flash',
  'gpt-4o-mini': 'gpt-4o-mini'
});

function resolveApiModelId(modelId) {
  return API_MODEL_IDS[modelId] ?? modelId;
}

function classifyHttpFailure(status, provider, detail, apiKey) {
  const httpStatus = Number.isInteger(status) ? status : null;
  if (status === 429) {
    return new ProviderCallError({ code: 'rate_limited', retryable: true, provider, message: `${provider} rate limited (HTTP 429)`, apiKey, httpStatus });
  }
  if (status === 401 || status === 403) {
    return new ProviderCallError({ code: 'provider_auth_failed', retryable: true, provider, message: `${provider} authentication failed (HTTP ${status})`, apiKey, httpStatus });
  }
  if (status === 404) {
    return new ProviderCallError({ code: 'model_not_found', retryable: true, provider, message: `${provider} model not found (HTTP 404)`, apiKey, httpStatus });
  }
  if (status >= 500 && status <= 599) {
    return new ProviderCallError({ code: 'provider_unavailable', retryable: true, provider, message: `${provider} unavailable (HTTP ${status})`, apiKey, httpStatus });
  }
  if (status >= 300 && status < 400) {
    return new ProviderCallError({ code: 'invalid_provider_response', retryable: false, provider, message: `${provider} redirect blocked (HTTP ${status})`, apiKey, httpStatus });
  }
  return new ProviderCallError({
    code: 'invalid_provider_response',
    retryable: false,
    provider,
    message: `${provider} invalid response (HTTP ${status}): ${scrubSecret(detail, apiKey).slice(0, 120)}`,
    apiKey,
    httpStatus
  });
}

function classifyThrownError(error, provider, apiKey) {
  if (error instanceof ProviderCallError) return error;
  if (error && typeof error === 'object' && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    return new ProviderCallError({
      code: 'timeout',
      retryable: true,
      provider,
      message: `${provider} request timed out`,
      apiKey
    });
  }
  return new ProviderCallError({
    code: 'provider_unavailable',
    retryable: true,
    provider,
    message: `${provider} network failure: ${error instanceof Error ? error.message : 'unknown error'}`,
    apiKey
  });
}

/**
 * Creates a zero-dependency Gemini Free Tier HTTP adapter (API key passed via x-goog-api-key header).
 */
export function createGeminiFreeAdapter({ apiKey, fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
  if (typeof fetchImpl !== 'function') fail('Missing fetch implementation for Gemini adapter');
  return Object.freeze({
    provider: 'gemini',
    async generate({ modelId = 'gemini-2.5-flash', prompt, systemPrompt, maxOutputTokens = 512, temperature = 0.2 }) {
      if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        throw new ProviderCallError({
          code: 'provider_auth_failed',
          retryable: true,
          provider: 'gemini',
          message: 'Gemini API key is not configured',
          apiKey
        });
      }
      const cleanModelId = resolveApiModelId(String(modelId)).replace(/[^A-Za-z0-9._-]/g, '');
      const endpoint = validateProviderEndpoint(
        `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelId}:generateContent`,
        'free'
      );
      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens }
      };
      if (typeof systemPrompt === 'string' && systemPrompt.trim().length > 0) {
        body.systemInstruction = { parts: [{ text: systemPrompt.trim() }] };
      }

      const started = Date.now();
      let response;
      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(body),
          redirect: 'manual',
          signal: AbortSignal.timeout(timeoutMs)
        });
      } catch (err) {
        throw classifyThrownError(err, 'gemini', apiKey);
      }

      const latencyMs = Math.max(0, Date.now() - started);
      const rawText = await response.text();
      if (!response.ok) {
        throw classifyHttpFailure(response.status, 'gemini', rawText, apiKey);
      }

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        throw new ProviderCallError({
          code: 'invalid_provider_response',
          retryable: false,
          provider: 'gemini',
          message: 'Gemini returned non-JSON response',
          apiKey,
          httpStatus: response.status
        });
      }

      const candidate = parsed?.candidates?.[0];
      const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
      const answerParts = parts.filter(p => !p?.thought && typeof p?.text === 'string').map(p => p.text);
      const fallbackParts = parts.map(p => (typeof p?.text === 'string' ? p.text : ''));
      const text = (answerParts.join('').trim() || fallbackParts.join('').trim());
      if (!text) {
        throw new ProviderCallError({
          code: 'invalid_provider_response',
          retryable: false,
          provider: 'gemini',
          message: 'Gemini response contained no candidate text',
          apiKey,
          httpStatus: response.status
        });
      }

      const inputTokens = Number.isInteger(parsed?.usageMetadata?.promptTokenCount)
        ? parsed.usageMetadata.promptTokenCount
        : null;
      const outputTokens = Number.isInteger(parsed?.usageMetadata?.candidatesTokenCount)
        ? parsed.usageMetadata.candidatesTokenCount
        : null;

      return Object.freeze({
        provider: 'gemini',
        modelId: cleanModelId,
        text,
        finishReason: typeof candidate?.finishReason === 'string' ? candidate.finishReason : null,
        inputTokens,
        outputTokens,
        latencyMs,
        estimatedCostMinor: 0
      });
    }
  });
}

/**
 * Creates a zero-dependency OpenAI fallback HTTP adapter (API key passed via Authorization Bearer header).
 */
export function createOpenAIFallbackAdapter({ apiKey, fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
  if (typeof fetchImpl !== 'function') fail('Missing fetch implementation for OpenAI adapter');
  return Object.freeze({
    provider: 'openai',
    async generate({ modelId = 'gpt-4o-mini', prompt, systemPrompt, maxOutputTokens = 512, temperature = 0.2 }) {
      if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        throw new ProviderCallError({
          code: 'provider_auth_failed',
          retryable: true,
          provider: 'openai',
          message: 'OpenAI API key is not configured',
          apiKey
        });
      }
      const cleanModelId = resolveApiModelId(String(modelId)).replace(/[^A-Za-z0-9._-]/g, '');
      const endpoint = validateProviderEndpoint('https://api.openai.com/v1/chat/completions', 'free');
      const cappedMaxTokens = Number.isInteger(maxOutputTokens) && maxOutputTokens > 0
        ? Math.min(maxOutputTokens, 512)
        : 512;
      const messages = [];
      if (typeof systemPrompt === 'string' && systemPrompt.trim().length > 0) {
        messages.push({ role: 'system', content: systemPrompt.trim() });
      }
      messages.push({ role: 'user', content: prompt });

      const started = Date.now();
      let response;
      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: cleanModelId,
            messages,
            max_tokens: cappedMaxTokens,
            temperature
          }),
          redirect: 'manual',
          signal: AbortSignal.timeout(timeoutMs)
        });
      } catch (err) {
        throw classifyThrownError(err, 'openai', apiKey);
      }

      const latencyMs = Math.max(0, Date.now() - started);
      const rawText = await response.text();
      if (!response.ok) {
        throw classifyHttpFailure(response.status, 'openai', rawText, apiKey);
      }

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        throw new ProviderCallError({
          code: 'invalid_provider_response',
          retryable: false,
          provider: 'openai',
          message: 'OpenAI returned non-JSON response',
          apiKey
        });
      }

      const choice = parsed?.choices?.[0];
      const text = typeof choice?.message?.content === 'string' ? choice.message.content.trim() : '';
      if (!text) {
        throw new ProviderCallError({
          code: 'invalid_provider_response',
          retryable: false,
          provider: 'openai',
          message: 'OpenAI response contained no assistant content',
          apiKey
        });
      }

      const inputTokens = Number.isInteger(parsed?.usage?.prompt_tokens)
        ? parsed.usage.prompt_tokens
        : null;
      const outputTokens = Number.isInteger(parsed?.usage?.completion_tokens)
        ? parsed.usage.completion_tokens
        : null;

      return Object.freeze({
        provider: 'openai',
        modelId: cleanModelId,
        text,
        finishReason: typeof choice?.finish_reason === 'string' ? choice.finish_reason : null,
        inputTokens,
        outputTokens,
        latencyMs,
        estimatedCostMinor: 0
      });
    }
  });
}

export { assertPlainObject };
