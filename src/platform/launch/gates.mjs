import { createHash, createPublicKey, verify } from 'node:crypto';
import { types } from 'node:util';
import { id as validateId, choice, dataArray } from '../contracts/validation.mjs';

export const CANONICAL_VENDORS = Object.freeze([
  'hubspot',
  'pipedrive',
  'semrush',
  'ahrefs',
  'kinsta',
  'cloudways'
]);

const PRIVATE_KEY_PATTERN = /-----BEGIN\s+(?:[A-Z0-9]+\s+)?PRIVATE KEY-----/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function fail(message) {
  throw new Error(message);
}

function assertPlainObject(value, message = 'Invalid launch gate input') {
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
    if (key === 'd' || /privatekey/i.test(key)) {
      fail('Private key material is prohibited');
    }
    if (typeof descriptors[key].value === 'string' && PRIVATE_KEY_PATTERN.test(descriptors[key].value)) {
      fail('Private key material is prohibited');
    }
  }
  return value;
}

function assertAllowedKeys(record, allowed, message = 'Invalid launch gate input') {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) fail(message);
  }
}

function parseIsoTimestamp(value, message = 'Invalid launch gate date') {
  if (typeof value !== 'string') fail(message);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value) fail(message);
  return ms;
}

/**
 * Produces the canonical launch attestation payload signed by the offline owner key.
 */
export function canonicalLaunchPayload({ organizationId, approvedVendors, monthlyBudgetInr, delegatedSpendInr, attestedAt }) {
  return {
    schema: 'stackpilot-launch-attestation-v1',
    organizationId: validateId(organizationId),
    approvedVendors: [...approvedVendors].sort((a, b) => a.localeCompare(b, 'en')),
    monthlyBudgetInr,
    delegatedSpendInr,
    attestedAt
  };
}

/**
 * Verifies an offline owner Ed25519 key-ceremony attestation fail-closed.
 */
export function verifyOwnerKeyCeremony(input) {
  const record = assertPlainObject(input, 'Invalid ceremony input');
  assertAllowedKeys(record, new Set([
    'organizationId',
    'ceremonyMode',
    'publicKeyPem',
    'fingerprintSha256',
    'attestedAt',
    'signatureBase64Url',
    'now'
  ]), 'Invalid ceremony input');

  if (record.ceremonyMode !== 'offline_owner') {
    fail('Invalid ceremony mode');
  }

  let organizationId;
  try {
    organizationId = validateId(record.organizationId);
  } catch {
    fail('Invalid ceremony input');
  }

  const nowMs = record.now !== undefined ? parseIsoTimestamp(record.now, 'Invalid ceremony date') : Date.now();
  const attestedMs = parseIsoTimestamp(record.attestedAt, 'Invalid ceremony date');
  if (attestedMs > nowMs) fail('Invalid ceremony date');

  if (typeof record.publicKeyPem !== 'string' || !record.publicKeyPem.includes('BEGIN PUBLIC KEY')) {
    fail('Invalid ceremony input');
  }
  if (typeof record.fingerprintSha256 !== 'string' || !SHA256_PATTERN.test(record.fingerprintSha256)) {
    fail('Invalid ceremony input');
  }
  if (typeof record.signatureBase64Url !== 'string' || !/^[A-Za-z0-9_-]{60,120}$/.test(record.signatureBase64Url)) {
    fail('Invalid ceremony signature');
  }

  let publicKey;
  try {
    publicKey = createPublicKey({ key: record.publicKeyPem, format: 'pem', type: 'spki' });
  } catch {
    fail('Invalid ceremony input');
  }
  if (publicKey.asymmetricKeyType !== 'ed25519') {
    fail('Invalid ceremony input');
  }

  const actualFingerprint = createHash('sha256')
    .update(publicKey.export({ type: 'spki', format: 'der' }))
    .digest('hex');
  if (actualFingerprint !== record.fingerprintSha256) {
    fail('Invalid ceremony fingerprint');
  }

  const payload = canonicalLaunchPayload({
    organizationId,
    approvedVendors: CANONICAL_VENDORS,
    monthlyBudgetInr: 0,
    delegatedSpendInr: 0,
    attestedAt: new Date(attestedMs).toISOString()
  });

  const sigBuf = Buffer.from(record.signatureBase64Url, 'base64url');
  const ok = verify(null, Buffer.from(JSON.stringify(payload)), publicKey, sigBuf);
  if (!ok) fail('Invalid ceremony signature');

  return Object.freeze({
    verified: true,
    organizationId,
    fingerprintSha256: actualFingerprint,
    attestedAt: new Date(attestedMs).toISOString()
  });
}

/**
 * Evaluates 6-vendor claim approval readiness requiring independent owner approvals.
 */
export function evaluateVendorClaimReadiness(claims, nowIso = new Date().toISOString()) {
  const nowMs = parseIsoTimestamp(nowIso, 'Invalid launch gate date');
  const list = dataArray(claims, 200);
  const byVendor = new Map();
  const blockedSet = new Set();

  for (const raw of list) {
    const item = assertPlainObject(raw);
    assertAllowedKeys(item, new Set([
      'vendorId',
      'claimId',
      'status',
      'actorRole',
      'actorId',
      'requesterId',
      'approvedAt'
    ]));
    const vendorId = choice(item.vendorId, CANONICAL_VENDORS);
    validateId(item.claimId);
    const actorRole = choice(item.actorRole, ['owner', 'reviewer', 'agent']);
    const actorId = validateId(item.actorId);
    const requesterId = validateId(item.requesterId);
    const approvedMs = parseIsoTimestamp(item.approvedAt);

    if (byVendor.has(vendorId)) {
      blockedSet.add(vendorId);
      continue;
    }

    const isApproved =
      item.status === 'approved' &&
      actorRole === 'owner' &&
      actorId !== requesterId &&
      approvedMs <= nowMs;

    if (isApproved) {
      byVendor.set(vendorId, true);
    } else {
      blockedSet.add(vendorId);
    }
  }

  const approvedVendors = CANONICAL_VENDORS.filter(v => byVendor.has(v) && !blockedSet.has(v));
  const blockedVendors = CANONICAL_VENDORS.filter(v => blockedSet.has(v));
  const missingVendors = CANONICAL_VENDORS.filter(v => !byVendor.has(v) && !blockedSet.has(v));

  return Object.freeze({
    ready: approvedVendors.length === CANONICAL_VENDORS.length && blockedVendors.length === 0 && missingVendors.length === 0,
    approvedVendors: Object.freeze(approvedVendors),
    missingVendors: Object.freeze(missingVendors),
    blockedVendors: Object.freeze(blockedVendors)
  });
}

/**
 * Evaluates full production go/no-go gates fail-closed across ceremony, 6 vendors, and governance signals.
 */
export function evaluateLaunchGates(input) {
  const record = assertPlainObject(input);
  assertAllowedKeys(record, new Set(['organizationId', 'ceremony', 'vendorClaims', 'signals', 'now']));

  const organizationId = validateId(record.organizationId);
  const nowIso = record.now !== undefined ? new Date(parseIsoTimestamp(record.now)).toISOString() : new Date().toISOString();
  const signals = assertPlainObject(record.signals);
  assertAllowedKeys(signals, new Set([
    'monthlyBudgetInr',
    'delegatedSpendInr',
    'migrationCrlf',
    'migrationsVerified',
    'recoveryDrillStatus',
    'preflightViolations',
    'highOrCriticalVulnerabilities'
  ]));

  const passedGates = [];
  const blockingReasons = [];

  if (signals.monthlyBudgetInr === 0 && signals.delegatedSpendInr === 0) {
    passedGates.push('zero_budget_lock');
  } else {
    blockingReasons.push('zero_budget_not_verified');
  }

  if (signals.migrationCrlf === 0 && signals.migrationsVerified === true) {
    passedGates.push('migration_integrity');
  } else {
    blockingReasons.push('migration_integrity_not_verified');
  }

  if (signals.recoveryDrillStatus === 'pass') {
    passedGates.push('recovery_drills');
  } else {
    blockingReasons.push('recovery_drill_not_verified');
  }

  if (signals.preflightViolations === 0) {
    passedGates.push('release_preflight');
  } else {
    blockingReasons.push('release_preflight_not_verified');
  }

  if (signals.highOrCriticalVulnerabilities === 0) {
    passedGates.push('dependency_audit');
  } else {
    blockingReasons.push('dependency_audit_not_verified');
  }

  const vendorReadiness = evaluateVendorClaimReadiness(record.vendorClaims ?? [], nowIso);
  if (vendorReadiness.ready) {
    passedGates.push('six_vendor_claims_approved');
  } else {
    blockingReasons.push('vendor_claims_incomplete');
  }

  if (!record.ceremony) {
    blockingReasons.push('owner_key_ceremony_missing');
  } else {
    try {
      const verified = verifyOwnerKeyCeremony({ ...record.ceremony, now: nowIso });
      if (verified.organizationId !== organizationId) {
        blockingReasons.push('owner_key_ceremony_org_mismatch');
      } else {
        passedGates.push('owner_key_ceremony');
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Private key material is prohibited') {
        throw err;
      }
      blockingReasons.push('owner_key_ceremony_invalid');
    }
  }

  const decision = blockingReasons.length === 0 ? 'ready' : 'blocked';
  return Object.freeze({
    schema: 'stackpilot-launch-gate-report-v1',
    organizationId,
    decision,
    passedGates: Object.freeze(passedGates),
    blockingReasons: Object.freeze(blockingReasons),
    vendorReadiness,
    evaluatedAt: nowIso
  });
}
