import { types } from 'node:util';
import { id as validateId, choice } from '../contracts/validation.mjs';

export const PARTNERSHIP_STEPS = Object.freeze([
  'discovered',
  'program_verified',
  'requirements_checked',
  'application_drafted',
  'owner_application_approved',
  'application_submitted',
  'under_review',
  'partner_approved',
  'terms_verified',
  'tracking_verified',
  'owner_activation_approved',
  'active'
]);

export const PARTNERSHIP_OFF_RAMPS = Object.freeze(['rejected', 'paused', 'revoked']);
export const OWNER_GATED_STATES = Object.freeze(['owner_application_approved', 'owner_activation_approved']);
const ALL_STATES = Object.freeze([...PARTNERSHIP_STEPS, ...PARTNERSHIP_OFF_RAMPS]);
const TRACKING_PARAM_PATTERN = /^(?:ref|aff|affiliate|utm_[a-z0-9_]+|partner_id|click_id|subid|tag)$/i;

function fail(message) {
  throw new Error(message);
}

function assertPlainObject(value, message = 'Invalid partnership input') {
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

function assertAllowedKeys(record, allowed, message = 'Invalid partnership input') {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) fail(message);
  }
}

function parseIsoTimestamp(value, message = 'Invalid partnership date') {
  if (typeof value !== 'string') fail(message);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value) fail(message);
  return ms;
}

function validateSafeSourceUrl(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) {
    fail('Invalid partnership URL');
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail('Invalid partnership URL');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    fail('Invalid partnership URL');
  }
  for (const key of parsed.searchParams.keys()) {
    if (TRACKING_PARAM_PATTERN.test(key)) {
      fail('Invalid partnership URL');
    }
  }
  return parsed.toString();
}

/**
 * Returns the 1-based step index (1..12) for a forward partnership state, or 1 for off-ramp states.
 */
export function stepNumberForState(state) {
  const idx = PARTNERSHIP_STEPS.indexOf(state);
  if (idx >= 0) return idx + 1;
  if (PARTNERSHIP_OFF_RAMPS.includes(state)) return 1;
  fail('Invalid partnership state');
}

/**
 * Validates a 12-step partnership state transition fail-closed.
 */
export function validatePartnershipTransition(input) {
  const record = assertPlainObject(input);
  assertAllowedKeys(
    record,
    new Set(['from', 'to', 'actorRole', 'actorId', 'requesterId', 'sourceUrl', 'occurredAt', 'now'])
  );

  let from, to, actorRole, actorId;
  try {
    from = choice(record.from, ALL_STATES);
    to = choice(record.to, ALL_STATES);
    actorRole = choice(record.actorRole, ['owner', 'reviewer', 'agent']);
    actorId = validateId(record.actorId);
  } catch {
    fail('Invalid partnership input');
  }

  let requesterId = null;
  if (record.requesterId !== undefined && record.requesterId !== null) {
    try {
      requesterId = validateId(record.requesterId);
    } catch {
      fail('Invalid partnership input');
    }
  }

  const nowMs = record.now !== undefined ? parseIsoTimestamp(record.now) : Date.now();
  const occurredMs = parseIsoTimestamp(record.occurredAt);
  if (occurredMs > nowMs) fail('Invalid partnership date');

  const sourceUrl = record.sourceUrl !== undefined && record.sourceUrl !== null
    ? validateSafeSourceUrl(record.sourceUrl)
    : null;

  if (from === 'revoked') {
    fail('Invalid partnership transition');
  }

  if (OWNER_GATED_STATES.includes(to)) {
    if (actorRole !== 'owner') fail('Owner approval required');
    if (requesterId !== null && requesterId === actorId) fail('Independent owner approval required');
  }

  if (to === 'revoked') {
    if (actorRole !== 'owner') fail('Owner approval required');
    return Object.freeze({
      from,
      to,
      step: 1,
      actorRole,
      actorId,
      requesterId,
      sourceUrl,
      occurredAt: new Date(occurredMs).toISOString(),
      publicAffiliateUrl: null
    });
  }

  if (to === 'rejected' || to === 'paused') {
    if (from === to) fail('Invalid partnership transition');
    return Object.freeze({
      from,
      to,
      step: stepNumberForState(from),
      actorRole,
      actorId,
      requesterId,
      sourceUrl,
      occurredAt: new Date(occurredMs).toISOString(),
      publicAffiliateUrl: null
    });
  }

  // Explicit reset/re-application from rejected or paused back to discovered (step 1)
  if ((from === 'rejected' || from === 'paused') && to === 'discovered') {
    return Object.freeze({
      from,
      to,
      step: 1,
      actorRole,
      actorId,
      requesterId,
      sourceUrl,
      occurredAt: new Date(occurredMs).toISOString(),
      publicAffiliateUrl: null
    });
  }

  const fromIdx = PARTNERSHIP_STEPS.indexOf(from);
  const toIdx = PARTNERSHIP_STEPS.indexOf(to);
  if (fromIdx < 0 || toIdx < 0 || toIdx !== fromIdx + 1) {
    fail('Invalid partnership transition');
  }

  return Object.freeze({
    from,
    to,
    step: toIdx + 1,
    actorRole,
    actorId,
    requesterId,
    sourceUrl,
    occurredAt: new Date(occurredMs).toISOString(),
    publicAffiliateUrl: null
  });
}

/**
 * Applies a validated partnership transition and returns the immutable next state snapshot.
 */
export function applyPartnershipTransition(input) {
  const checked = validatePartnershipTransition(input);
  return Object.freeze({
    state: checked.to,
    step: checked.step,
    actorRole: checked.actorRole,
    actorId: checked.actorId,
    sourceUrl: checked.sourceUrl,
    occurredAt: checked.occurredAt,
    publicAffiliateUrl: null
  });
}
