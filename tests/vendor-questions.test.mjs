import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVendorQuestionsCsv } from '../src/lib/vendor-questions.mjs';

const models = {
  CRM: { category: 'CRM', products: [{id:'hubspot',name:'HubSpot'},{id:'pipedrive',name:'Pipedrive'}] },
  SEO: { category: 'SEO', products: [{id:'ahrefs',name:'Ahrefs'},{id:'semrush',name:'Semrush'}] },
  Hosting: { category: 'Hosting', products: [{id:'cloudways',name:'Cloudways'},{id:'kinsta',name:'Kinsta'}] }
};

test('exports neutral comparable vendor questions without invented answers', () => {
  const csv=buildVendorQuestionsCsv(models.CRM);
  assert.match(csv,/"category","criterion","question","first_vendor","first_vendor_verification","second_vendor","second_vendor_verification","evidence_url_plan_region_date"/);
  assert.match(csv,/"CRM","Pricing and contract"/);
  assert.match(csv,/"CRM","Migration and portability"/);
  assert.match(csv,/"HubSpot","Unverified","Pipedrive","Unverified",""/);
  assert.doesNotMatch(csv,/affiliate|recommended|winner|verified price/i);
  assert.equal(csv.split('\r\n').filter(Boolean).length,7);
});

test('uses category-specific questions with no vendor-specific endorsements', () => {
  const crm=buildVendorQuestionsCsv(models.CRM);
  const seo=buildVendorQuestionsCsv(models.SEO);
  const hosting=buildVendorQuestionsCsv(models.Hosting);
  assert.match(crm,/sample pipeline import/);
  assert.match(seo,/crawl and query limits/);
  assert.match(hosting,/backup restoration/);
  assert.doesNotMatch(seo,/sample pipeline import/);
  assert.doesNotMatch(hosting,/crawl and query limits/);
});

test('rejects incomplete or unsupported comparison models', () => {
  for(const model of [null, {}, {category:'Accounting',products:models.CRM.products},
    {category:'CRM',products:[]}, {category:'CRM',products:[models.CRM.products[0],models.CRM.products[0]]}]) {
    assert.throws(()=>buildVendorQuestionsCsv(model),/comparison|category|candidate/i);
  }
});

test('escapes CSV quotes and formula-like vendor names rather than executing spreadsheet formulas', () => {
  const model={category:'CRM', products:[{id:'hubspot',name:'=HYPERLINK("https://bad.example")'},models.CRM.products[1]]};
  const csv=buildVendorQuestionsCsv(model);
  assert.match(csv,/"'=HYPERLINK\(""https:\/\/bad\.example""\)"/);
  assert.doesNotMatch(csv,/,"=HYPERLINK/);
});
