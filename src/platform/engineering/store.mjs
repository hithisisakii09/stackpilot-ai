import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { fields } from '../contracts/validation.mjs';
import { withAuthenticatedTransaction } from '../identity/sessions.mjs';
import { withTransaction } from '../persistence/transaction.mjs';
import {
  evaluateCiHealth,
  triageRegression,
  validateEngineeringProposal
} from './intelligence.mjs';

const fail = () => new Error('Engineering store operation failed');
const recordId = prefix => prefix + '-' + randomUUID();

/**
 * Creates a tenant-scoped PostgreSQL store for CI health diagnostics, regression triage, and owner-gated proposals.
 */
export function createEngineeringIntelligenceStore(options) {
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
    recordHealthReport: safe(async (handle, input) => {
      const report = evaluateCiHealth(input);
      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;
      const requestId = recordId('eng-health');
      const eventId = recordId('engevt');

      await withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          await tx.db.execute(sql`
            INSERT INTO public.audit_events (organization_id, id, actor_id, request_id, action, target_id, data)
            VALUES (
              ${organizationId},
              ${eventId},
              ${principal.userId},
              ${requestId},
              'engineering-health-report',
              ${report.status},
              ${JSON.stringify(report)}::jsonb
            )
          `);
        }
      );

      return report;
    }),

    recordRegressionTriage: safe(async (handle, input) => {
      const triage = triageRegression(input);
      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;
      const requestId = recordId('eng-triage');
      const eventId = recordId('engevt');

      await withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          await tx.db.execute(sql`
            INSERT INTO public.audit_events (organization_id, id, actor_id, request_id, action, target_id, data)
            VALUES (
              ${organizationId},
              ${eventId},
              ${principal.userId},
              ${requestId},
              'engineering-regression-triage',
              ${triage.candidateStatus},
              ${JSON.stringify(triage)}::jsonb
            )
          `);
        }
      );

      return triage;
    }),

    approveEngineeringProposal: safe(async (handle, input) => {
      fields(input, ['id', 'actionType', 'summary', 'requesterId', 'proposedAt'], ['now']);
      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      if (principal.role !== 'owner') {
        throw new Error('Owner approval required');
      }
      await withAuthenticatedTransaction(identity, handle, true, async (_tx, caller) => caller);

      const proposal = validateEngineeringProposal({
        id: input.id,
        actionType: input.actionType,
        summary: input.summary,
        actorRole: principal.role,
        actorId: principal.userId,
        requesterId: input.requesterId,
        proposedAt: input.proposedAt,
        ...(input.now !== undefined ? { now: input.now } : {})
      });

      const organizationId = principal.organizationId;
      const requestId = recordId('eng-prop');
      const eventId = recordId('engevt');

      await withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          await tx.db.execute(sql`
            INSERT INTO public.audit_events (organization_id, id, actor_id, request_id, action, target_id, data)
            VALUES (
              ${organizationId},
              ${eventId},
              ${principal.userId},
              ${requestId},
              'engineering-action-approval',
              ${proposal.id},
              ${JSON.stringify(proposal)}::jsonb
            )
          `);
        }
      );

      return proposal;
    }),

    listEngineeringRecords: safe(async handle => {
      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;

      return withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId: recordId('eng-list') },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          const rows = (await tx.db.execute(sql`
            SELECT id, action, target_id, data
            FROM public.audit_events
            WHERE organization_id = ${organizationId}
              AND action IN ('engineering-health-report', 'engineering-regression-triage', 'engineering-action-approval')
            ORDER BY created_at, id
            LIMIT 201
          `)).rows;

          return Object.freeze(
            rows.map(row =>
              Object.freeze({
                id: row.id,
                action: row.action,
                targetId: row.target_id,
                data: row.data
              })
            )
          );
        }
      );
    })
  });
}
