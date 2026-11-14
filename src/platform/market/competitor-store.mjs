import {sql} from 'drizzle-orm';
import {fields, id} from '../contracts/validation.mjs';
import {normalizeLocalConnection} from '../persistence/connection.mjs';
import {openPreparationStore, appendPreparationEvent} from '../orchestration/preparation-store.mjs';
import {digest} from '../orchestration/dag.mjs';
import {competitorRecordKind, prepareCompetitorImport, normalizeCompetitorObservation,
  normalizeCompetitorComparison, compareCompetitorObservations} from './competitors.mjs';

function assertBinding(row, record) {
  if (!row || row.vendor_id !== record.vendorId || row.category_id !== record.categoryId ||
      row.source_id !== record.sourceId || row.source_url !== record.sourceUrl || row.source_digest !== record.evidenceDigest) {
    throw new Error('Invalid competitor source binding');
  }
}

export async function openCompetitorObservationStore(value) {
  const config = normalizeLocalConnection(value);
  if (config.database !== 'stackpilot_market_test' || process.env.STACKPILOT_MARKET_TEST !== '1') throw new Error('Competitor store unavailable');
  const store = await openPreparationStore(config);
  function scope(organizationId) {
    id(organizationId);
    return Object.freeze({
      async apply(input, options) {
        fields(options, ['apply']);
        if (options.apply !== true) throw new Error('Explicit competitor apply required');
        const captured = prepareCompetitorImport(input);
        return store.transaction(organizationId, async tx => {
          const clock = (await tx.db.execute(sql`SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS now_ms`)).rows[0];
          const prepared = prepareCompetitorImport({idempotencyKey: captured.idempotencyKey, observations: captured.observations}, {nowMs: Number(clock.now_ms)});
          const key = 'competitor-import-' + digest(prepared.idempotencyKey).slice(0, 40);
          const prior = (await tx.db.execute(sql`SELECT operation,source_digest,result FROM idempotency_keys WHERE organization_id=${organizationId} AND id=${key}`)).rows[0];
          if (prior) {
            if (prior.operation !== 'manual-competitor-import' || prior.source_digest !== prepared.sourceDigest) throw new Error('Competitor import conflict');
            return Object.freeze({count: 0, sourceDigest: prepared.sourceDigest, observationIds: Object.freeze(prior.result.observationIds)});
          }
          let count = 0;
          for (const record of prepared.observations) {
            const binding = (await tx.db.execute(sql`SELECT p.vendor_id,p.category_id,e.id AS source_id,e.source_url,e.source_digest
              FROM products p JOIN vendors v ON v.organization_id=p.organization_id AND v.id=p.vendor_id
              JOIN evidence_sources e ON e.organization_id=p.organization_id AND e.product_id=p.id
              WHERE p.organization_id=${organizationId} AND p.id=${record.subjectId} AND e.id=${record.sourceId}`)).rows[0];
            assertBinding(binding, record);
            const existing = (await tx.db.execute(sql`SELECT vendor_id,observation FROM competitors WHERE organization_id=${organizationId} AND id=${record.id}`)).rows[0];
            if (existing) {
              if (existing.vendor_id !== record.vendorId || digest(existing.observation) !== digest(record)) throw new Error('Immutable competitor conflict');
              continue;
            }
            await tx.db.execute(sql`INSERT INTO competitors(organization_id,id,vendor_id,observation) VALUES (${organizationId},${record.id},${record.vendorId},${JSON.stringify(record)}::jsonb)`);
            count++;
          }
          const observationIds = Object.freeze(prepared.observations.map(record => record.id));
          await tx.db.execute(sql`INSERT INTO idempotency_keys(organization_id,id,operation,source_digest,result) VALUES (${organizationId},${key},'manual-competitor-import',${prepared.sourceDigest},${JSON.stringify({observationIds, count})}::jsonb)`);
          await appendPreparationEvent(tx, 'manual-competitor-imported', key);
          return Object.freeze({count, sourceDigest: prepared.sourceDigest, observationIds});
        });
      },
      async compare(input) {
        const selected = normalizeCompetitorComparison(input);
        return store.transaction(organizationId, async tx => {
          const subjects = sql.join(selected.subjectIds.map(subject => sql`${subject}`), sql`, `);
          const features = sql.join(selected.featureIds.map(feature => sql`${feature}`), sql`, `);
          const snapshot = (await tx.db.execute(sql`WITH selected_products AS (
              SELECT id,category_id FROM products WHERE organization_id=${organizationId} AND id IN (${subjects})
            ), records AS (SELECT c.id,c.vendor_id AS stored_vendor,c.observation,p.vendor_id,p.category_id,e.id AS source_id,e.source_url,e.source_digest,
              floor(extract(epoch FROM statement_timestamp())*1000)::bigint AS now_ms
            FROM competitors c
            LEFT JOIN products p ON p.organization_id=c.organization_id AND p.id=c.observation->>'subjectId'
            LEFT JOIN vendors v ON v.organization_id=p.organization_id AND v.id=p.vendor_id
            LEFT JOIN evidence_sources e ON e.organization_id=p.organization_id AND e.product_id=p.id AND e.id=c.observation->>'sourceId'
            WHERE c.organization_id=${organizationId} AND c.observation->>'kind'=${competitorRecordKind}
              AND c.observation->>'subjectId' IN (${subjects}) AND c.observation->>'featureId' IN (${features})
              AND c.observation->>'region'=${selected.region} AND c.observation->>'periodStart'=${selected.periodStart} AND c.observation->>'periodEnd'=${selected.periodEnd}
            ORDER BY c.id LIMIT 101)
            SELECT (SELECT count(*) FROM selected_products) AS subject_count,
              (SELECT count(DISTINCT category_id) FROM selected_products) AS category_count,
              row_to_json(records) AS record FROM (VALUES (1)) AS anchor(value) LEFT JOIN records ON true
            ORDER BY records.id`)).rows;
          if (Number(snapshot[0].subject_count) !== selected.subjectIds.length) throw new Error('Unknown competitor subject');
          if (Number(snapshot[0].category_count) !== 1) throw new Error('Incompatible competitor categories');
          const rows = snapshot.filter(row => row.record !== null).map(row => row.record);
          if (rows.length > 100) throw new Error('Competitor comparison limit');
          const observations = rows.map(row => {
            const record = normalizeCompetitorObservation(row.observation, Number(row.now_ms));
            if (row.id !== record.id || row.stored_vendor !== record.vendorId) throw new Error('Invalid competitor storage binding');
            assertBinding(row, record);
            return record;
          });
          return compareCompetitorObservations({...selected, observations});
        });
      },
    });
  }
  return Object.freeze({scope, close: () => store.close()});
}
