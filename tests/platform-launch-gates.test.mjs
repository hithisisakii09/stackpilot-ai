import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createHash, sign } from 'node:crypto';
import {
  CANONICAL_VENDORS,
  canonicalLaunchPayload,
  verifyOwnerKeyCeremony,
  evaluateVendorClaimReadiness,
  evaluateLaunchGates
} from '../src/platform/launch/gates.mjs';

const NOW = '2026-11-26T12:00:00.000Z';
const ATTESTED_AT = '2026-11-26T11:50:00.000Z';

function makeSignedCeremony({ organizationId = 'org-alpha', ceremonyMode = 'offline_owner', attestedAt = ATTESTED_AT } = {}) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const publicKeySpkiDer = publicKey.export({ type: 'spki', format: 'der' });
  const fingerprintSha256 = createHash('sha256').update(publicKeySpkiDer).digest('hex');
  const payload = canonicalLaunchPayload({
    organizationId,
    approvedVendors: [...CANONICAL_VENDORS],
    monthlyBudgetInr: 0,
    delegatedSpendInr: 0,
    attestedAt
  });
  const signatureBase64Url = sign(null, Buffer.from(JSON.stringify(payload)), privateKey).toString('base64url');
  return {
    organizationId,
    ceremonyMode,
    publicKeyPem,
    fingerprintSha256,
    attestedAt,
    signatureBase64Url,
    now: NOW
  };
}

function makeAllVendorClaims(role = 'owner') {
  return CANONICAL_VENDORS.map(vendorId => ({
    vendorId,
    claimId: 'claim-' + vendorId,
    status: 'approved',
    actorRole: role,
    actorId: role + '-1',
    requesterId: 'agent-1',
    approvedAt: ATTESTED_AT
  }));
}

const greenSignals = () => ({
  monthlyBudgetInr: 0,
  delegatedSpendInr: 0,
  migrationCrlf: 0,
  migrationsVerified: true,
  recoveryDrillStatus: 'pass',
  preflightViolations: 0,
  highOrCriticalVulnerabilities: 0
});

test('evaluateLaunchGates returns ready when ceremony, 6 vendors, and all governance signals pass', () => {
  const ceremony = makeSignedCeremony();
  const result = evaluateLaunchGates({
    organizationId: 'org-alpha',
    ceremony,
    vendorClaims: makeAllVendorClaims('owner'),
    signals: greenSignals(),
    now: NOW
  });

  assert.equal(result.decision, 'ready');
  assert.deepEqual(result.blockingReasons, []);
  assert.deepEqual(result.vendorReadiness.approvedVendors, [...CANONICAL_VENDORS]);
  assert.deepEqual(result.vendorReadiness.missingVendors, []);
});

test('verifyOwnerKeyCeremony rejects test/ephemeral modes, private keys, bad signatures, and Proxy', () => {
  assert.throws(() => verifyOwnerKeyCeremony(makeSignedCeremony({ ceremonyMode: 'test' })), /Invalid ceremony mode/);
  assert.throws(() => verifyOwnerKeyCeremony(makeSignedCeremony({ ceremonyMode: 'ephemeral' })), /Invalid ceremony mode/);

  const withPrivKey = makeSignedCeremony();
  withPrivKey.publicKeyPem = '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----';
  assert.throws(() => verifyOwnerKeyCeremony(withPrivKey), /Private key material is prohibited/);

  const badSig = makeSignedCeremony();
  badSig.signatureBase64Url = Buffer.alloc(64, 1).toString('base64url');
  assert.throws(() => verifyOwnerKeyCeremony(badSig), /Invalid ceremony signature/);

  assert.throws(() => verifyOwnerKeyCeremony(new Proxy(makeSignedCeremony(), {})), /Invalid ceremony input/);
});

test('evaluateVendorClaimReadiness blocks missing vendors, non-owner approvals, and self-approvals', () => {
  const partial = evaluateVendorClaimReadiness(makeAllVendorClaims('owner').slice(0, 4), NOW);
  assert.equal(partial.ready, false);
  assert.deepEqual(partial.missingVendors, ['kinsta', 'cloudways']);

  const reviewerAttempt = evaluateVendorClaimReadiness(makeAllVendorClaims('reviewer'), NOW);
  assert.equal(reviewerAttempt.ready, false);
  assert.equal(reviewerAttempt.blockedVendors.length, 6);

  const selfApprove = makeAllVendorClaims('owner');
  selfApprove[0].requesterId = 'owner-1';
  const selfRes = evaluateVendorClaimReadiness(selfApprove, NOW);
  assert.equal(selfRes.ready, false);
  assert.deepEqual(selfRes.blockedVendors, ['hubspot']);
});

test('evaluateLaunchGates fails closed when signals are null, missing, or failing', () => {
  const res = evaluateLaunchGates({
    organizationId: 'org-alpha',
    ceremony: null,
    vendorClaims: [],
    signals: { ...greenSignals(), recoveryDrillStatus: null, highOrCriticalVulnerabilities: null },
    now: NOW
  });
  assert.equal(res.decision, 'blocked');
  assert.ok(res.blockingReasons.includes('owner_key_ceremony_missing'));
  assert.ok(res.blockingReasons.includes('vendor_claims_incomplete'));
  assert.ok(res.blockingReasons.includes('recovery_drill_not_verified'));
  assert.ok(res.blockingReasons.includes('dependency_audit_not_verified'));
});
