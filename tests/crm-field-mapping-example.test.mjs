import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('CRM field mapping example uses synthetic identifiers and has a guide link',()=>{
  const csv=readFileSync('public/examples/crm-field-mapping-synthetic.csv','utf8').trim().split(/\r?\n/);
  assert.equal(csv[0], 'source_field,target_field,sample_value,validation_note');
  assert.equal(csv.length, 5);
  for(const row of csv.slice(1)){
    assert.ok(row.split(',').length===4,'each row should have four columns');
    assert.doesNotMatch(row, /@|https?:|password|token|secret|\+\d{8}/i,'No contact details or credentials');
  }
  assert.match(csv.join('\n'), /SYNTHETIC_/);
  const html=readFileSync('src/pages/guides/crm-migration-checklist/index.astro','utf8');
  assert.match(html,/href="\/examples\/crm-field-mapping-synthetic.csv"/);
  assert.match(html,/fictional|synthetic/i);
});
