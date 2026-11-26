import { createHash } from 'node:crypto';
import { types } from 'node:util';
import { id as validateId, choice, integer, text as validateText, dataArray } from '../contracts/validation.mjs';

export const TASK_CLASSES = Object.freeze([
  'classification',
  'extraction',
  'editorial_draft',
  'code_review',
  'incident_triage',
  'summarization'
]);

const SECRET_PATTERNS = [
  /(?:sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,})/g,
  /\bBearer\s+[A-Za-z0-9._-]{10,}/gi,
  /-----BEGIN\s+(?:[A-Z0-9]+\s+)?PRIVATE KEY-----/g,
  /https?:\/\/[^/\s:@]+:[^/\s@]+@/gi
];

function fail(message = 'Invalid AI router input') {
  throw new Error(message);
}

function assertPlainObject(value, message = 'Invalid AI router input') {
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

function assertAllowedKeys(record, allowed, message = 'Invalid AI router input') {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) fail(message);
  }
}

function parseIsoTimestamp(value) {
  if (typeof value !== 'string') fail('Invalid AI router input');
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value) fail('Invalid AI router input');
  return new Date(ms).toISOString();
}

/**
 * Redacts secret-like patterns from text before any telemetry or diagnostic output.
 */
export function redactSecrets(input) {
  if (typeof input !== 'string') fail('Invalid AI router input');
  let output = input;
  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern, '[REDACTED]');
  }
  return output;
}

function containsSecret(input) {
  return SECRET_PATTERNS.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(input);
  });
}

function normalizeModelDescriptor(raw) {
  const record = assertPlainObject(raw);
  assertAllowedKeys(record, new Set([
    'id',
    'provider',
    'tier',
    'estimatedCostMinor',
    'maxContextTokens',
    'priority',
    'capabilities',
    'dailyCallLimit',
    'dailyTokenLimit',
    'callsUsed',
    'tokensUsed',
    'healthy',
    'rateLimited',
    'circuitOpen'
  ]));

  let modelId, provider, maxContextTokens, priority, dailyCallLimit, dailyTokenLimit, callsUsed, tokensUsed, capabilities;
  try {
    modelId = validateId(record.id);
    provider = validateId(record.provider);
    if (record.tier === 'paid' || !['free', 'local'].includes(record.tier)) {
      fail('budget_violation: only free or local tiers are permitted');
    }
    if (record.estimatedCostMinor !== 0) {
      fail('budget_violation: estimatedCostMinor must be 0');
    }
    maxContextTokens = integer(record.maxContextTokens, 1, 10_000_000);
    priority = integer(record.priority, 1, 1000);
    dailyCallLimit = integer(record.dailyCallLimit, 1, 1_000_000);
    dailyTokenLimit = integer(record.dailyTokenLimit, 1, 100_000_000);
    callsUsed = integer(record.callsUsed, 0, 1_000_000);
    tokensUsed = integer(record.tokensUsed, 0, 100_000_000);
    const rawCaps = dataArray(record.capabilities, 12);
    capabilities = rawCaps.map(c => choice(c, TASK_CLASSES));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('budget_violation')) throw error;
    fail('Invalid AI router input');
  }

  for (const flag of ['healthy', 'rateLimited', 'circuitOpen']) {
    if (typeof record[flag] !== 'boolean') fail('Invalid AI router input');
  }

  return Object.freeze({
    id: modelId,
    provider,
    tier: record.tier,
    estimatedCostMinor: 0,
    maxContextTokens,
    priority,
    capabilities: Object.freeze(capabilities),
    dailyCallLimit,
    dailyTokenLimit,
    callsUsed,
    tokensUsed,
    healthy: record.healthy,
    rateLimited: record.rateLimited,
    circuitOpen: record.circuitOpen
  });
}

/**
 * Deterministically routes an AI request across zero-cost free/local models with fallback and circuit-breaker checks.
 */
export function routeAiRequest(input) {
  const record = assertPlainObject(input);
  assertAllowedKeys(record, new Set(['taskClass', 'prompt', 'requestedTokens', 'registry', 'timestamp', 'latencyMs', 'actualOutputTokens']));

  let taskClass, prompt, requestedTokens, rawRegistry;
  try {
    taskClass = choice(record.taskClass, TASK_CLASSES);
    prompt = validateText(record.prompt, 16384);
    requestedTokens = integer(record.requestedTokens, 1, 10_000_000);
    rawRegistry = dataArray(record.registry, 32);
  } catch {
    fail('Invalid AI router input');
  }

  if (containsSecret(prompt)) {
    fail('secret_detected: prompt contains secret-like material');
  }

  const timestamp = parseIsoTimestamp(record.timestamp);
  const latencyMs = record.latencyMs === undefined || record.latencyMs === null
    ? null
    : integer(record.latencyMs, 0, 600_000);
  const actualOutputTokens = record.actualOutputTokens === undefined || record.actualOutputTokens === null
    ? null
    : integer(record.actualOutputTokens, 0, 10_000_000);

  const models = rawRegistry.map(normalizeModelDescriptor)
    .filter(m => m.capabilities.includes(taskClass))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id, 'en'));

  const requestDigest = createHash('sha256')
    .update(JSON.stringify({ taskClass, promptDigest: createHash('sha256').update(prompt).digest('hex'), requestedTokens }))
    .digest('hex');

  if (models.length === 0) {
    return Object.freeze({
      allowed: false,
      denialReason: 'no_eligible_model',
      selectedModelId: null,
      estimatedCostMinor: 0,
      fallbackChainAttempted: Object.freeze([]),
      telemetry: Object.freeze({
        requestDigest,
        taskClass,
        selectedModelId: null,
        fallbackChainAttempted: Object.freeze([]),
        estimatedCostMinor: 0,
        latencyMs,
        actualOutputTokens,
        timestamp
      })
    });
  }

  const attempted = [];
  let sawQuotaIssue = false;
  let sawContextIssue = false;

  for (const model of models) {
    attempted.push(model.id);
    if (requestedTokens > model.maxContextTokens) {
      sawContextIssue = true;
      continue;
    }
    if (model.callsUsed + 1 > model.dailyCallLimit || model.tokensUsed + requestedTokens > model.dailyTokenLimit) {
      sawQuotaIssue = true;
      continue;
    }
    if (!model.healthy || model.rateLimited || model.circuitOpen) {
      continue;
    }
    return Object.freeze({
      allowed: true,
      denialReason: null,
      selectedModelId: model.id,
      estimatedCostMinor: 0,
      fallbackChainAttempted: Object.freeze(attempted),
      telemetry: Object.freeze({
        requestDigest,
        taskClass,
        selectedModelId: model.id,
        fallbackChainAttempted: Object.freeze(attempted),
        estimatedCostMinor: 0,
        latencyMs,
        actualOutputTokens,
        timestamp
      })
    });
  }

  const denialReason = sawQuotaIssue
    ? 'quota_exceeded'
    : sawContextIssue
      ? 'context_limit_exceeded'
      : 'no_eligible_model';

  return Object.freeze({
    allowed: false,
    denialReason,
    selectedModelId: null,
    estimatedCostMinor: 0,
    fallbackChainAttempted: Object.freeze(attempted),
    telemetry: Object.freeze({
      requestDigest,
      taskClass,
      selectedModelId: null,
      fallbackChainAttempted: Object.freeze(attempted),
      estimatedCostMinor: 0,
      latencyMs,
      actualOutputTokens,
      timestamp
    })
  });
}
