import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { fields, id as validateId } from '../contracts/validation.mjs';
import { withAuthenticatedTransaction } from '../identity/sessions.mjs';
import { withTransaction } from '../persistence/transaction.mjs';
import {
  OWNER_GATED_STATES,
  applyPartnershipTransition
} from './lifecycle.mjs';

const fail = () => new Error('Partnership store operation failed');
const recordId = prefix => prefix + '-' + randomUUID();

/**
 * Creates a tenant-scoped PostgreSQL store for 12-step brand partnerships.
 */
export function createPartnershipStore(options) {
  fields(options, ['identity', 'appPool']);
  const { identity, appPool } = options;
  if (!appPool || typeof appPool.connect !== 'function') throw fail();

  const safe = work => async (...args) => {
    try {
      return await work(...args);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'Owner approval required' ||
          error.message === 'Independent owner approval required' ||
          error.message.startsWith('Invalid '))
      ) {
        throw error;
      }
      throw fail();
    }
  };

  return Object.freeze({
    createPartnership: safe(async (handle, input) => {
      fields(input, ['id', 'vendorId', 'occurredAt'], ['sourceUrl', 'now']);
      const partnershipId = validateId(input.id);
      const vendorId = validateId(input.vendorId);
      // Validate URL and date bounds via the lifecycle contract before any DB write.
      const checked = applyPartnershipTransition({
        from: 'rejected',
        to: 'discovered',
        actorRole: 'reviewer',
        actorId: 'system-check',
        sourceUrl: input.sourceUrl ?? null,
        occurredAt: input.occurredAt,
        ...(input.now !== undefined ? { now: input.now } : {})
      });

      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;

      const outcome = await withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId: recordId('partner-create') },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          await tx.db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId}), hashtext(${partnershipId}))`);

          const vendorRow = (await tx.db.execute(sql`
            SELECT id FROM public.vendors WHERE organization_id = ${organizationId} AND id = ${vendorId}
          `)).rows[0];
          if (!vendorRow) return { ok: false, error: 'Invalid partnership vendor' };

          const existing = (await tx.db.execute(sql`
            SELECT id FROM public.partnerships WHERE organization_id = ${organizationId} AND id = ${partnershipId}
          `)).rows[0];
          if (existing) return { ok: false, error: 'Invalid partnership conflict' };

          const proposal = {
            state: 'discovered',
            sourceUrl: checked.sourceUrl,
            createdBy: principal.userId,
            publicAffiliateUrl: null
          };
          await tx.db.execute(sql`
            INSERT INTO public.partnerships (organization_id, id, vendor_id, step, status, proposal)
            VALUES (${organizationId}, ${partnershipId}, ${vendorId}, 1, 'draft', ${JSON.stringify(proposal)}::jsonb)
          `);
          await tx.db.execute(sql`
            INSERT INTO public.partnership_events (organization_id, id, partnership_id, kind, evidence)
            VALUES (
              ${organizationId},
              ${recordId('pevt')},
              ${partnershipId},
              'discovered',
              ${JSON.stringify({
                seq: 1,
                from: null,
                to: 'discovered',
                step: 1,
                actorId: principal.userId,
                actorRole: principal.role,
                sourceUrl: checked.sourceUrl,
                occurredAt: checked.occurredAt,
                publicAffiliateUrl: null
              })}::jsonb
            )
          `);
          return { ok: true };
        }
      );

      if (!outcome.ok) throw new Error(outcome.error);
      return Object.freeze({
        id: partnershipId,
        vendorId,
        state: 'discovered',
        step: 1,
        publicAffiliateUrl: null
      });
    }),

    transitionPartnership: safe(async (handle, input) => {
      fields(input, ['partnershipId', 'to', 'occurredAt'], ['requesterId', 'sourceUrl', 'now']);
      const partnershipId = validateId(input.partnershipId);

      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;

      if ((OWNER_GATED_STATES.includes(input.to) || input.to === 'revoked') && principal.role !== 'owner') {
        throw new Error('Owner approval required');
      }
      if (OWNER_GATED_STATES.includes(input.to) || input.to === 'revoked') {
        await withAuthenticatedTransaction(identity, handle, true, async (_tx, caller) => caller);
      }

      const outcome = await withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId: recordId('partner-step') },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          await tx.db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId}), hashtext(${partnershipId}))`);

          const row = (await tx.db.execute(sql`
            SELECT id, vendor_id FROM public.partnerships WHERE organization_id = ${organizationId} AND id = ${partnershipId}
          `)).rows[0];
          if (!row) return { ok: false, error: 'Invalid partnership id' };

          const events = (await tx.db.execute(sql`
            SELECT evidence
            FROM public.partnership_events
            WHERE organization_id = ${organizationId} AND partnership_id = ${partnershipId}
            ORDER BY (evidence->>'seq')::integer DESC
            LIMIT 1
          `)).rows;
          if (events.length !== 1) return { ok: false, error: 'Invalid partnership state' };

          const latest = events[0].evidence;
          let next;
          try {
            next = applyPartnershipTransition({
              from: latest.to,
              to: input.to,
              actorRole: principal.role,
              actorId: principal.userId,
              requesterId: input.requesterId ?? latest.actorId ?? null,
              sourceUrl: input.sourceUrl ?? latest.sourceUrl ?? null,
              occurredAt: input.occurredAt,
              ...(input.now !== undefined ? { now: input.now } : {})
            });
          } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : 'Invalid partnership transition' };
          }

          const seq = Number(latest.seq) + 1;
          await tx.db.execute(sql`
            INSERT INTO public.partnership_events (organization_id, id, partnership_id, kind, evidence)
            VALUES (
              ${organizationId},
              ${recordId('pevt')},
              ${partnershipId},
              ${next.state},
              ${JSON.stringify({
                seq,
                from: latest.to,
                to: next.state,
                step: next.step,
                actorId: principal.userId,
                actorRole: principal.role,
                sourceUrl: next.sourceUrl,
                occurredAt: next.occurredAt,
                publicAffiliateUrl: null
              })}::jsonb
            )
          `);

          return {
            ok: true,
            value: Object.freeze({
              id: partnershipId,
              vendorId: row.vendor_id,
              state: next.state,
              step: next.step,
              publicAffiliateUrl: null
            })
          };
        }
      );

      if (!outcome.ok) throw new Error(outcome.error);
      return outcome.value;
    }),

    getPartnership: safe(async (handle, partnershipId) => {
      const targetId = validateId(partnershipId);
      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;

      return withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId: recordId('partner-get') },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          const row = (await tx.db.execute(sql`
            SELECT id, vendor_id FROM public.partnerships WHERE organization_id = ${organizationId} AND id = ${targetId}
          `)).rows[0];
          if (!row) return null;

          const latest = (await tx.db.execute(sql`
            SELECT evidence
            FROM public.partnership_events
            WHERE organization_id = ${organizationId} AND partnership_id = ${targetId}
            ORDER BY (evidence->>'seq')::integer DESC
            LIMIT 1
          `)).rows[0];

          return Object.freeze({
            id: row.id,
            vendorId: row.vendor_id,
            state: latest?.evidence?.to ?? 'discovered',
            step: latest?.evidence?.step ?? 1,
            publicAffiliateUrl: null
          });
        }
      );
    }),

    listPartnerships: safe(async handle => {
      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;

      return withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId: recordId('partner-list') },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          const rows = (await tx.db.execute(sql`
            SELECT p.id, p.vendor_id,
              (SELECT e.evidence FROM public.partnership_events e
               WHERE e.organization_id = p.organization_id AND e.partnership_id = p.id
               ORDER BY (e.evidence->>'seq')::integer DESC LIMIT 1) AS latest
            FROM public.partnerships p
            WHERE p.organization_id = ${organizationId}
            ORDER BY p.id
            LIMIT 201
          `)).rows;

          return Object.freeze(
            rows.map(row =>
              Object.freeze({
                id: row.id,
                vendorId: row.vendor_id,
                state: row.latest?.to ?? 'discovered',
                step: row.latest?.step ?? 1,
                publicAffiliateUrl: null
              })
            )
          );
        }
      );
    })
  });
}
