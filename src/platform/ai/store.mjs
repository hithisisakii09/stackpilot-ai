import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { fields } from '../contracts/validation.mjs';
import { withAuthenticatedTransaction } from '../identity/sessions.mjs';
import { withTransaction } from '../persistence/transaction.mjs';
import { routeAiRequest } from './router.mjs';

const fail = () => new Error('AI router store operation failed');
const recordId = prefix => prefix + '-' + randomUUID();

/**
 * Creates a tenant-scoped PostgreSQL store for zero-cost AI routing decisions and telemetry.
 */
export function createAiRouterStore(options) {
  fields(options, ['identity', 'appPool']);
  const { identity, appPool } = options;
  if (!appPool || typeof appPool.connect !== 'function') throw fail();

  const safe = work => async (...args) => {
    try {
      return await work(...args);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.startsWith('budget_violation') ||
          error.message.startsWith('secret_detected') ||
          error.message.startsWith('Invalid '))
      ) {
        throw error;
      }
      throw fail();
    }
  };

  return Object.freeze({
    routeAndRecord: safe(async (handle, input) => {
      const decision = routeAiRequest(input);
      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;
      const requestId = recordId('ai-route');
      const eventId = recordId('aievt');
      const action = decision.allowed ? 'ai-routing-decision' : 'ai-routing-denial';
      const targetId = decision.selectedModelId ?? decision.denialReason;

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
              ${action},
              ${targetId},
              ${JSON.stringify({
                allowed: decision.allowed,
                denialReason: decision.denialReason,
                telemetry: decision.telemetry
              })}::jsonb
            )
          `);
        }
      );

      return decision;
    }),

    listRoutingTelemetry: safe(async handle => {
      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;

      return withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId: recordId('ai-list') },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          const rows = (await tx.db.execute(sql`
            SELECT id, action, target_id, data
            FROM public.audit_events
            WHERE organization_id = ${organizationId}
              AND action IN ('ai-routing-decision', 'ai-routing-denial')
            ORDER BY created_at, id
            LIMIT 201
          `)).rows;

          return Object.freeze(
            rows.map(row =>
              Object.freeze({
                id: row.id,
                action: row.action,
                targetId: row.target_id,
                allowed: row.data?.allowed ?? false,
                denialReason: row.data?.denialReason ?? null,
                telemetry: row.data?.telemetry ?? null
              })
            )
          );
        }
      );
    })
  });
}
