import test from 'node:test';
import assert from 'node:assert/strict';
import { createPartnershipStore } from '../src/platform/partnerships/store.mjs';
import { createRevenueLedgerStore } from '../src/platform/revenue/store.mjs';
import { auditLocalControlPlaneExport } from '../src/lib/local-control-plane-export.mjs';

const fakeIdentity = {};
const fakeAppPool = { connect: async () => { throw new Error('Should not connect'); } };

test('partnership and revenue stores validate options and reject unsafe/Proxy/invalid inputs before DB access', async () => {
  assert.throws(() => createPartnershipStore({}), /Invalid platform contract/);
  assert.throws(() => createRevenueLedgerStore({}), /Invalid platform contract/);
  assert.throws(() => createPartnershipStore({ identity: fakeIdentity, appPool: null }), /Partnership store operation failed/);
  assert.throws(() => createRevenueLedgerStore({ identity: fakeIdentity, appPool: null }), /Revenue store operation failed/);

  const partnerships = createPartnershipStore({ identity: fakeIdentity, appPool: fakeAppPool });
  const revenue = createRevenueLedgerStore({ identity: fakeIdentity, appPool: fakeAppPool });
  const fakeHandle = Object.freeze(Object.create(null));

  await assert.rejects(
    () => partnerships.createPartnership(fakeHandle, new Proxy({ id: 'p-1', vendorId: 'v-1', occurredAt: '2026-11-26T10:00:00.000Z' }, {})),
    /Invalid platform contract/
  );

  await assert.rejects(
    () => partnerships.createPartnership(fakeHandle, {
      id: 'partner-1',
      vendorId: 'vendor-1',
      sourceUrl: 'http://insecure.example.com',
      occurredAt: '2026-11-26T10:00:00.000Z'
    }),
    /Invalid partnership URL/
  );

  await assert.rejects(
    () => partnerships.createPartnership(fakeHandle, {
      id: 'partner-1',
      vendorId: 'vendor-1',
      sourceUrl: 'https://vendor.example.com/partners',
      occurredAt: '2026-11-26T10:00:00.000Z',
      now: '2026-11-26T12:00:00.000Z'
    }),
    /Partnership store operation failed/
  );

  await assert.rejects(
    () => revenue.appendLedgerEntry(fakeHandle, {
      id: 'rev-1',
      programmeId: 'prog-1',
      entryType: 'actual',
      entryKind: 'initial',
      currency: 'USD',
      amountMinor: 1000,
      periodStart: '2026-11-01T00:00:00.000Z',
      periodEnd: '2026-11-25T00:00:00.000Z',
      recordedAt: '2026-11-26T10:00:00.000Z',
      now: '2026-11-26T12:00:00.000Z'
    }),
    /Actual revenue requires statement/
  );

  await assert.rejects(
    () => revenue.appendLedgerEntry(fakeHandle, {
      id: 'rev-2',
      programmeId: 'prog-1',
      entryType: 'forecast',
      entryKind: 'initial',
      currency: 'USD',
      amountMinor: 1000,
      periodStart: '2026-11-01T00:00:00.000Z',
      periodEnd: '2026-11-25T00:00:00.000Z',
      recordedAt: '2026-11-26T10:00:00.000Z',
      now: '2026-11-26T12:00:00.000Z'
    }),
    /Revenue store operation failed/
  );
});

test('auditLocalControlPlaneExport blocks Phase 6 partnership and revenue-ledger paths and markers in dist', () => {
  for (const marker of [
    'createPartnershipStore',
    'createRevenueLedgerStore',
    'validatePartnershipTransition',
    'applyPartnershipTransition',
    'buildRevenueLedgerEntry',
    'summarizeRevenueByCurrency',
    'owner_application_approved',
    'owner_activation_approved'
  ]) {
    const res = auditLocalControlPlaneExport([{ path: 'assets/app.js', content: `export const x = "${marker}";` }]);
    assert.equal(res.violations.length, 1);
  }
  for (const path of [
    'platform/partnerships/store.mjs',
    'platform/revenue/ledger.mjs',
    'revenue_ledger_entries/index.html',
    'external_statements/data.json',
    'commission_records/data.json'
  ]) {
    const res = auditLocalControlPlaneExport([{ path, content: 'ok' }]);
    assert.equal(res.violations.length, 1);
  }
});
