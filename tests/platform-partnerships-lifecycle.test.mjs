import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PARTNERSHIP_STEPS,
  PARTNERSHIP_OFF_RAMPS,
  OWNER_GATED_STATES,
  stepNumberForState,
  validatePartnershipTransition,
  applyPartnershipTransition
} from '../src/platform/partnerships/lifecycle.mjs';

const NOW = '2026-11-26T12:00:00.000Z';

test('12 ordered partnership states and owner-gated steps are defined', () => {
  assert.equal(PARTNERSHIP_STEPS.length, 12);
  assert.equal(PARTNERSHIP_STEPS[0], 'discovered');
  assert.equal(PARTNERSHIP_STEPS[11], 'active');
  assert.deepEqual(PARTNERSHIP_OFF_RAMPS, ['rejected', 'paused', 'revoked']);
  assert.deepEqual(OWNER_GATED_STATES, ['owner_application_approved', 'owner_activation_approved']);
  assert.equal(stepNumberForState('discovered'), 1);
  assert.equal(stepNumberForState('active'), 12);
});

test('full 12-step progression succeeds when owner approves gated steps', () => {
  let state = 'discovered';
  for (let i = 1; i < PARTNERSHIP_STEPS.length; i++) {
    const to = PARTNERSHIP_STEPS[i];
    const actorRole = OWNER_GATED_STATES.includes(to) ? 'owner' : 'reviewer';
    const next = applyPartnershipTransition({
      from: state,
      to,
      actorRole,
      actorId: actorRole === 'owner' ? 'owner-1' : 'reviewer-1',
      requesterId: 'agent-1',
      sourceUrl: 'https://vendor.example.com/partners',
      occurredAt: '2026-11-26T11:00:00.000Z',
      now: NOW
    });
    assert.equal(next.state, to);
    assert.equal(next.step, i + 1);
    assert.equal(next.publicAffiliateUrl, null);
    state = next.state;
  }
  assert.equal(state, 'active');
});

test('fails closed on skipped steps, unauthorized owner gates, and invalid off-ramp transitions', () => {
  assert.throws(
    () => validatePartnershipTransition({
      from: 'discovered',
      to: 'requirements_checked',
      actorRole: 'reviewer',
      actorId: 'reviewer-1',
      occurredAt: '2026-11-26T11:00:00.000Z',
      now: NOW
    }),
    /Invalid partnership transition/
  );

  for (const gated of OWNER_GATED_STATES) {
    const prev = PARTNERSHIP_STEPS[PARTNERSHIP_STEPS.indexOf(gated) - 1];
    for (const badRole of ['reviewer', 'agent']) {
      assert.throws(
        () => validatePartnershipTransition({
          from: prev,
          to: gated,
          actorRole: badRole,
          actorId: badRole + '-1',
          occurredAt: '2026-11-26T11:00:00.000Z',
          now: NOW
        }),
        /Owner approval required/
      );
    }
    assert.throws(
      () => validatePartnershipTransition({
        from: prev,
        to: gated,
        actorRole: 'owner',
        actorId: 'owner-1',
        requesterId: 'owner-1',
        occurredAt: '2026-11-26T11:00:00.000Z',
        now: NOW
      }),
      /Independent owner approval required/
    );
  }

  // Revoked is terminal (cannot re-open directly)
  assert.throws(
    () => validatePartnershipTransition({
      from: 'revoked',
      to: 'discovered',
      actorRole: 'owner',
      actorId: 'owner-1',
      occurredAt: '2026-11-26T11:00:00.000Z',
      now: NOW
    }),
    /Invalid partnership transition/
  );

  // Rejected / paused can reset explicitly to discovered
  const reset = applyPartnershipTransition({
    from: 'rejected',
    to: 'discovered',
    actorRole: 'reviewer',
    actorId: 'reviewer-1',
    occurredAt: '2026-11-26T11:00:00.000Z',
    now: NOW
  });
  assert.equal(reset.state, 'discovered');
  assert.equal(reset.step, 1);
});

test('rejects future/impossible dates, non-HTTPS/tracking URLs, Proxy, prototypes, and undeclared fields', () => {
  assert.throws(
    () => validatePartnershipTransition({
      from: 'discovered',
      to: 'program_verified',
      actorRole: 'reviewer',
      actorId: 'reviewer-1',
      occurredAt: '2026-11-27T00:00:00.000Z',
      now: NOW
    }),
    /Invalid partnership date/
  );

  assert.throws(
    () => validatePartnershipTransition({
      from: 'discovered',
      to: 'program_verified',
      actorRole: 'reviewer',
      actorId: 'reviewer-1',
      sourceUrl: 'http://vendor.example.com/partners',
      occurredAt: '2026-11-26T11:00:00.000Z',
      now: NOW
    }),
    /Invalid partnership URL/
  );

  assert.throws(
    () => validatePartnershipTransition({
      from: 'discovered',
      to: 'program_verified',
      actorRole: 'reviewer',
      actorId: 'reviewer-1',
      sourceUrl: 'https://vendor.example.com/partners?ref=abc',
      occurredAt: '2026-11-26T11:00:00.000Z',
      now: NOW
    }),
    /Invalid partnership URL/
  );

  assert.throws(
    () => validatePartnershipTransition(new Proxy({
      from: 'discovered',
      to: 'program_verified',
      actorRole: 'reviewer',
      actorId: 'reviewer-1',
      occurredAt: '2026-11-26T11:00:00.000Z',
      now: NOW
    }, {})),
    /Invalid partnership input/
  );

  assert.throws(
    () => validatePartnershipTransition({
      from: 'discovered',
      to: 'program_verified',
      actorRole: 'reviewer',
      actorId: 'reviewer-1',
      occurredAt: '2026-11-26T11:00:00.000Z',
      now: NOW,
      publicAffiliateUrl: 'https://ref.example.com'
    }),
    /Invalid partnership input/
  );
});
