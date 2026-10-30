import { BUDGETS, GOALS, TEAM_SIZES } from './recommend.mjs';

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const httpsUrl = (value) => {
  if (!nonempty(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
};
const isDay = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

export function validateCatalog(products) {
  if (!Array.isArray(products) || products.length === 0) throw new Error('Catalog must be a nonempty array');
  const ids = new Set();
  for (const p of products) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('Invalid product entry');
    if (!nonempty(p.id) || !/^[a-z0-9-]+$/.test(p.id) || ids.has(p.id)) throw new Error('Invalid or duplicate product id');
    ids.add(p.id);
    for (const key of ['name', 'category', 'description']) {
      if (!nonempty(p[key])) throw new Error('Missing product ' + key + ': ' + p.id);
    }
    if (!httpsUrl(p.website)) throw new Error('Invalid product website: ' + p.id);
    if (p.affiliateUrl !== null) throw new Error('Affiliate URLs require approval: ' + p.id);
    if (!Array.isArray(p.bestFor) || !p.bestFor.length || new Set(p.bestFor).size !== p.bestFor.length || p.bestFor.some(x => !GOALS.includes(x))) {
      throw new Error('Invalid bestFor: ' + p.id);
    }
    if (typeof p.verified !== 'boolean') throw new Error('Invalid verified flag: ' + p.id);
    if (!['unresearched', 'needs-review', 'verified'].includes(p.researchStatus)) throw new Error('Invalid researchStatus: ' + p.id);
    if (!Array.isArray(p.sources)) throw new Error('Sources must be an array: ' + p.id);
    const urls = new Set();
    for (const source of p.sources) {
      if (!source || !httpsUrl(source.url) || !nonempty(source.claim) || !isDay(source.checkedAt) || urls.has(source.url + source.claim)) {
        throw new Error('Invalid or duplicate source: ' + p.id);
      }
      urls.add(source.url + source.claim);
    }
    if (p.lastVerifiedAt !== null && !isDay(p.lastVerifiedAt)) throw new Error('Invalid lastVerifiedAt: ' + p.id);
    if (p.verified && (p.researchStatus !== 'verified' || !p.sources.length || !p.lastVerifiedAt)) {
      throw new Error('Verified product requires evidence: ' + p.id);
    }
    if (!p.verified && p.researchStatus === 'verified') throw new Error('Conflicting verification status: ' + p.id);
    for (const [key, allowed] of [['supportedTeams', TEAM_SIZES], ['budgetTiers', BUDGETS]]) {
      if (!Array.isArray(p[key]) || new Set(p[key]).size !== p[key].length || p[key].some(x => !allowed.includes(x))) {
        throw new Error('Invalid ' + key + ': ' + p.id);
      }
      if (p[key].length && (!p.verified || !p.sources.length)) {
        throw new Error('Compatibility claims require verified evidence: ' + p.id);
      }
    }
    if (!own(p, 'pricing') || !p.pricing || p.pricing.status !== 'unverified' || p.pricing.amount !== null || p.pricing.currency !== null) {
      throw new Error('Pricing must remain explicitly unverified until evidence is approved: ' + p.id);
    }
  }
  return products.length;
}
