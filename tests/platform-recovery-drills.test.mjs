import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanonicalSnapshot,
  verifyCanonicalSnapshot,
  verifyMigrationIntegrity,
  evaluateSecurityDrillMatrix,
  buildRecoveryDrillReport
} from '../src/platform/recovery/drills.mjs';

const NOW = '2026-11-26T12:00:00.000Z';

const baseSnapshotInput = () => ({
  organizationId: 'org-alpha',
  capturedAt: '2026-11-26T11:55:00.000Z',
  monthlyBudgetInr: 0,
  delegatedSpendInr: 0,
  publicAffiliateUrl: null,
  partnerships: [{ id: 'partner-hubspot', state: 'active', step: 12 }],
  forecastTotalsByCurrency: { INR: 100000 },
  actualTotalsByCurrency: { USD: 20000 },
  unknownMetricsCount: null,
  now: NOW
});

test('buildCanonicalSnapshot and verifyCanonicalSnapshot verify digest and fail closed on tampering', () => {
  const snapshot = buildCanonicalSnapshot(baseSnapshotInput());
  assert.match(snapshot.digest, /^[a-f0-9]{64}$/);
  assert.equal(snapshot.payload.unknownMetricsCount, null);

  const ok = verifyCanonicalSnapshot(snapshot);
  assert.equal(ok.status, 'pass');
  assert.equal(ok.digestVerified, true);

  const tampered = {
    ...snapshot,
    payload: { ...snapshot.payload, actualTotalsByCurrency: { USD: 99999 } }
  };
  assert.throws(() => verifyCanonicalSnapshot(tampered), /Snapshot digest mismatch/);

  const paid = baseSnapshotInput();
  paid.monthlyBudgetInr = 100;
  assert.throws(() => buildCanonicalSnapshot(paid), /Invalid recovery snapshot/);

  const proxyInput = new Proxy(baseSnapshotInput(), {});
  assert.throws(() => buildCanonicalSnapshot(proxyInput), /Invalid recovery snapshot/);
});

test('verifyMigrationIntegrity rejects CRLF injection and tampered migration bytes', () => {
  const lfBytes = Buffer.from('-- migration\nCREATE TABLE x (id text);\n', 'utf8');
  const crlfBytes = Buffer.from('-- migration\r\nCREATE TABLE x (id text);\r\n', 'utf8');
  const { createHash } = awaitCrypto();

  const sha = createHash('sha256').update(lfBytes).digest('hex');
  assert.equal(verifyMigrationIntegrity([{ version: 1, file: '0001.sql', bytes: lfBytes, expectedSha256: sha }]).status, 'pass');
  assert.throws(
    () => verifyMigrationIntegrity([{ version: 1, file: '0001.sql', bytes: crlfBytes, expectedSha256: sha }]),
    /CRLF detected/
  );
  assert.throws(
    () => verifyMigrationIntegrity([{ version: 1, file: '0001.sql', bytes: lfBytes, expectedSha256: '0'.repeat(64) }]),
    /Migration checksum mismatch/
  );
});

test('evaluateSecurityDrillMatrix and buildRecoveryDrillReport enforce fail-closed matrix and null unexecuted checks', () => {
  const matrix = evaluateSecurityDrillMatrix({
    revokedSessionStatus: 401,
    nonOwnerMutationStatus: 403,
    crossTenantSpoofStatus: 403,
    csrfMismatchStatus: 403,
    paidAiRouterError: 'budget_violation',
    secretPayloadError: 'secret_detected'
  });
  assert.equal(matrix.status, 'pass');

  assert.throws(
    () => evaluateSecurityDrillMatrix({
      revokedSessionStatus: 200,
      nonOwnerMutationStatus: 403,
      crossTenantSpoofStatus: 403,
      csrfMismatchStatus: 403,
      paidAiRouterError: 'budget_violation',
      secretPayloadError: 'secret_detected'
    }),
    /Security drill failed/
  );

  const report = buildRecoveryDrillReport({
    executedAt: NOW,
    drills: [
      { id: 'migrations', status: 'pass', detail: '11 LF-only migrations verified' },
      { id: 'pg-e2e', status: null, detail: 'PostgreSQL 16/18 unavailable locally' }
    ]
  });
  assert.equal(report.overallStatus, 'pass');
  assert.equal(report.drills[1].status, null);

  const failedReport = buildRecoveryDrillReport({
    executedAt: NOW,
    drills: [
      { id: 'migrations', status: 'fail', detail: 'Tamper detected' }
    ]
  });
  assert.equal(failedReport.overallStatus, 'fail');
});

import crypto from 'node:crypto';
function awaitCrypto() {
  return crypto;
}
