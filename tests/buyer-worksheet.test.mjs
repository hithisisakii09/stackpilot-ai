import test from 'node:test';
import assert from 'node:assert/strict';
import { listCategories, criteriaFor, buildBuyerWorksheet } from '../src/lib/buyer-worksheet.mjs';

test('worksheet covers exactly the current software categories', () => {
 assert.deepEqual(listCategories(), ['CRM','SEO','Hosting']);
});
test('every category has a useful non-overlapping requirement checklist', () => {
 const all = new Set();
 for (const category of listCategories()) {
  const items = criteriaFor(category);
  assert.ok(items.length >= 5 && items.length <= 12);
  for (const item of items) {
   assert.match(item.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
   assert.ok(item.label.length >= 6 && item.label.length <= 95);
   assert.ok(item.question.endsWith('?'));
   assert.ok(!all.has(item.id), 'Duplicate global criterion id');
   all.add(item.id);
  }
 }
});
test('worksheet is structured plain text with transparent verification prompts', () => {
 const items=criteriaFor('CRM');
 const text=buildBuyerWorksheet('CRM',[items[1].id,items[0].id]);
 assert.match(text,/StackPilot AI — Software requirements worksheet/);
 assert.match(text,/Category: CRM/);
 assert.ok(text.indexOf(items[0].label)<text.indexOf(items[1].label),'Output follows stable catalog order');
 assert.ok(text.includes(items[0].question));
 assert.ok(text.includes('Confirm all features, prices, regional restrictions and plan limits with the provider.'));
 assert.ok(text.includes('No paid rankings or affiliate links'));
});
test('requires a valid category and at least one selected criterion', () => {
 assert.throws(()=>criteriaFor('Payment'),/category/i);
 assert.throws(()=>buildBuyerWorksheet('Payment',[]),/category/i);
 assert.throws(()=>buildBuyerWorksheet('CRM',[]),/select/i);
});
test('rejects cross-category selections, unknown ids and duplicates', () => {
 const crm=criteriaFor('CRM')[0].id;
 const hosting=criteriaFor('Hosting')[0].id;
 assert.throws(()=>buildBuyerWorksheet('CRM',[hosting]),/criterion/i);
 assert.throws(()=>buildBuyerWorksheet('CRM',['unknown']),/criterion/i);
 assert.throws(()=>buildBuyerWorksheet('CRM',[crm,crm]),/duplicate/i);
});
test('rejects invalid input types and excessive selection', () => {
 assert.throws(()=>buildBuyerWorksheet('CRM','oops'),/array/i);
 assert.throws(()=>buildBuyerWorksheet('CRM',null),/array/i);
 assert.throws(()=>buildBuyerWorksheet('CRM',Array(100).fill('x')),/too many/i);
});
test('no vendor ranking, commissions, tracking endpoints, or specific product claims are exported', () => {
 for (const category of listCategories()) {
   const result=buildBuyerWorksheet(category,criteriaFor(category).map(x=>x.id));
   assert.doesNotMatch(result,/hubspot|pipedrive|semrush|ahrefs|kinsta|cloudways|https?:|utm_|affiliateUrl|commission/i);
 }
});
test('read-only criteria snapshots cannot alter future worksheet output', () => {
 const first=criteriaFor('SEO'),before=JSON.stringify(first);
 first[0].label='Injected seller claim';
 first.push({id:'bad',label:'Bad',question:'Bad?'});
 assert.notEqual(first[0].label,criteriaFor('SEO')[0].label);
 assert.ok(!buildBuyerWorksheet('SEO',[criteriaFor('SEO')[0].id]).includes('Injected seller claim'));
 assert.ok(before.includes('label'));
});
