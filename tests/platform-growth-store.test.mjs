import test from 'node:test';
import assert from 'node:assert/strict';
import { createEditorialGrowthStore } from '../src/platform/growth/store.mjs';
import { auditLocalControlPlaneExport } from '../src/lib/local-control-plane-export.mjs';

const fakeIdentity = {};
const fakeAppPool = { connect: async () => { throw new Error('Should not connect'); } };

test('createEditorialGrowthStore validates options and rejects invalid/Proxy/commercial inputs before DB access', async () => {
  assert.throws(() => createEditorialGrowthStore({}), /Invalid platform contract/);
  assert.throws(() => createEditorialGrowthStore({ identity: fakeIdentity, appPool: null }), /Growth store operation failed/);

  const store = createEditorialGrowthStore({ identity: fakeIdentity, appPool: fakeAppPool });
  const fakeHandle = Object.freeze(Object.create(null));

  await assert.rejects(
    () => store.saveKeywordClusters(fakeHandle, new Proxy([], {})),
    /Invalid keyword cluster list/
  );

  await assert.rejects(
    () => store.saveKeywordClusters(fakeHandle, [
      { name: 'CRM', affiliateUrl: 'https://example.com', phrases: [{ phrase: 'crm' }] }
    ]),
    /Commercial input is prohibited/
  );

  await assert.rejects(
    () => store.saveEditorialDraft(fakeHandle, {
      id: 'draft-1',
      categoryId: 'cat-crm',
      title: 'Uncited',
      status: 'draft',
      evidenceBindings: [],
      spans: [{ id: 'span-1', kind: 'factual', text: 'Uncited claim', claimIds: [] }]
    }),
    /Uncited factual span/
  );

  await assert.rejects(
    () => store.saveEditorialDraft(fakeHandle, {
      id: 'draft-2',
      categoryId: 'cat-crm',
      title: 'Commission',
      status: 'draft',
      commissionRate: 0.25,
      evidenceBindings: [],
      spans: [{ id: 'span-1', kind: 'framing', text: 'Framing', claimIds: [] }]
    }),
    /Commercial input is prohibited/
  );

  await assert.rejects(
    () => store.saveEditorialDraft(fakeHandle, {
      id: 'draft-3',
      categoryId: 'cat-crm',
      title: 'Unapproved Evidence',
      status: 'draft',
      evidenceBindings: [{ claimId: 'claim-unapproved', status: 'candidate', stale: false, revoked: false }],
      spans: [{ id: 'span-1', kind: 'factual', text: 'Fact', claimIds: ['claim-unapproved'] }]
    }),
    /Unverified evidence reference: claim-unapproved/
  );

  await assert.rejects(
    () => store.saveEditorialDraft(fakeHandle, {
      id: 'draft-4',
      categoryId: 'cat-crm',
      title: 'Sanitized Auth Failure',
      status: 'draft',
      evidenceBindings: [{ claimId: 'claim-approved', status: 'approved', stale: false, revoked: false }],
      spans: [{ id: 'span-1', kind: 'factual', text: 'Fact', claimIds: ['claim-approved'] }]
    }),
    /Growth store operation failed/
  );
});

test('auditLocalControlPlaneExport blocks Phase 5B keyword, editorial, and growth-store markers in dist', () => {
  for (const marker of [
    'normalizeKeywordClusterInput',
    'buildEditorialDraft',
    'createEditorialGrowthStore',
    'stackpilot-editorial-draft-v1'
  ]) {
    const result = auditLocalControlPlaneExport([{ path: 'assets/app.js', content: `export const x = "${marker}";` }]);
    assert.equal(result.violations.length, 1);
  }
  for (const path of ['keyword_clusters/index.html', 'content_versions/data.json', 'platform/growth/store.mjs']) {
    const result = auditLocalControlPlaneExport([{ path, content: 'ok' }]);
    assert.equal(result.violations.length, 1);
  }
});
