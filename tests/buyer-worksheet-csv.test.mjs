import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {criteriaFor, buildBuyerWorksheet} from '../src/lib/buyer-worksheet.mjs';
import * as worksheet from '../src/lib/buyer-worksheet.mjs';

test('CSV builder exports selected-only requirements in stable category order',()=>{
  assert.equal(typeof worksheet.buildBuyerWorksheetCsv,'function','CSV builder must be implemented');
  const all=criteriaFor('Hosting');
  const csv=worksheet.buildBuyerWorksheetCsv('Hosting',[all[2].id,all[0].id]);
  const rows=csv.trimEnd().split('\r\n');
  assert.equal(rows.length,3);
  assert.equal(rows[0],'category,requirement_id,requirement,question,verification_status,vendor_answer,evidence_plan_region_date');
  assert.ok(rows[1].includes(all[0].id),'Criteria follow catalog ordering');
  assert.ok(rows[2].includes(all[2].id),'Second selected criterion follows catalog ordering');
  assert.ok(!csv.includes(all[1].id),'Unselected requirement should not export');
  assert.ok(rows.slice(1).every(row=>row.includes(',"Unverified","",""')),'Export never asserts vendor verification');
  assert.doesNotMatch(csv,/https?:|hubspot|pipedrive|semrush|ahrefs|cloudways|kinsta|affiliate/i);
});

test('CSV builder retains existing category/selection validation',()=>{
  assert.equal(typeof worksheet.buildBuyerWorksheetCsv,'function','CSV builder must be implemented');
  const crm=criteriaFor('CRM')[0].id, hosting=criteriaFor('Hosting')[0].id;
  for(const bad of [[],[crm,crm],[hosting],['unknown']]){
    assert.throws(()=>worksheet.buildBuyerWorksheetCsv('CRM',bad));
  }
  assert.throws(()=>worksheet.buildBuyerWorksheetCsv('None',[crm]),/category/i);
  assert.throws(()=>worksheet.buildBuyerWorksheetCsv('CRM',null),/array/i);
  assert.match(buildBuyerWorksheet('CRM',[crm]),/Category: CRM/);
});

test('CSV cell escaping is spreadsheet-formula-safe and lossless for commas, quotes and newlines',()=>{
  assert.equal(typeof worksheet.escapeSpreadsheetCsvCell,'function','CSV escaping helper must be implemented');
  const cell=worksheet.escapeSpreadsheetCsvCell;
  assert.equal(cell('plain'),'"plain"');
  assert.equal(cell('value, "quoted"\ncontinued'),'"value, ""quoted""\ncontinued"');
  for(const malicious of ['=1+2','+SUM(1,2)','-1+2','@SUM(1,2)','  =HYPERLINK(1)','\t=cmd','\r\n+evil']){
    assert.ok(cell(malicious).startsWith('"\''),'Formula-like cells must be prefixed with apostrophe: '+JSON.stringify(malicious));
    assert.ok(cell(malicious).endsWith('"'));
  }
});

test('private worksheet UI provides locally generated CSV and prevents stale exports',()=>{
  const html=readFileSync('src/pages/tools/requirements-checklist/index.astro','utf8');
  assert.match(html,/id="download-worksheet-csv"[^>]*disabled/);
  assert.match(html,/buildBuyerWorksheetCsv/);
  assert.match(html,/new Blob\(/);
  assert.match(html,/URL\.createObjectURL/);
  assert.match(html,/URL\.revokeObjectURL/);
  assert.match(html,/choices\.addEventListener\('change'/);
  assert.match(html,/downloadButton\.disabled=true/);
  assert.match(html,/saved on your device/i);
  assert.match(html,/no server submission/i);
});
