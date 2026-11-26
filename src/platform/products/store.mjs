import {sql} from 'drizzle-orm';
import {fields, id} from '../contracts/validation.mjs';
import {normalizeLocalConnection} from '../persistence/connection.mjs';
import {openPreparationStore, appendPreparationEvent} from '../orchestration/preparation-store.mjs';
import {digest} from '../orchestration/dag.mjs';
import {canonicalCandidateUrl, prepareProductIntake} from './discovery.mjs';
import {proposeProductDuplicates} from './dedup.mjs';

// Table and column identifiers below are internal constants, never caller input.
async function insertImmutable(tx, table, record) {
  const organizationId = tx.scope.organizationId;
  const old = (await tx.db.execute(sql`SELECT * FROM ${sql.identifier(table)} WHERE organization_id=${organizationId} AND id=${record.id}`)).rows[0];
  if (old) {
    for (const [column, value] of Object.entries(record)) {
      let stored = old[column];
      if (column === 'website' || column === 'source_url') stored = canonicalCandidateUrl(stored);
      if (column === 'collected_at') {
        stored = (await tx.db.execute(sql`SELECT to_char(collected_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS value FROM evidence_sources WHERE organization_id=${organizationId} AND id=${record.id}`)).rows[0].value;
      }
      if (column !== 'metadata' && stored !== value) throw new Error('Immutable candidate conflict');
    }
    return false;
  }
  const values = {organization_id:organizationId, ...record};
  const columns = Object.keys(values).map(column => sql.identifier(column));
  const parameters = Object.entries(values).map(([column, value]) => column === 'metadata' ? sql`${JSON.stringify(value)}::jsonb` : sql`${value}`);
  await tx.db.execute(sql`INSERT INTO ${sql.identifier(table)} (${sql.join(columns, sql`, `)}) VALUES (${sql.join(parameters, sql`, `)})`);
  return true;
}

async function assertNamespace(tx, kind, incoming) {
  const organizationId = tx.scope.organizationId;
  const table = kind === 'category' ? 'categories' : 'products';
  const aliasTable = kind === 'category' ? 'category_aliases' : 'product_aliases';
  const ownerColumn = kind === 'category' ? 'category_id' : 'product_id';
  const records = (await tx.db.execute(sql`SELECT id,slug FROM ${sql.identifier(table)} WHERE organization_id=${organizationId} ORDER BY id LIMIT 101`)).rows;
  const aliases = (await tx.db.execute(sql`SELECT alias,${sql.identifier(ownerColumn)} AS owner FROM ${sql.identifier(aliasTable)} WHERE organization_id=${organizationId} ORDER BY alias LIMIT 501`)).rows;
  if (records.length > 100 || aliases.length > 500) throw new Error('Candidate namespace limit');
  if (new Set([...records.map(record => record.id), ...incoming.map(record => record.id)]).size > 100 || new Set([...aliases.map(record => record.alias), ...incoming.flatMap(record => record.aliases)]).size > 500) throw new Error('Candidate namespace limit');
  const namespace = new Map();
  function claim(token, owner) {
    if (namespace.has(token) && namespace.get(token) !== owner) throw new Error('Candidate namespace conflict');
    namespace.set(token, owner);
  }
  for (const record of records) { claim(record.id, record.id); claim(record.slug, record.id); }
  for (const alias of aliases) claim(alias.alias, alias.owner);
  for (const record of incoming) {
    for (const token of new Set([record.id, record.slug, ...record.aliases])) claim(token, record.id);
    if (records.some(old => old.id === record.id)) {
      const stored = aliases.filter(alias => alias.owner === record.id).map(alias => alias.alias).sort();
      if (JSON.stringify(stored) !== JSON.stringify(record.aliases)) throw new Error('Immutable candidate aliases');
    }
  }
}

export async function openProductCandidateStore(value) {
  const config = normalizeLocalConnection(value);
  if (config.database !== 'stackpilot_market_test' || process.env.STACKPILOT_MARKET_TEST !== '1') throw new Error('Product candidate store unavailable');
  const store = await openPreparationStore(config);
  function scope(organizationId) {
    id(organizationId);
    return Object.freeze({
      async apply(input, options) {
        fields(options, ['apply']);
        if (options.apply !== true) throw new Error('Explicit candidate apply required');
        const captured = prepareProductIntake(input);
        return store.transaction(organizationId, async tx => {
          await tx.db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId+'|candidate-import-v1'},0))`);
          const clock = (await tx.db.execute(sql`SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS now_ms`)).rows[0];
          const {idempotencyKey, manualReference, categories, vendors, products, sources} = captured;
          const prepared = prepareProductIntake({idempotencyKey, manualReference, categories, vendors, products:products.map(({status, affiliateUrl, ...record}) => record), sources:sources.map(({status, ...record}) => record)}, {nowMs:Number(clock.now_ms)});
          const key = 'product-intake-'+digest(idempotencyKey).slice(0,40);
          const prior = (await tx.db.execute(sql`SELECT operation,source_digest,result FROM idempotency_keys WHERE organization_id=${organizationId} AND id=${key}`)).rows[0];
          if (prior) {
            if (prior.operation !== 'manual-product-intake' || prior.source_digest !== prepared.sourceDigest) throw new Error('Candidate intake conflict');
            return Object.freeze({...prior.result, applied:false});
          }
          await assertNamespace(tx, 'category', categories);
          await assertNamespace(tx, 'product', products);
          for (const category of categories) {
            await insertImmutable(tx, 'categories', {id:category.id, slug:category.slug, name:category.name});
            for (const alias of category.aliases) await insertImmutable(tx, 'category_aliases', {id:'alias-'+digest(alias).slice(0,48), category_id:category.id, alias});
          }
          const existingVendors = (await tx.db.execute(sql`SELECT id,website FROM vendors WHERE organization_id=${organizationId} ORDER BY id LIMIT 101`)).rows;
          if (existingVendors.length > 100 || new Set([...existingVendors.map(record => record.id), ...vendors.map(record => record.id)]).size > 100) throw new Error('Candidate vendor limit');
          for (const vendor of vendors) {
            if (existingVendors.some(old => old.id !== vendor.id && canonicalCandidateUrl(old.website) === vendor.website)) throw new Error('Vendor identity conflict');
            await insertImmutable(tx, 'vendors', vendor);
          }
          for (const product of products) {
            await insertImmutable(tx, 'products', {id:product.id, category_id:product.categoryId, vendor_id:product.vendorId, slug:product.slug, name:product.name, website:product.website, status:'candidate', affiliate_url:null, metadata:{kind:'manual-product-candidate-v1', manualReference, sourceDigest:prepared.sourceDigest, reviewState:'unreviewed'}});
            for (const alias of product.aliases) await insertImmutable(tx, 'product_aliases', {id:'alias-'+digest(alias).slice(0,48), product_id:product.id, alias});
          }
          for (const source of sources) await insertImmutable(tx, 'evidence_sources', {id:source.id, product_id:source.productId, source_url:source.sourceUrl, collected_at:source.collectedAt, source_digest:source.sourceDigest, status:'candidate'});
          const candidates = (await tx.db.execute(sql`SELECT p.id,v.website AS vendor_url FROM products p JOIN vendors v ON v.organization_id=p.organization_id AND v.id=p.vendor_id WHERE p.organization_id=${organizationId} ORDER BY p.id LIMIT 101`)).rows;
          if (candidates.length > 100) throw new Error('Candidate duplicate scope limit');
          const proposals = proposeProductDuplicates(candidates.map(row => ({id:row.id, vendorUrl:row.vendor_url})));
          let proposalCount = 0;
          for (const proposal of proposals) {
            if (await insertImmutable(tx, 'product_duplicate_proposals', {id:proposal.id, left_product_id:proposal.leftProductId, right_product_id:proposal.rightProductId, vendor_url:proposal.vendorUrl, reason:proposal.reason, review_state:'unreviewed'})) proposalCount++;
          }
          const result = {sourceDigest:prepared.sourceDigest, manualReference, productIds:products.map(product => product.id), sourceIds:sources.map(source => source.id), proposalCount, reviewState:'unreviewed'};
          await tx.db.execute(sql`INSERT INTO idempotency_keys(organization_id,id,operation,source_digest,result) VALUES (${organizationId},${key},'manual-product-intake',${prepared.sourceDigest},${JSON.stringify(result)}::jsonb)`);
          await appendPreparationEvent(tx, 'manual-products-imported', key);
          return Object.freeze({...result, applied:true});
        });
      },
      async duplicates(productId) {
        const selected = id(productId);
        return store.transaction(organizationId, async tx => {
          const exists = (await tx.db.execute(sql`SELECT id FROM products WHERE organization_id=${organizationId} AND id=${selected}`)).rows;
          if (exists.length !== 1) throw new Error('Unknown candidate product');
          const rows = (await tx.db.execute(sql`SELECT id,left_product_id,right_product_id,vendor_url,reason,review_state FROM product_duplicate_proposals WHERE organization_id=${organizationId} AND (left_product_id=${selected} OR right_product_id=${selected}) ORDER BY id LIMIT 101`)).rows;
          if (rows.length > 100) throw new Error('Duplicate proposal limit');
          return Object.freeze(rows.map(row => Object.freeze({id:row.id, leftProductId:row.left_product_id, rightProductId:row.right_product_id, vendorUrl:row.vendor_url, reason:row.reason, reviewState:row.review_state})));
        });
      },
    });
  }
  return Object.freeze({scope, close:() => store.close()});
}
