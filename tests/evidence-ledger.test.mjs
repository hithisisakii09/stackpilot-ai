import test from 'node:test';
import assert from 'node:assert/strict';
import products from '../src/data/products.json' with { type: 'json' };
import { validateEvidenceLeads, buildEvidenceReviewQueue } from '../src/lib/evidence-ledger.mjs';

const candidate = (productId = 'hubspot', id = 'hubspot-official-source') => {
  const product = products.find(p => p.id === productId);
  return {
    id,
    productId,
    sourceUrl: product.sources[0].url,
    summary: 'Official vendor page queued for editorial evaluation',
    recordedOn: '2026-10-30',
    status: 'candidate',
    approved: false,
    reviewer: null,
    reviewedOn: null
  };
};
const valid = () => [candidate(), candidate('pipedrive', 'pipedrive-official-source')];
const options = { today: '2026-10-31' };

test('accepts only recorded unapproved vendor source leads', () => {
  assert.equal(validateEvidenceLeads(valid(), products, options), 2);
});
test('rejects unknown product references', () => {
  const lead = candidate();
  lead.productId = 'unknown-tool';
  assert.throws(() => validateEvidenceLeads([lead], products, options), /product/i);
});
test('blocks cross-vendor evidence attribution', () => {
  const lead = candidate();
  lead.sourceUrl = products.find(p => p.id === 'semrush').sources[0].url;
  assert.throws(() => validateEvidenceLeads([lead], products, options), /source/i);
});
test('refuses HTTP URLs and referral query strings', () => {
  const lead = candidate();
  lead.sourceUrl = 'http://www.hubspot.com/pricing/sales';
  assert.throws(() => validateEvidenceLeads([lead], products, options), /source/i);
  lead.sourceUrl = 'https://www.hubspot.com/pricing/sales?ref=affiliate';
  assert.throws(() => validateEvidenceLeads([lead], products, options), /source/i);
});
test('rejects impossible calendar dates and future recorded dates', () => {
  const lead = candidate();
  lead.recordedOn = '2026-02-30';
  assert.throws(() => validateEvidenceLeads([lead], products, options), /date/i);
  lead.recordedOn = '2099-01-01';
  assert.throws(() => validateEvidenceLeads([lead], products, options), /date/i);
});
test('forbids marking a lead approved without an authenticated review system', () => {
  const lead = candidate();
  lead.approved = true;
  assert.throws(() => validateEvidenceLeads([lead], products, options), /approval|approved/i);
  lead.approved = false;
  lead.status = 'approved';
  assert.throws(() => validateEvidenceLeads([lead], products, options), /status/i);
});
test('blocks forged reviewer names or reviewed dates', () => {
  const lead = candidate();
  lead.reviewer = 'Anonymous AI';
  assert.throws(() => validateEvidenceLeads([lead], products, options), /review/i);
  lead.reviewer = null;
  lead.reviewedOn = '2026-10-30';
  assert.throws(() => validateEvidenceLeads([lead], products, options), /review/i);
});
test('rejects duplicate IDs and duplicate product/source attribution', () => {
  assert.throws(() => validateEvidenceLeads([candidate(), candidate()], products, options), /duplicate/i);
  assert.throws(() => validateEvidenceLeads([candidate(), candidate('hubspot', 'hubspot-second')], products, options), /duplicate/i);
});
test('denies undeclared properties such as affiliateUrl or verified', () => {
  const lead = { ...candidate(), affiliateUrl: 'https://foo.test/ref' };
  assert.throws(() => validateEvidenceLeads([lead], products, options), /field|property/i);
  delete lead.affiliateUrl;
  lead.verified = true;
  assert.throws(() => validateEvidenceLeads([lead], products, options), /field|property/i);
});
test('requires nonempty bounded plain-text summaries and proper ids', () => {
  const lead = candidate();
  lead.summary = '  ';
  assert.throws(() => validateEvidenceLeads([lead], products, options), /summary/i);
  lead.summary = 'A'.repeat(401);
  assert.throws(() => validateEvidenceLeads([lead], products, options), /summary/i);
  lead.summary = 'Normal summary';
  lead.id = '../unsafe';
  assert.throws(() => validateEvidenceLeads([lead], products, options), /id/i);
});
test('returns an ordered read-only editorial queue without ranking products', () => {
  const leads = valid();
  const before = structuredClone(leads);
  const queue = buildEvidenceReviewQueue(leads, products, options);
  assert.equal(queue.length, products.length);
  assert.equal(queue.find(p => p.productId === 'hubspot').sourceLeadCount, 1);
  assert.equal(queue.find(p => p.productId === 'semrush').sourceLeadCount, 0);
  assert.ok(queue.every(p => p.editorialStatus === 'Unreviewed'));
  assert.ok(queue.every(p => p.approvedClaims === 0));
  assert.deepEqual(leads, before);
});
test('flags aging evidence as research needs, not failed vendor approval', () => {
  const queue = buildEvidenceReviewQueue(valid(), products, { today: '2027-03-15', staleAfterDays: 30 });
  assert.equal(queue.find(p => p.productId === 'hubspot').needsRefresh, true);
  assert.equal(queue.find(p => p.productId === 'semrush').needsRefresh, true);
});
test('validates ledger input and date options', () => {
  assert.throws(() => validateEvidenceLeads([], products, { today: '2026-02-30' }), /date/i);
  assert.throws(() => validateEvidenceLeads({}, products, options), /array/i);
  assert.throws(() => buildEvidenceReviewQueue(valid(), products, { today: '2026-10-31', staleAfterDays: 0 }), /stale/i);
});
