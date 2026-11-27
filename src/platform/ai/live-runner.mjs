import { types } from 'node:util';
import { redactSecrets, routeAiRequest } from './router.mjs';
import { createFreeTierModelRegistry, ProviderCallError } from './live-adapters.mjs';

const SECRET_CHECK_PATTERNS = [
  /(?:sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|gsk_[A-Za-z0-9_-]{12,})/i,
  /\bBearer\s+[A-Za-z0-9._-]{10,}/i,
  /-----BEGIN\s+(?:[A-Z0-9]+\s+)?PRIVATE KEY-----/i,
  /https?:\/\/[^/\s:@]+:[^/\s@]+@/i
];

function fail(message = 'Invalid live AI runner input') {
  throw new Error(message);
}

function assertPlainObject(value, message = 'Invalid live AI runner input') {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    types.isProxy(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail(message);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (
      typeof key !== 'string' ||
      key === '__proto__' ||
      key === 'prototype' ||
      key === 'constructor' ||
      !Object.hasOwn(descriptors[key], 'value') ||
      !descriptors[key].enumerable
    ) {
      fail(message);
    }
  }
  return value;
}

function hasSecretLikeContent(text) {
  return typeof text === 'string' && SECRET_CHECK_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Executes a routed prompt across free-tier live LLM adapters with fail-closed gates and fallback.
 */
export async function executeLiveRoutedPrompt(input) {
  const opts = assertPlainObject(input, 'Invalid live AI runner input');
  const router = opts.router?.routeAiRequest ? opts.router : { routeAiRequest };
  const adapters = assertPlainObject(opts.adapters ?? {}, 'Invalid adapters map');
  const request = assertPlainObject(opts.request, 'Invalid AI request');
  const env = opts.env ?? process.env;
  const timestamp = typeof opts.now === 'string' ? opts.now : new Date().toISOString();

  const liveEnabled = opts.allowLiveNetwork === true || env?.STACKPILOT_ALLOW_LIVE_AI === 'true';
  if (!liveEnabled) {
    return Object.freeze({
      ok: false,
      reason: 'live_network_disabled',
      selectedModel: null,
      provider: null,
      attemptedModels: Object.freeze([]),
      estimatedCostMinor: 0,
      timestamp
    });
  }

  if (hasSecretLikeContent(request.prompt) || hasSecretLikeContent(request.systemPrompt)) {
    fail('secret_detected: prompt or systemPrompt contains secret-like material');
  }

  const baseRegistry = opts.registry ?? createFreeTierModelRegistry();
  const workingRegistry = baseRegistry.map(model => ({
    ...model,
    capabilities: [...model.capabilities]
  }));

  const attemptedModels = [];
  let lastRequestDigest = null;

  for (let i = 0; i < workingRegistry.length; i++) {
    const decision = router.routeAiRequest({
      taskClass: request.taskClass,
      prompt: request.prompt,
      requestedTokens: request.requestedTokens,
      registry: workingRegistry,
      timestamp
    });
    lastRequestDigest = decision.telemetry.requestDigest;

    if (!decision.allowed || !decision.selectedModelId) {
      return Object.freeze({
        ok: false,
        reason: attemptedModels.length > 0 ? 'all_free_providers_failed' : decision.denialReason,
        requestDigest: lastRequestDigest,
        taskClass: request.taskClass,
        selectedModel: null,
        provider: null,
        attemptedModels: Object.freeze(attemptedModels),
        estimatedCostMinor: 0,
        timestamp
      });
    }

    const model = workingRegistry.find(m => m.id === decision.selectedModelId);
    const adapter = model ? adapters[model.provider] : null;
    if (!model || !adapter || typeof adapter.generate !== 'function') {
      attemptedModels.push(Object.freeze({
        modelId: decision.selectedModelId,
        provider: model?.provider ?? 'unknown',
        ok: false,
        code: 'adapter_unavailable',
        httpStatus: null,
        retryable: true
      }));
      if (model) model.circuitOpen = true;
      continue;
    }

    try {
      const result = await adapter.generate({
        modelId: model.id,
        prompt: request.prompt,
        systemPrompt: request.systemPrompt,
        maxOutputTokens: request.maxOutputTokens,
        temperature: request.temperature
      });

      attemptedModels.push(Object.freeze({
        modelId: model.id,
        provider: model.provider,
        ok: true,
        code: null,
        httpStatus: 200,
        retryable: false
      }));

      return Object.freeze({
        ok: true,
        reason: null,
        requestDigest: lastRequestDigest,
        taskClass: request.taskClass,
        selectedModel: model.id,
        provider: result.provider,
        text: result.text,
        finishReason: result.finishReason,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
        estimatedCostMinor: 0,
        attemptedModels: Object.freeze(attemptedModels),
        timestamp
      });
    } catch (err) {
      const providerErr = err instanceof ProviderCallError
        ? err
        : new ProviderCallError({
          code: 'provider_unavailable',
          retryable: true,
          provider: model.provider,
          message: redactSecrets(err instanceof Error ? err.message : 'Provider call failed')
        });

      attemptedModels.push(Object.freeze({
        modelId: model.id,
        provider: model.provider,
        ok: false,
        code: providerErr.code,
        httpStatus: providerErr.httpStatus ?? null,
        retryable: providerErr.retryable
      }));

      model.circuitOpen = true;
      if (providerErr.code === 'rate_limited') {
        model.rateLimited = true;
      }
      const canFallback = providerErr.retryable ||
        providerErr.code === 'invalid_provider_response' ||
        providerErr.code === 'model_not_found';
      if (!canFallback) {
        break;
      }
    }
  }

  return Object.freeze({
    ok: false,
    reason: 'all_free_providers_failed',
    requestDigest: lastRequestDigest,
    taskClass: request.taskClass,
    selectedModel: null,
    provider: null,
    attemptedModels: Object.freeze(attemptedModels),
    estimatedCostMinor: 0,
    timestamp
  });
}
