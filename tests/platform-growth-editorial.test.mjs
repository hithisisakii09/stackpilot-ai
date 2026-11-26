import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEditorialDraft,
  validateEditorialDraft
} from '../src/platform/growth/editorial.mjs';

const validInput = () => ({
  id: 'draft-crm-guide-v1',
  categoryId: 'cat-crm',
  title: 'CRM Evaluation Checklist for Agencies',
  status: 'draft',
  evidenceBindings: [
    {
      claimId: 'claim-hubspot-free-tier',
      status: 'approved',
      stale: false,
      revoked: false
    }
  ],
  spans: [
    {
      id: 'span-intro',
      kind: 'framing',
      text: 'Agencies evaluating CRM tools should confirm seat limits before migrating.',
      claimIds: []
    },
    {
      id: 'span-fact-1',
      kind: 'factual',
      text: 'Verified documentation confirms a documented starter tier.',
      claimIds: ['claim-hubspot-free-tier']
    }
  ]
});

test('buildEditorialDraft creates frozen internal draft bound to approved non-stale evidence', () => {
  const draft = buildEditorialDraft(validInput());
  assert.equal(draft.id, 'draft-crm-guide-v1');
  assert.equal(draft.status, 'draft');
  assert.equal(Object.isFrozen(draft), true);
  assert.deepEqual(draft.citedClaimIds, ['claim-hubspot-free-tier']);
  assert.deepEqual(validateEditorialDraft(draft), draft);
});

test('editorial draft rejects uncited factual spans', () => {
  const input = validInput();
  input.spans[1].claimIds = [];
  assert.throws(() => buildEditorialDraft(input), /Uncited factual span/);
});

test('editorial draft rejects factual spans citing unknown, unapproved, stale, or revoked evidence', () => {
  const unknown = validInput();
  unknown.spans[1].claimIds = ['claim-missing'];
  assert.throws(() => buildEditorialDraft(unknown), /Unverified evidence reference/);

  const unapproved = validInput();
  unapproved.evidenceBindings[0].status = 'candidate';
  assert.throws(() => buildEditorialDraft(unapproved), /Unverified evidence reference/);

  const stale = validInput();
  stale.evidenceBindings[0].stale = true;
  assert.throws(() => buildEditorialDraft(stale), /Unverified evidence reference/);

  const revoked = validInput();
  revoked.evidenceBindings[0].revoked = true;
  assert.throws(() => buildEditorialDraft(revoked), /Unverified evidence reference/);
});

test('editorial draft rejects non-draft status, Proxy/prototype payloads, and monetization fields', () => {
  const published = validInput();
  published.status = 'published';
  assert.throws(() => buildEditorialDraft(published), /Invalid editorial draft/);

  const proxied = new Proxy(validInput(), {});
  assert.throws(() => buildEditorialDraft(proxied), /Invalid editorial draft/);

  const proto = Object.create({ extra: 1 });
  Object.assign(proto, validInput());
  assert.throws(() => buildEditorialDraft(proto), /Invalid editorial draft/);

  const withAffiliate = validInput();
  withAffiliate.affiliateUrl = 'https://partner.example.com/ref';
  assert.throws(() => buildEditorialDraft(withAffiliate), /Commercial input is prohibited/);

  const withCommission = validInput();
  withCommission.spans[0].commissionNote = '20% revshare';
  assert.throws(() => buildEditorialDraft(withCommission), /Commercial input is prohibited/);
});
