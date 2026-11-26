import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRevenueLedgerEntry,
  summarizeRevenueByCurrency
} from '../src/platform/revenue/ledger.mjs';

const NOW = '2026-11-26T12:00:00.000Z';
const DIGEST = 'a'.repeat(64);

test('builds forecast and statement-backed actual entries with integer minor units and explicit null metrics', () => {
  const forecast = buildRevenueLedgerEntry({
    id: 'rev-forecast-1',
    programmeId: 'prog-hubspot',
    entryType: 'forecast',
    entryKind: 'initial',
    currency: 'INR',
    amountMinor: 50000,
    periodStart: '2026-11-01T00:00:00.000Z',
    periodEnd: '2026-11-30T23:59:59.000Z',
    recordedAt: '2026-11-26T10:00:00.000Z',
    now: NOW
  });
  assert.equal(forecast.entryType, 'forecast');
  assert.equal(forecast.statementId, null);
  assert.equal(forecast.clicks, null);
  assert.equal(forecast.conversions, null);
  assert.equal(forecast.payoutMinor, null);
  assert.equal(forecast.commissionRateBps, null);

  const actualUsd = buildRevenueLedgerEntry({
    id: 'rev-actual-usd-1',
    programmeId: 'prog-hubspot',
    entryType: 'actual',
    entryKind: 'initial',
    statementId: 'stmt-2026-11',
    statementDigest: DIGEST,
    currency: 'USD',
    amountMinor: 12500,
    periodStart: '2026-11-01T00:00:00.000Z',
    periodEnd: '2026-11-25T23:59:59.000Z',
    recordedAt: '2026-11-26T10:00:00.000Z',
    clicks: 42,
    conversions: null,
    payoutMinor: null,
    commissionRateBps: 2000,
    now: NOW
  });

  const reversalUsd = buildRevenueLedgerEntry({
    id: 'rev-actual-usd-2',
    programmeId: 'prog-hubspot',
    entryType: 'actual',
    entryKind: 'reversal',
    reversesEntryId: 'rev-actual-usd-1',
    statementId: 'stmt-2026-11-adj',
    statementDigest: 'b'.repeat(64),
    currency: 'USD',
    amountMinor: -2500,
    periodStart: '2026-11-01T00:00:00.000Z',
    periodEnd: '2026-11-25T23:59:59.000Z',
    recordedAt: '2026-11-26T11:00:00.000Z',
    now: NOW
  });

  const summary = summarizeRevenueByCurrency([forecast, actualUsd, reversalUsd]);
  // Forecasts never roll into actualTotalsByCurrency; currencies never mix.
  assert.deepEqual(summary.actualTotalsByCurrency, { USD: 10000 });
  assert.deepEqual(summary.forecastTotalsByCurrency, { INR: 50000 });
});

test('fails closed on floating-point money, missing statement on actual, negative initial, future dates, and Proxy/prototype', () => {
  assert.throws(
    () => buildRevenueLedgerEntry({
      id: 'rev-bad-float',
      programmeId: 'prog-1',
      entryType: 'forecast',
      entryKind: 'initial',
      currency: 'USD',
      amountMinor: 12.34,
      periodStart: '2026-11-01T00:00:00.000Z',
      periodEnd: '2026-11-30T00:00:00.000Z',
      recordedAt: '2026-11-26T10:00:00.000Z',
      now: NOW
    }),
    /Invalid revenue amount/
  );

  assert.throws(
    () => buildRevenueLedgerEntry({
      id: 'rev-bad-actual',
      programmeId: 'prog-1',
      entryType: 'actual',
      entryKind: 'initial',
      currency: 'USD',
      amountMinor: 1000,
      periodStart: '2026-11-01T00:00:00.000Z',
      periodEnd: '2026-11-25T00:00:00.000Z',
      recordedAt: '2026-11-26T10:00:00.000Z',
      now: NOW
    }),
    /Actual revenue requires statement/
  );

  assert.throws(
    () => buildRevenueLedgerEntry({
      id: 'rev-bad-neg',
      programmeId: 'prog-1',
      entryType: 'forecast',
      entryKind: 'initial',
      currency: 'USD',
      amountMinor: -100,
      periodStart: '2026-11-01T00:00:00.000Z',
      periodEnd: '2026-11-25T00:00:00.000Z',
      recordedAt: '2026-11-26T10:00:00.000Z',
      now: NOW
    }),
    /Invalid revenue amount/
  );

  assert.throws(
    () => buildRevenueLedgerEntry({
      id: 'rev-bad-future',
      programmeId: 'prog-1',
      entryType: 'forecast',
      entryKind: 'initial',
      currency: 'USD',
      amountMinor: 100,
      periodStart: '2026-11-01T00:00:00.000Z',
      periodEnd: '2026-11-25T00:00:00.000Z',
      recordedAt: '2026-11-27T00:00:00.000Z',
      now: NOW
    }),
    /Invalid revenue date/
  );

  assert.throws(
    () => buildRevenueLedgerEntry(new Proxy({
      id: 'rev-proxy',
      programmeId: 'prog-1',
      entryType: 'forecast',
      entryKind: 'initial',
      currency: 'USD',
      amountMinor: 100,
      periodStart: '2026-11-01T00:00:00.000Z',
      periodEnd: '2026-11-25T00:00:00.000Z',
      recordedAt: '2026-11-26T10:00:00.000Z',
      now: NOW
    }, {})),
    /Invalid revenue input/
  );
});
