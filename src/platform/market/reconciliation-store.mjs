import {sql} from 'drizzle-orm';
import {fields, id, text, choice} from '../contracts/validation.mjs';
import {normalizeLocalConnection} from '../persistence/connection.mjs';
import {openPreparationStore, appendPreparationEvent} from '../orchestration/preparation-store.mjs';
import {digest} from '../orchestration/dag.mjs';
import {normalizeObservation, prepareReconciliation, normalizeReconciledSelection, analyzeReconciledEvidence} from './reconciliation.mjs';
import {prepareMarketHistorySelection, analyzeMarketHistory} from './seasonality.mjs';

function recordQuery(organizationId, domain, condition) {
  const table = sql.identifier(domain === 'market' ? 'market_observations' : 'competitors');
  const kind = domain === 'market' ? 'manual-market-observation-v1' : 'manual-competitor-observation-v1';
  const stored = domain === 'market' ? sql`r.source_url AS stored_url,r.status AS stored_status,r.opportunity_id,mo.category_id AS opportunity_category,mo.observation AS opportunity_binding` : sql`r.vendor_id AS stored_vendor`;
  const opportunity = domain === 'market' ? sql`LEFT JOIN market_opportunities mo ON mo.organization_id=r.organization_id AND mo.id=r.opportunity_id` : sql``;
  return sql`SELECT r.id,r.observation,${stored},p.category_id,p.vendor_id,e.id AS source_id,e.source_url,e.source_digest,
      floor(extract(epoch FROM statement_timestamp())*1000)::bigint AS now_ms
    FROM ${table} r LEFT JOIN products p ON p.organization_id=r.organization_id AND p.id=r.observation->>'subjectId'
    LEFT JOIN evidence_sources e ON e.organization_id=p.organization_id AND e.product_id=p.id AND e.id=r.observation->>'sourceId'
    ${opportunity}
    WHERE r.organization_id=${organizationId} AND r.observation->>'kind'=${kind} AND ${condition} ORDER BY r.id LIMIT 101`;
}

function readObservation(domain, row) {
  const record = normalizeObservation(domain, row.observation, Number(row.now_ms));
  if (row.id !== record.id) throw new Error('Invalid observation identity');
  if (domain === 'competitor' && row.stored_vendor !== record.vendorId) throw new Error('Invalid competitor storage');
  if (domain === 'market') {
    const expected = 'opportunity-' + digest([record.categoryId, record.subjectId]).slice(0, 48);
    if (row.opportunity_id !== expected || row.stored_url !== record.sourceUrl || row.stored_status !== 'candidate' || row.opportunity_category !== record.categoryId || row.opportunity_binding?.kind !== 'manual-market-subject-v1' || row.opportunity_binding.subjectId !== record.subjectId) throw new Error('Invalid market storage');
  }
  const current = row.category_id === record.categoryId && (domain === 'market' || row.vendor_id === record.vendorId) &&
    record.sourceId !== null && row.source_id === record.sourceId && row.source_url === record.sourceUrl && record.evidenceDigest !== null && row.source_digest === record.evidenceDigest;
  return {record, current};
}

async function readEvidenceSnapshot(tx, organizationId, domain, condition, subjectIds) {
  const subjects = sql.join(subjectIds.map(subject => sql`${subject}`), sql`, `);
  const query = recordQuery(organizationId, domain, condition);
  const snapshot = (await tx.db.execute(sql`WITH records AS (${query}), selected_links AS (
      SELECT record FROM reconciliation_links WHERE organization_id=${organizationId} AND domain=${domain}
        AND (coalesce(market_from_id,competitor_from_id) IN (SELECT id FROM records) OR coalesce(market_to_id,competitor_to_id) IN (SELECT id FROM records)) ORDER BY id LIMIT 101
    ), subjects AS (SELECT id,category_id FROM products WHERE organization_id=${organizationId} AND id IN (${subjects}))
    SELECT (SELECT count(*) FROM subjects) AS subject_count,(SELECT count(DISTINCT category_id) FROM subjects) AS category_count,
      coalesce((SELECT json_agg(records ORDER BY id) FROM records),'[]'::json) AS observations,
      coalesce((SELECT json_agg(record) FROM selected_links),'[]'::json) AS links`)).rows[0];
  if (Number(snapshot.subject_count) !== subjectIds.length || Number(snapshot.category_count) !== 1) throw new Error('Invalid reconciliation subjects');
  if (snapshot.observations.length > 100 || snapshot.links.length > 100) throw new Error('Reconciliation snapshot limit');
  const rows = snapshot.observations.map(row => readObservation(domain, row));
  return {observations: rows.map(row => row.record), links: snapshot.links, staleIds: rows.filter(row => !row.current).map(row => row.record.id)};
}

export async function openReconciliationStore(value) {
  const config = normalizeLocalConnection(value);
  if (config.database !== 'stackpilot_market_test' || process.env.STACKPILOT_MARKET_TEST !== '1') throw new Error('Reconciliation store unavailable');
  const store = await openPreparationStore(config);
  try { await store.transaction('reconciliation-readiness', tx => tx.db.execute(sql`SELECT id FROM reconciliation_links LIMIT 0`)); }
  catch { await store.close(); throw new Error('Reconciliation migration unavailable'); }
  function scope(organizationId) {
    id(organizationId);
    return Object.freeze({
      async propose(input, options) {
        fields(options, ['apply']);
        if (options.apply !== true) throw new Error('Explicit reconciliation apply required');
        fields(input, ['idempotencyKey', 'domain', 'fromId', 'toId', 'reason']);
        const captured = Object.freeze({idempotencyKey: id(input.idempotencyKey), domain: choice(input.domain, ['market', 'competitor']), fromId: id(input.fromId), toId: id(input.toId), reason: text(input.reason, 500)});
        if (captured.fromId === captured.toId) throw new Error('Self reconciliation');
        return store.transaction(organizationId, async tx => {
          const {domain, fromId, toId} = captured;
          const rows = (await tx.db.execute(recordQuery(organizationId, domain, sql`r.id IN (${fromId},${toId})`))).rows;
          if (rows.length !== 2) throw new Error('Unknown reconciliation observations');
          const records = rows.map(row => readObservation(domain, row));
          const from = records.find(row => row.record.id === fromId), to = records.find(row => row.record.id === toId);
          if (!from || !to || !to.current) throw new Error('Stale correction target');
          const record = prepareReconciliation({domain, from: from.record, to: to.record, reason: captured.reason});
          const sourceDigest = digest(record), key = 'reconcile-import-' + digest(captured.idempotencyKey).slice(0, 40);
          const prior = (await tx.db.execute(sql`SELECT operation,source_digest,result FROM idempotency_keys WHERE organization_id=${organizationId} AND id=${key}`)).rows[0];
          if (prior) {
            if (prior.operation !== 'reconciliation-proposal' || prior.source_digest !== sourceDigest) throw new Error('Reconciliation idempotency conflict');
            return Object.freeze({applied: false, record});
          }
          const outgoing = (await tx.db.execute(sql`SELECT record FROM reconciliation_links WHERE organization_id=${organizationId} AND domain=${domain} AND coalesce(market_from_id,competitor_from_id)=${fromId}`)).rows[0];
          if (outgoing && digest(outgoing.record) !== sourceDigest) throw new Error('Competing reconciliation');
          const chain = (await tx.db.execute(sql`WITH RECURSIVE path(node,depth) AS (
            SELECT ${toId}::text,0 UNION ALL
            SELECT coalesce(l.market_to_id,l.competitor_to_id),path.depth+1 FROM path JOIN reconciliation_links l
              ON l.organization_id=${organizationId} AND l.domain=${domain} AND coalesce(l.market_from_id,l.competitor_from_id)=path.node WHERE path.depth<100
            ) SELECT node,depth FROM path`)).rows;
          if (chain.some(row => row.node === fromId || row.depth >= 100)) throw new Error('Cyclic or oversized reconciliation');
          if (!outgoing) {
            await tx.db.execute(sql`INSERT INTO reconciliation_links(organization_id,id,domain,market_from_id,market_to_id,competitor_from_id,competitor_to_id,record)
              VALUES (${organizationId},${record.id},${domain},${domain === 'market' ? fromId : null},${domain === 'market' ? toId : null},${domain === 'competitor' ? fromId : null},${domain === 'competitor' ? toId : null},${JSON.stringify(record)}::jsonb)`);
          }
          await tx.db.execute(sql`INSERT INTO idempotency_keys(organization_id,id,operation,source_digest,result) VALUES (${organizationId},${key},'reconciliation-proposal',${sourceDigest},${JSON.stringify({linkId: record.id})}::jsonb)`);
          await appendPreparationEvent(tx, 'candidate-reconciliation-proposed', record.id);
          return Object.freeze({applied: !outgoing, record});
        });
      },
      async analyze(input) {
        const captured = normalizeReconciledSelection(input);
        const {domain, selection} = captured;
        return store.transaction(organizationId, async tx => {
          const subjects = sql.join(selection.subjectIds.map(subject => sql`${subject}`), sql`, `);
          const dimensions = sql.join(selection.featureIds.map(feature => sql`${feature}`), sql`, `);
          const dimensionKey = domain === 'market' ? 'metric' : 'featureId';
          const condition = sql`r.observation->>'subjectId' IN (${subjects}) AND r.observation->>${dimensionKey} IN (${dimensions}) AND r.observation->>'region'=${selection.region} AND r.observation->>'periodStart'=${selection.periodStart} AND r.observation->>'periodEnd'=${selection.periodEnd}`;
          const snapshot = await readEvidenceSnapshot(tx, organizationId, domain, condition, selection.subjectIds);
          return analyzeReconciledEvidence({...captured, ...snapshot});
        });
      },
      async historical(input) {
        const {selection} = prepareMarketHistorySelection(input);
        return store.transaction(organizationId, async tx => {
          const subjects = sql.join(selection.subjectIds.map(subject => sql`${subject}`), sql`, `);
          const condition = sql`r.observation->>'subjectId' IN (${subjects}) AND r.observation->>'metric'=${selection.metric} AND r.observation->>'region'=${selection.region}`;
          const snapshot = await readEvidenceSnapshot(tx, organizationId, 'market', condition, selection.subjectIds);
          return analyzeMarketHistory({selection, ...snapshot});
        });
      },
    });
  }
  return Object.freeze({scope, close: () => store.close()});
}
