import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCiHealth,
  triageRegression,
  validateEngineeringProposal
} from '../src/platform/engineering/intelligence.mjs';

const NOW = '2026-11-26T12:00:00.000Z';

test('evaluateCiHealth computes deterministic status and preserves null for uncollected metrics', () => {
  const healthy = evaluateCiHealth({
    unitPassed: 809,
    unitFailed: 0,
    unitSkipped: 0,
    integrationPassed: null,
    integrationFailed: null,
    migrationCrlfCount: 0,
    auditHighCriticalCount: 0,
    preflightViolations: 0,
    builtRoutes: 28,
    collectedAt: '2026-11-26T11:50:00.000Z',
    now: NOW
  });
  assert.equal(healthy.status, 'healthy');
  assert.equal(healthy.metrics.integrationPassed, null);
  assert.equal(healthy.metrics.integrationFailed, null);

  const blocked = evaluateCiHealth({
    unitPassed: 808,
    unitFailed: 1,
    unitSkipped: 0,
    integrationPassed: 14,
    integrationFailed: 0,
    migrationCrlfCount: 1,
    auditHighCriticalCount: 0,
    preflightViolations: 0,
    builtRoutes: 28,
    collectedAt: '2026-11-26T11:50:00.000Z',
    now: NOW
  });
  assert.equal(blocked.status, 'blocked');
  assert.ok(blocked.findings.some(f => f.category === 'migration_drift'));
  assert.ok(blocked.findings.some(f => f.category === 'test_failure'));
});

test('triageRegression classifies exact deltas and emits strictly advisory remediation plans', () => {
  const triage = triageRegression({
    baseline: {
      unitPassed: 809,
      unitFailed: 0,
      unitSkipped: 0,
      integrationPassed: 15,
      integrationFailed: 0,
      migrationCrlfCount: 0,
      auditHighCriticalCount: 0,
      preflightViolations: 0,
      builtRoutes: 28,
      collectedAt: '2026-11-26T10:00:00.000Z',
      now: NOW
    },
    candidate: {
      unitPassed: 808,
      unitFailed: 1,
      unitSkipped: 0,
      integrationPassed: 14,
      integrationFailed: 1,
      migrationCrlfCount: 0,
      auditHighCriticalCount: 2,
      preflightViolations: 1,
      builtRoutes: 28,
      collectedAt: '2026-11-26T11:30:00.000Z',
      now: NOW
    }
  });

  assert.equal(triage.advisoryOnly, true);
  assert.equal(triage.autoApplyPermitted, false);
  assert.deepEqual(triage.classifications, ['leakage_violation', 'security_audit', 'test_failure']);
  assert.equal(triage.deltas.unitFailedDelta, 1);
  assert.equal(triage.deltas.auditHighCriticalDelta, 2);
});

test('validateEngineeringProposal enforces independent owner approval and rejects Proxy/future dates', () => {
  const approved = validateEngineeringProposal({
    id: 'prop-dep-update-1',
    actionType: 'dependency_update',
    summary: 'Advisory proposal to review astro patch release.',
    actorRole: 'owner',
    actorId: 'owner-1',
    requesterId: 'agent-1',
    proposedAt: '2026-11-26T11:00:00.000Z',
    now: NOW
  });
  assert.equal(approved.approved, true);

  for (const badRole of ['reviewer', 'agent']) {
    assert.throws(
      () => validateEngineeringProposal({
        id: 'prop-1',
        actionType: 'schema_migration_proposal',
        summary: 'Propose migration.',
        actorRole: badRole,
        actorId: badRole + '-1',
        requesterId: 'agent-2',
        proposedAt: '2026-11-26T11:00:00.000Z',
        now: NOW
      }),
      /Owner approval required/
    );
  }

  assert.throws(
    () => validateEngineeringProposal({
      id: 'prop-2',
      actionType: 'release_gate_override',
      summary: 'Self-approval attempt.',
      actorRole: 'owner',
      actorId: 'owner-1',
      requesterId: 'owner-1',
      proposedAt: '2026-11-26T11:00:00.000Z',
      now: NOW
    }),
    /Independent owner approval required/
  );

  assert.throws(
    () => validateEngineeringProposal(new Proxy({
      id: 'prop-3',
      actionType: 'dependency_update',
      summary: 'Proxy test',
      actorRole: 'owner',
      actorId: 'owner-1',
      requesterId: 'agent-1',
      proposedAt: '2026-11-26T11:00:00.000Z',
      now: NOW
    }, {})),
    /Invalid engineering input/
  );
});
