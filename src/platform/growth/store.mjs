import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { fields, id as validateId } from '../contracts/validation.mjs';
import { withAuthenticatedTransaction } from '../identity/sessions.mjs';
import { withTransaction } from '../persistence/transaction.mjs';
import { inspectClaimLifecycle } from '../products/claims.mjs';
import { deduplicateKeywordClusters } from './keywords.mjs';
import { buildEditorialDraft } from './editorial.mjs';

const fail = () => new Error('Growth store operation failed');
const recordId = prefix => prefix + '-' + randomUUID();

async function verifyApprovedClaims(controlTx, organizationId, citedClaimIds) {
  for (const claimId of citedClaimIds) {
    const latest = (await controlTx.db.execute(sql`
      SELECT agent_id
      FROM public.claim_lifecycle_events
      WHERE organization_id = ${organizationId} AND claim_id = ${claimId}
      ORDER BY version DESC
      LIMIT 1
    `)).rows[0];
    if (!latest) return false;
    const state = await inspectClaimLifecycle(controlTx, claimId, latest.agent_id);
    if (state.effective.status !== 'approved') {
      return false;
    }
  }
  return true;
}

/**
 * Creates a tenant-scoped PostgreSQL store for Phase 5B keyword clusters
 * and evidence-bound internal editorial drafts.
 */
export function createEditorialGrowthStore(options) {
  fields(options, ['identity', 'appPool']);
  const { identity, appPool } = options;
  if (!appPool || typeof appPool.connect !== 'function') throw fail();

  const safe = work => async (...args) => {
    try {
      return await work(...args);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'Commercial input is prohibited' ||
          error.message === 'Uncited factual span is prohibited' ||
          error.message.startsWith('Unverified evidence reference') ||
          error.message.startsWith('Invalid '))
      ) {
        throw error;
      }
      throw fail();
    }
  };

  return Object.freeze({
    saveKeywordClusters: safe(async (handle, inputs) => {
      const clusters = deduplicateKeywordClusters(inputs);
      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;

      return withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId: recordId('growth-kw') },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          await tx.db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId}), hashtext('growth-keywords-v1'))`);

          const saved = [];
          for (const cluster of clusters) {
            const existingCluster = (await tx.db.execute(sql`
              SELECT id, name, intent
              FROM public.keyword_clusters
              WHERE organization_id = ${organizationId} AND id = ${cluster.id}
            `)).rows[0];

            if (!existingCluster) {
              await tx.db.execute(sql`
                INSERT INTO public.keyword_clusters (organization_id, id, name, intent)
                VALUES (${organizationId}, ${cluster.id}, ${cluster.name}, ${cluster.intent})
              `);
            } else if (existingCluster.intent !== cluster.intent) {
              throw new Error('Invalid keyword cluster conflict');
            }

            for (const entry of cluster.phrases) {
              const existingKeyword = (await tx.db.execute(sql`
                SELECT id, cluster_id
                FROM public.keywords
                WHERE organization_id = ${organizationId} AND id = ${entry.id}
              `)).rows[0];

              if (!existingKeyword) {
                const evidence = {
                  clusterKey: cluster.clusterKey,
                  volume: entry.volume,
                  difficulty: entry.difficulty,
                  cpc: entry.cpc
                };
                await tx.db.execute(sql`
                  INSERT INTO public.keywords (organization_id, id, cluster_id, phrase, evidence)
                  VALUES (${organizationId}, ${entry.id}, ${cluster.id}, ${entry.phrase}, ${JSON.stringify(evidence)}::jsonb)
                `);
              } else if (existingKeyword.cluster_id !== cluster.id) {
                throw new Error('Invalid keyword cluster conflict');
              }
            }
            saved.push(cluster);
          }
          return Object.freeze({ organizationId, clusters: Object.freeze(saved) });
        }
      );
    }),

    listKeywordClusters: safe(async handle => {
      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;

      return withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId: recordId('growth-kw-list') },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          const clusterRows = (await tx.db.execute(sql`
            SELECT id, name, intent
            FROM public.keyword_clusters
            WHERE organization_id = ${organizationId}
            ORDER BY id
            LIMIT 201
          `)).rows;
          const keywordRows = (await tx.db.execute(sql`
            SELECT id, cluster_id, phrase, evidence
            FROM public.keywords
            WHERE organization_id = ${organizationId}
            ORDER BY phrase
            LIMIT 1001
          `)).rows;

          const byCluster = new Map();
          for (const row of clusterRows) {
            byCluster.set(row.id, { id: row.id, name: row.name, intent: row.intent, phrases: [] });
          }
          for (const row of keywordRows) {
            const target = byCluster.get(row.cluster_id);
            if (!target) continue;
            const ev = row.evidence ?? {};
            target.phrases.push(Object.freeze({
              id: row.id,
              phrase: row.phrase,
              volume: ev.volume ?? null,
              difficulty: ev.difficulty ?? null,
              cpc: ev.cpc ?? null
            }));
          }
          return Object.freeze(
            [...byCluster.values()].map(c =>
              Object.freeze({ id: c.id, name: c.name, intent: c.intent, phrases: Object.freeze(c.phrases) })
            )
          );
        }
      );
    }),

    saveEditorialDraft: safe(async (handle, input) => {
      const draft = buildEditorialDraft(input);
      const auth = await withAuthenticatedTransaction(identity, handle, false, async (controlTx, caller) => {
        const verified = await verifyApprovedClaims(controlTx, caller.organizationId, draft.citedClaimIds);
        return { caller, verified };
      });
      if (!auth.verified) throw new Error('Unverified evidence reference');
      const principal = auth.caller;
      const organizationId = principal.organizationId;

      return withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId: recordId('growth-draft') },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          await tx.db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId}), hashtext('growth-editorial-v1'))`);

          const categoryExists = (await tx.db.execute(sql`
            SELECT id FROM public.categories WHERE organization_id = ${organizationId} AND id = ${draft.categoryId}
          `)).rows.length === 1;
          if (!categoryExists) throw new Error('Invalid editorial draft');

          const existingContent = (await tx.db.execute(sql`
            SELECT id, category_id, status
            FROM public.content
            WHERE organization_id = ${organizationId} AND id = ${draft.id}
          `)).rows[0];

          if (!existingContent) {
            await tx.db.execute(sql`
              INSERT INTO public.content (organization_id, id, category_id, title, status)
              VALUES (${organizationId}, ${draft.id}, ${draft.categoryId}, ${draft.title}, 'draft')
            `);
          } else if (existingContent.category_id !== draft.categoryId || existingContent.status !== 'draft') {
            throw new Error('Invalid editorial draft');
          }

          const maxVersionRow = (await tx.db.execute(sql`
            SELECT COALESCE(MAX(version), 0) AS max_version
            FROM public.content_versions
            WHERE organization_id = ${organizationId} AND content_id = ${draft.id}
          `)).rows[0];
          const version = Number(maxVersionRow.max_version) + 1;
          const versionId = recordId('draftver');
          const body = JSON.stringify({
            schema: 'stackpilot-editorial-draft-v1',
            spans: draft.spans,
            evidenceBindings: draft.evidenceBindings,
            citedClaimIds: draft.citedClaimIds
          });

          await tx.db.execute(sql`
            INSERT INTO public.content_versions (organization_id, id, content_id, version, body, status)
            VALUES (${organizationId}, ${versionId}, ${draft.id}, ${version}, ${body}, 'draft')
          `);

          for (const claimId of draft.citedClaimIds) {
            await tx.db.execute(sql`
              INSERT INTO public.content_claims (organization_id, id, version_id, claim_id)
              VALUES (${organizationId}, ${recordId('cclaim')}, ${versionId}, ${claimId})
            `);
          }

          return Object.freeze({
            id: draft.id,
            versionId,
            version,
            categoryId: draft.categoryId,
            title: draft.title,
            status: 'draft',
            citedClaimIds: draft.citedClaimIds
          });
        }
      );
    }),

    getEditorialDraft: safe(async (handle, contentId) => {
      const targetId = validateId(contentId);
      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;

      return withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId: recordId('growth-draft-get') },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          const contentRow = (await tx.db.execute(sql`
            SELECT id, category_id, title, status
            FROM public.content
            WHERE organization_id = ${organizationId} AND id = ${targetId}
          `)).rows[0];
          if (!contentRow) return null;

          const versionRow = (await tx.db.execute(sql`
            SELECT id, version, body, status
            FROM public.content_versions
            WHERE organization_id = ${organizationId} AND content_id = ${targetId}
            ORDER BY version DESC
            LIMIT 1
          `)).rows[0];
          if (!versionRow) return null;

          const parsed = JSON.parse(versionRow.body);
          return Object.freeze({
            id: contentRow.id,
            versionId: versionRow.id,
            version: versionRow.version,
            categoryId: contentRow.category_id,
            title: contentRow.title,
            status: contentRow.status,
            spans: Object.freeze(parsed.spans),
            evidenceBindings: Object.freeze(parsed.evidenceBindings),
            citedClaimIds: Object.freeze(parsed.citedClaimIds)
          });
        }
      );
    }),

    listEditorialDrafts: safe(async handle => {
      const principal = await withAuthenticatedTransaction(identity, handle, false, async (_tx, caller) => caller);
      const organizationId = principal.organizationId;

      return withTransaction(
        appPool,
        { organizationId, actorId: principal.userId, requestId: recordId('growth-draft-list') },
        async tx => {
          await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
          const rows = (await tx.db.execute(sql`
            SELECT id, category_id, title, status
            FROM public.content
            WHERE organization_id = ${organizationId}
            ORDER BY id
            LIMIT 201
          `)).rows;
          return Object.freeze(
            rows.map(row =>
              Object.freeze({
                id: row.id,
                categoryId: row.category_id,
                title: row.title,
                status: row.status
              })
            )
          );
        }
      );
    })
  });
}
