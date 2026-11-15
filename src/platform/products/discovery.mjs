import {isIP} from 'node:net';
import {fields, id, text, dataArray, integer, json} from '../contracts/validation.mjs';
import {digest} from '../orchestration/dag.mjs';
import {aliasToken, normalizeAliases, normalizeTaxonomy} from './taxonomy.mjs';

// Manual candidate identifiers only. DNS and network collection require a separate adapter.
export function canonicalCandidateUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || !/^https:\/\/[A-Za-z0-9.-]+(?:\/[A-Za-z0-9._~/-]*)?$/.test(value) || /\/(?:\.|\.\.)(?:\/|$)/.test(value)) throw new Error('Invalid candidate URL');
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid candidate URL'); }
  const host = url.hostname;
  const labels = host.split('.');
  if (isIP(host) || labels.length < 2 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || !/^[a-z]{2,63}$/.test(labels.at(-1)) || /(?:^|\.)(localhost|local|internal|invalid|test)$/.test(host)) throw new Error('Invalid candidate URL');
  return url.href;
}

function sortedUnique(records) {
  if (new Set(records.map(record => record.id)).size !== records.length) throw new Error('Duplicate candidate identity');
  return records.sort((a, b) => a.id.localeCompare(b.id, 'en'));
}

export function prepareProductIntake(value, options = {}) {
  fields(value, ['idempotencyKey', 'manualReference', 'categories', 'vendors', 'products', 'sources']);
  fields(options, [], ['nowMs']);
  const nowMs = options.nowMs === undefined ? Date.now() : integer(options.nowMs, Date.UTC(2000,0,1), 4102444800000);
  const categories = normalizeTaxonomy(value.categories);
  const vendors = sortedUnique(dataArray(value.vendors, 10).map(record => {
    fields(record, ['id', 'name', 'website']);
    return {id:id(record.id), name:text(record.name, 100), website:canonicalCandidateUrl(record.website)};
  }));
  if (new Set(vendors.map(record => record.website)).size !== vendors.length) throw new Error('Duplicate vendor URL');
  const namespace = new Set();
  const products = sortedUnique(dataArray(value.products, 10).map(record => {
    fields(record, ['id', 'categoryId', 'vendorId', 'slug', 'name', 'website', 'aliases']);
    const productId = id(record.id), slug = aliasToken(record.slug);
    const aliases = normalizeAliases(record.aliases, [productId, slug]);
    for (const token of new Set([productId, slug, ...aliases])) {
      if (namespace.has(token)) throw new Error('Ambiguous product namespace');
      namespace.add(token);
    }
    return {id:productId, categoryId:id(record.categoryId), vendorId:id(record.vendorId), slug, name:text(record.name, 100), website:canonicalCandidateUrl(record.website), aliases, status:'candidate', affiliateUrl:null};
  }));
  const sources = sortedUnique(dataArray(value.sources, 10).map(record => {
    fields(record, ['id', 'productId', 'sourceUrl', 'collectedAt', 'sourceDigest']);
    const time = typeof record.collectedAt === 'string' ? Date.parse(record.collectedAt) : NaN;
    if (!Number.isFinite(time) || time < Date.UTC(2000,0,1) || time > nowMs || new Date(time).toISOString() !== record.collectedAt) throw new Error('Invalid candidate source date');
    if (typeof record.sourceDigest !== 'string' || !/^[a-f0-9]{64}$/.test(record.sourceDigest)) throw new Error('Invalid candidate source digest');
    return {id:id(record.id), productId:id(record.productId), sourceUrl:canonicalCandidateUrl(record.sourceUrl), collectedAt:record.collectedAt, sourceDigest:record.sourceDigest, status:'candidate'};
  }));
  if (categories.length + vendors.length + products.length + sources.length === 0) throw new Error('Empty candidate intake');
  const captured = {idempotencyKey:id(value.idempotencyKey), manualReference:text(value.manualReference, 128), categories, vendors, products, sources};
  return json({...captured, sourceDigest:digest(captured), dryRun:true, reviewState:'unreviewed'});
}
