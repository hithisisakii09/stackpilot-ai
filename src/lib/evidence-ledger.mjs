/**
 * Phase 2.0: candidate-only editorial evidence ledger.
 *
 * This module cannot approve a claim, change the catalog, rank products, or
 * infer pricing. A future authenticated reviewer workflow must be separate.
 */
const REQUIRED_FIELDS = [
  'id', 'productId', 'sourceUrl', 'summary', 'recordedOn',
  'status', 'approved', 'reviewer', 'reviewedOn'
];
const FIELD_SET = new Set(REQUIRED_FIELDS);
const DAY_MS = 86_400_000;
const isRecord = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const dateOf = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? null : date;
};
const cleanUrl = value => {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && Boolean(u.hostname) &&
      !u.username && !u.password && !u.search && !u.hash;
  } catch {
    return false;
  }
};

/** Validate structural provenance and forbid editorial approval in an unauthenticated static site. */
export function validateEvidenceLeads(leads, products, { today = new Date().toISOString().slice(0, 10) } = {}) {
  if (!dateOf(today)) throw new Error('Invalid reference date');
  if (!Array.isArray(leads)) throw new Error('Evidence leads must be an array');
  if (!Array.isArray(products) || !products.every(p => isRecord(p) && typeof p.id === 'string')) {
    throw new Error('Products must be a catalog array');
  }
  const catalog = new Map(products.map(p => [p.id, p]));
  const seenIds = new Set();
  const seenSources = new Set();
  for (const lead of leads) {
    if (!isRecord(lead)) throw new Error('Evidence lead must be an object');
    const keys = Object.keys(lead);
    if (keys.length !== REQUIRED_FIELDS.length ||
      keys.some(key => !FIELD_SET.has(key)) ||
      REQUIRED_FIELDS.some(key => !Object.prototype.hasOwnProperty.call(lead, key))) {
      throw new Error('Invalid or undeclared evidence field/property');
    }
    if (typeof lead.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lead.id)) {
      throw new Error('Invalid evidence id');
    }
    if (seenIds.has(lead.id)) throw new Error('Duplicate evidence id');
    seenIds.add(lead.id);
    const product = catalog.get(lead.productId);
    if (!product) throw new Error('Unknown evidence product reference');
    if (!cleanUrl(lead.sourceUrl) ||
      !Array.isArray(product.sources) ||
      !product.sources.some(source => source.url === lead.sourceUrl)) {
      throw new Error('Evidence source must match a vendor URL already recorded for this product');
    }
    const sourceKey = lead.productId + '\u0000' + lead.sourceUrl;
    if (seenSources.has(sourceKey)) throw new Error('Duplicate evidence source lead');
    seenSources.add(sourceKey);
    if (typeof lead.summary !== 'string' ||
      lead.summary.trim().length === 0 || lead.summary.length > 400) {
      throw new Error('Invalid evidence summary');
    }
    if (!dateOf(lead.recordedOn) || lead.recordedOn > today) {
      throw new Error('Invalid or future evidence date');
    }
    if (lead.status !== 'candidate') throw new Error('Evidence status must stay candidate');
    if (lead.approved !== false) throw new Error('Evidence approval requires a future authenticated workflow');
    if (lead.reviewer !== null || lead.reviewedOn !== null) {
      throw new Error('Unreviewed evidence cannot include reviewer or reviewedOn');
    }
  }
  return leads.length;
}

export function buildEvidenceReviewQueue(
  leads, products, { today = new Date().toISOString().slice(0, 10), staleAfterDays = 90 } = {}
) {
  if (!Number.isInteger(staleAfterDays) || staleAfterDays < 1) {
    throw new Error('Invalid staleAfterDays threshold');
  }
  validateEvidenceLeads(leads, products, { today });
  const now = dateOf(today);
  return products.map(product => {
    const refs = leads.filter(lead => lead.productId === product.id);
    const mostRecent = refs.reduce((latest, lead) =>
      !latest || lead.recordedOn > latest ? lead.recordedOn : latest, null);
    const elapsed = mostRecent ? Math.floor((now - dateOf(mostRecent)) / DAY_MS) : null;
    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      sourceLeadCount: refs.length,
      latestRecordedOn: mostRecent,
      editorialStatus: 'Unreviewed',
      approvedClaims: 0,
      needsRefresh: elapsed === null || elapsed > staleAfterDays,
      leads: refs.map(lead => ({
        id: lead.id,
        sourceUrl: lead.sourceUrl,
        summary: lead.summary,
        recordedOn: lead.recordedOn,
        status: 'candidate'
      }))
    };
  }).sort((a, b) => a.productName.localeCompare(b.productName));
}
