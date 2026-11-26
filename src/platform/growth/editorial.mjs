import { types } from 'node:util';
import { id as validateId, text as validateText, choice, dataArray } from '../contracts/validation.mjs';

const FORBIDDEN_KEYS = /(?:affiliate|commission|referral|tracking|payout|revenue|monetiz|sponsor|cpc_bid)/i;
const SPAN_KINDS = Object.freeze(['factual', 'framing', 'editorial']);

function fail(message = 'Invalid editorial draft') {
  throw new Error(message);
}

function assertPlainObject(value, message = 'Invalid editorial draft') {
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

function assertAllowedKeys(record, allowed, message = 'Invalid editorial draft') {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      if (FORBIDDEN_KEYS.test(key)) fail('Commercial input is prohibited');
      fail(message);
    }
  }
}

function normalizeBinding(binding) {
  const record = assertPlainObject(binding, 'Invalid editorial draft');
  assertAllowedKeys(record, new Set(['claimId', 'status', 'stale', 'revoked']));
  let claimId;
  try {
    claimId = validateId(record.claimId);
  } catch {
    fail('Invalid editorial draft');
  }
  if (typeof record.status !== 'string' || typeof record.stale !== 'boolean' || typeof record.revoked !== 'boolean') {
    fail('Invalid editorial draft');
  }
  return Object.freeze({
    claimId,
    status: record.status,
    stale: record.stale,
    revoked: record.revoked
  });
}

function normalizeSpan(span, bindingMap) {
  const record = assertPlainObject(span, 'Invalid editorial draft');
  assertAllowedKeys(record, new Set(['id', 'kind', 'text', 'claimIds']));

  let spanId, kind, spanText, rawClaimIds;
  try {
    spanId = validateId(record.id);
    kind = choice(record.kind, SPAN_KINDS);
    spanText = validateText(record.text, 4000);
    rawClaimIds = dataArray(record.claimIds, 32);
  } catch {
    fail('Invalid editorial draft');
  }

  const claimIds = [];
  for (const rawId of rawClaimIds) {
    let cid;
    try {
      cid = validateId(rawId);
    } catch {
      fail('Invalid editorial draft');
    }
    if (!claimIds.includes(cid)) claimIds.push(cid);
  }

  if (kind === 'factual' && claimIds.length === 0) {
    fail('Uncited factual span is prohibited');
  }

  for (const cid of claimIds) {
    const binding = bindingMap.get(cid);
    if (!binding || binding.status !== 'approved' || binding.stale !== false || binding.revoked !== false) {
      fail('Unverified evidence reference: ' + cid);
    }
  }

  return Object.freeze({
    id: spanId,
    kind,
    text: spanText,
    claimIds: Object.freeze(claimIds)
  });
}

/**
 * Builds and validates an internal, evidence-bound editorial draft.
 * Fails closed on uncited factual spans, unapproved/stale/revoked evidence,
 * prototype/Proxy payloads, non-draft status, or commercial/monetization fields.
 */
export function buildEditorialDraft(input) {
  const record = assertPlainObject(input, 'Invalid editorial draft');
  assertAllowedKeys(
    record,
    new Set(['id', 'categoryId', 'title', 'status', 'spans', 'evidenceBindings', 'citedClaimIds'])
  );

  let draftId, categoryId, title, rawBindings, rawSpans;
  try {
    draftId = validateId(record.id);
    categoryId = validateId(record.categoryId);
    title = validateText(record.title, 200);
    if (record.status !== 'draft') fail('Invalid editorial draft');
    rawBindings = dataArray(record.evidenceBindings, 100);
    rawSpans = dataArray(record.spans, 100);
  } catch (error) {
    if (error instanceof Error && error.message === 'Commercial input is prohibited') throw error;
    fail('Invalid editorial draft');
  }

  if (rawSpans.length === 0) fail('Invalid editorial draft');

  const bindingMap = new Map();
  const evidenceBindings = [];
  for (const rawBinding of rawBindings) {
    const binding = normalizeBinding(rawBinding);
    if (bindingMap.has(binding.claimId)) fail('Invalid editorial draft');
    bindingMap.set(binding.claimId, binding);
    evidenceBindings.push(binding);
  }

  const seenSpanIds = new Set();
  const citedSet = new Set();
  const spans = [];
  for (const rawSpan of rawSpans) {
    const span = normalizeSpan(rawSpan, bindingMap);
    if (seenSpanIds.has(span.id)) fail('Invalid editorial draft');
    seenSpanIds.add(span.id);
    for (const cid of span.claimIds) citedSet.add(cid);
    spans.push(span);
  }

  const citedClaimIds = [...citedSet].sort((a, b) => a.localeCompare(b, 'en'));

  if (record.citedClaimIds !== undefined) {
    let provided;
    try {
      provided = dataArray(record.citedClaimIds, 100);
    } catch {
      fail('Invalid editorial draft');
    }
    const sortedProvided = [...provided].sort((a, b) => a.localeCompare(b, 'en'));
    if (JSON.stringify(sortedProvided) !== JSON.stringify(citedClaimIds)) {
      fail('Invalid editorial draft');
    }
  }

  return Object.freeze({
    id: draftId,
    categoryId,
    title,
    status: 'draft',
    spans: Object.freeze(spans),
    evidenceBindings: Object.freeze(evidenceBindings),
    citedClaimIds: Object.freeze(citedClaimIds)
  });
}

/**
 * Re-validates an editorial draft object before persistence or serialization.
 */
export function validateEditorialDraft(draft) {
  return buildEditorialDraft(draft);
}
