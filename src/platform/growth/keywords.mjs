import { createHash } from 'node:crypto';
import { types } from 'node:util';

const FORBIDDEN_KEYS = /(?:affiliate|commission|referral|tracking|payout|revenue|monetiz|sponsor|cpc_bid)/i;
const INTENT_VALUES = Object.freeze(['comparison', 'commercial', 'transactional', 'navigational', 'informational']);

function fail(message = 'Invalid keyword input') {
  throw new Error(message);
}

function assertPlainObject(value, message = 'Invalid keyword input') {
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

function assertAllowedKeys(record, allowed, message = 'Invalid keyword input') {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      if (FORBIDDEN_KEYS.test(key)) fail('Commercial input is prohibited');
      fail(message);
    }
  }
}

function assertSafeText(value, maxLength, message = 'Invalid keyword input') {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength || /[<>\x00-\x1f\x7f]/.test(value)) {
    fail(message);
  }
  const trimmed = value.trim();
  if (!trimmed) fail(message);
  return trimmed;
}

function normalizeMetric(value, max = 1_000_000_000) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) {
    fail('Invalid keyword metric');
  }
  return value;
}

function sha256Hex(input) {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Normalizes a raw keyword phrase into a lowercase, single-space-delimited string.
 */
export function normalizeKeywordPhrase(value) {
  const trimmed = assertSafeText(value, 200, 'Invalid keyword phrase');
  return trimmed.toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Computes an order-invariant deterministic cluster key from a cluster name or phrase.
 */
export function normalizeClusterKey(value) {
  const normalized = normalizeKeywordPhrase(value);
  const tokens = normalized
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, 'en'));
  if (tokens.length === 0) fail('Invalid keyword cluster key');
  return tokens.join('-');
}

/**
 * Classifies search intent deterministically using rule-based markers.
 */
export function classifySearchIntent(phrase) {
  const normalized = normalizeKeywordPhrase(phrase);
  if (/\b(?:vs|versus|compare|comparison|alternative|alternatives)\b/.test(normalized)) {
    return 'comparison';
  }
  if (/\b(?:pricing|price|cost|buy|trial|demo|discount|plan|plans|quote)\b/.test(normalized)) {
    return 'transactional';
  }
  if (/\b(?:login|sign in|signin|dashboard|status|support|docs|documentation)\b/.test(normalized)) {
    return 'navigational';
  }
  if (/^(?:what|how|why|when|who|where|guide|tutorial)\b/.test(normalized)) {
    return 'informational';
  }
  if (/\b(?:best|top|review|reviews|software|tool|tools|platform|agency|agencies)\b/.test(normalized)) {
    return 'commercial';
  }
  return 'informational';
}

function normalizePhraseEntry(entry) {
  const record = assertPlainObject(entry, 'Invalid keyword phrase entry');
  assertAllowedKeys(record, new Set(['phrase', 'volume', 'difficulty', 'cpc']), 'Invalid keyword phrase entry');
  const phrase = normalizeKeywordPhrase(record.phrase);
  const volume = normalizeMetric(record.volume);
  const difficulty = normalizeMetric(record.difficulty, 100);
  const cpc = normalizeMetric(record.cpc, 100_000);
  const id = 'kw-' + sha256Hex(phrase).slice(0, 40);
  return Object.freeze({ id, phrase, volume, difficulty, cpc });
}

/**
 * Validates and normalizes a keyword cluster input while preserving explicit null for unknown metrics.
 */
export function normalizeKeywordClusterInput(value) {
  const record = assertPlainObject(value, 'Invalid keyword cluster');
  assertAllowedKeys(record, new Set(['name', 'intent', 'phrases']), 'Invalid keyword cluster');

  const name = assertSafeText(record.name, 160, 'Invalid keyword cluster');
  const clusterKey = normalizeClusterKey(name);
  const id = 'cluster-' + sha256Hex(clusterKey).slice(0, 40);

  if (!Array.isArray(record.phrases) || types.isProxy(record.phrases) || Object.getPrototypeOf(record.phrases) !== Array.prototype) {
    fail('Invalid keyword cluster');
  }
  if (record.phrases.length === 0 || record.phrases.length > 100) {
    fail('Invalid keyword cluster');
  }

  const phrases = record.phrases.map(normalizePhraseEntry);
  let intent;
  if (record.intent === undefined) {
    intent = classifySearchIntent(phrases[0].phrase);
  } else {
    if (typeof record.intent !== 'string' || !INTENT_VALUES.includes(record.intent)) {
      fail('Invalid keyword intent');
    }
    intent = record.intent;
  }

  return Object.freeze({
    id,
    clusterKey,
    name,
    intent,
    phrases: Object.freeze(phrases)
  });
}

/**
 * Deduplicates keyword clusters by normalized cluster key and deduplicates phrases within each cluster.
 */
export function deduplicateKeywordClusters(inputs) {
  if (!Array.isArray(inputs) || types.isProxy(inputs) || Object.getPrototypeOf(inputs) !== Array.prototype || inputs.length > 200) {
    fail('Invalid keyword cluster list');
  }
  const byCluster = new Map();
  for (const raw of inputs) {
    const cluster = normalizeKeywordClusterInput(raw);
    const existing = byCluster.get(cluster.clusterKey);
    if (!existing) {
      const phraseMap = new Map();
      for (const entry of cluster.phrases) {
        if (!phraseMap.has(entry.phrase)) phraseMap.set(entry.phrase, entry);
      }
      byCluster.set(cluster.clusterKey, {
        id: cluster.id,
        clusterKey: cluster.clusterKey,
        name: cluster.name,
        intent: cluster.intent,
        phraseMap
      });
    } else {
      for (const entry of cluster.phrases) {
        if (!existing.phraseMap.has(entry.phrase)) {
          existing.phraseMap.set(entry.phrase, entry);
        }
      }
    }
  }

  const result = [];
  for (const entry of byCluster.values()) {
    const phrases = [...entry.phraseMap.values()].sort((a, b) => a.phrase.localeCompare(b.phrase, 'en'));
    result.push(Object.freeze({
      id: entry.id,
      clusterKey: entry.clusterKey,
      name: entry.name,
      intent: entry.intent,
      phrases: Object.freeze(phrases)
    }));
  }
  return Object.freeze(result.sort((a, b) => a.clusterKey.localeCompare(b.clusterKey, 'en')));
}
