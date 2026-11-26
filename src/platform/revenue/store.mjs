import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { fields, id as validateId } from '../contracts/validation.mjs';
import { withAuthenticatedTransaction } from '../identity/sessions.mjs';
import { withTransaction } from '../persistence/transaction.mjs';
import { buildRevenueLedgerEntry, summarizeRevenueByCurrency } from './ledger.mjs';

const fail = () => new Error('Revenue store operation failed');
const recordId = prefix => prefix + '-' + randomUUID();
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

/**
 * Creates a tenant-scoped PostgreSQL store for external statements and append-only revenue ledger entries.
 */
export function createRevenueLedgerStore(options) {
  fields(options, ['identity', 'appPool']);
  const { identity, appPool } = options;
  if (!appPool || typeof appPool.connect !== 'function') throw fail();

  const safe = work => async (...args) => {
    try {
      return await work(...args);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.startsWith('Invalid ') || error.message === 'Actual revenue requires statement')
      ) {
        throw error;
      }
      throw fail();
    }
  };

  return Object.freeze({
    recordStatement: safe(async (handle, input) => {
      fields(input, ['id', 'programmeId', 'statementDigest', 'recordedAt']);
      const statementId = validateId(input.id);
      const programmeId = validateId(input.programmeId);
      if (typeof input.statementDigest !== 'string' || !SHA256_PATTERN.test(input.statementDigest)) {
        throw new Error('Invalid statement digest');
      }
      const ms = typeof input.recordedAt === 'string' ? Date.parse(input.recordedAt) : NaN;
      if (!Number.isFinite(ms) || new Date(ms).toISOString() !== input.recordedAt) {
        throw new Error('Invalid revenue date');
      }

      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;

      const outcome = await withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId: recordId('rev-stmt') },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          const prog = (await tx.db.execute(sql`
            SELECT id FROM public.affiliate_programmes WHERE organization_id = ${organizationId} AND id = ${programmeId}
          `)).rows[0];
          if (!prog) return { ok: false, error: 'Invalid programme id' };

          await tx.db.execute(sql`
            INSERT INTO public.external_statements (organization_id, id, programme_id, statement_digest, recorded_at)
            VALUES (${organizationId}, ${statementId}, ${programmeId}, ${input.statementDigest}, ${input.recordedAt})
          `);
          return { ok: true };
        }
      );

      if (!outcome.ok) throw new Error(outcome.error);
      return Object.freeze({
        id: statementId,
        programmeId,
        statementDigest: input.statementDigest,
        recordedAt: input.recordedAt
      });
    }),

    appendLedgerEntry: safe(async (handle, input) => {
      const entry = buildRevenueLedgerEntry(input);
      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;

      const outcome = await withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId: recordId('rev-entry') },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          await tx.db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId}), hashtext(${entry.programmeId}))`);

          if (entry.reversesEntryId !== null) {
            const target = (await tx.db.execute(sql`
              SELECT id, entry_type, currency
              FROM public.revenue_ledger_entries
              WHERE organization_id = ${organizationId} AND id = ${entry.reversesEntryId}
            `)).rows[0];
            if (!target || target.entry_type !== entry.entryType || target.currency !== entry.currency) {
              return { ok: false, error: 'Invalid reversal target' };
            }
          }

          const metrics = {
            clicks: entry.clicks,
            conversions: entry.conversions,
            payoutMinor: entry.payoutMinor,
            commissionRateBps: entry.commissionRateBps
          };
          await tx.db.execute(sql`
            INSERT INTO public.revenue_ledger_entries (
              organization_id, id, programme_id, entry_type, entry_kind, reverses_entry_id,
              statement_id, statement_digest, currency, amount_minor, period_start, period_end, recorded_at, metrics
            )
            VALUES (
              ${organizationId}, ${entry.id}, ${entry.programmeId}, ${entry.entryType}, ${entry.entryKind}, ${entry.reversesEntryId},
              ${entry.statementId}, ${entry.statementDigest}, ${entry.currency}, ${entry.amountMinor},
              ${entry.periodStart}, ${entry.periodEnd}, ${entry.recordedAt}, ${JSON.stringify(metrics)}::jsonb
            )
          `);
          return { ok: true };
        }
      );

      if (!outcome.ok) throw new Error(outcome.error);
      return entry;
    }),

    listLedgerEntries: safe(async (handle, programmeId) => {
      const targetProgramme = validateId(programmeId);
      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;

      return withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId: recordId('rev-list') },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          const rows = (await tx.db.execute(sql`
            SELECT id, programme_id, entry_type, entry_kind, reverses_entry_id, statement_id, statement_digest,
              currency, amount_minor, period_start, period_end, recorded_at, metrics
            FROM public.revenue_ledger_entries
            WHERE organization_id = ${organizationId} AND programme_id = ${targetProgramme}
            ORDER BY recorded_at, id
            LIMIT 501
          `)).rows;

          return Object.freeze(
            rows.map(row => {
              const m = row.metrics ?? {};
              return buildRevenueLedgerEntry({
                id: row.id,
                programmeId: row.programme_id,
                entryType: row.entry_type,
                entryKind: row.entry_kind,
                reversesEntryId: row.reverses_entry_id,
                statementId: row.statement_id,
                statementDigest: row.statement_digest,
                currency: row.currency,
                amountMinor: Number(row.amount_minor),
                periodStart: new Date(row.period_start).toISOString(),
                periodEnd: new Date(row.period_end).toISOString(),
                recordedAt: new Date(row.recorded_at).toISOString(),
                clicks: m.clicks ?? null,
                conversions: m.conversions ?? null,
                payoutMinor: m.payoutMinor ?? null,
                commissionRateBps: m.commissionRateBps ?? null
              });
            })
          );
        }
      );
    }),

    summarizeProgrammeRevenue: safe(async (handle, programmeId) => {
      const targetProgramme = validateId(programmeId);
      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;

      const entries = await withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId: recordId('rev-sum') },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          const rows = (await tx.db.execute(sql`
            SELECT id, programme_id, entry_type, entry_kind, reverses_entry_id, statement_id, statement_digest,
              currency, amount_minor, period_start, period_end, recorded_at, metrics
            FROM public.revenue_ledger_entries
            WHERE organization_id = ${organizationId} AND programme_id = ${targetProgramme}
            ORDER BY recorded_at, id
            LIMIT 501
          `)).rows;

          return rows.map(row => {
            const m = row.metrics ?? {};
            return {
              id: row.id,
              programmeId: row.programme_id,
              entryType: row.entry_type,
              entryKind: row.entry_kind,
              reversesEntryId: row.reverses_entry_id,
              statementId: row.statement_id,
              statementDigest: row.statement_digest,
              currency: row.currency,
              amountMinor: Number(row.amount_minor),
              periodStart: new Date(row.period_start).toISOString(),
              periodEnd: new Date(row.period_end).toISOString(),
              recordedAt: new Date(row.recorded_at).toISOString(),
              clicks: m.clicks ?? null,
              conversions: m.conversions ?? null,
              payoutMinor: m.payoutMinor ?? null,
              commissionRateBps: m.commissionRateBps ?? null
            };
          });
        }
      );

      return summarizeRevenueByCurrency(entries);
    })
  });
}
