import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {
 buildHubspotExportAssessment,serializeHubspotExportWorksheetCsv
} from '../src/lib/hubspot-export-evidence-assessment.mjs';
import {assessManuallyCompletedHubspotWorksheet} from '../src/lib/hubspot-manual-worksheet-check.mjs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const researchClaims=read('../src/data/research-claims.json');
const inputs={
 claimId:'comparison-hubspot-vs-pipedrive-05',productId:'hubspot',
 products:read('../src/data/products.json'),
 ledger:read('../src/data/comparison-evidence.json'),
 triage:read('../src/data/editorial-triage.json'),
 researchClaims,
 revocations:read('../src/data/research-source-revocations.json'),
 proposals:read('../src/data/comparison-source-proposals.json'),
 captures:read('../src/data/comparison-evidence-captures.json'),
 pairs:COMPARISON_PAIRS,today:'2026-11-05'
};
const report=buildHubspotExportAssessment(inputs);
const blank=serializeHubspotExportWorksheetCsv(report);
const ids=['deals-csv-export','contacts-csv-export','companies-csv-export','api-data-sync'];
const sample='SYNTHETIC TEST SENTENCE: this was never quoted from an actual vendor and cannot prove a feature.';
const quote=text=>'"'+text.replaceAll('"','""')+'"';
function edit(csv,rowIndex,values){
 const rows=csv.split('\r\n');
 const tail=Array(8).fill('""').join(',');
 const line=rows[rowIndex+1];
 assert.ok(line.endsWith(tail));
 rows[rowIndex+1]=line.slice(0,-tail.length)+values.map(quote).join(',');
 return rows.join('\r\n');
}
const full=[
 researchClaims[0].sourceUrl,
 '2026-11-05',
 'Synthetic plan for testing only',
 'Synthetic region for testing only',
 'User permissions unverified; test only',
 sample,
 'This is not actual vendor evidence; needs independent validation.',
 'OBSERVED-UNVERIFIED'
];
const assess=(csv,changes={})=>assessManuallyCompletedHubspotWorksheet({
 csv,assessment:report,today:'2026-11-05',...changes
});

test('fresh untouched four-row CSV reports four gaps, no source attribution or approvals',()=>{
 const before=blank;
 const output=assess(blank);
 assert.equal(output.status,'PRIVATE-MANUAL-WORKSHEET-UNVERIFIED');
 assert.equal(output.claimId,inputs.claimId);
 assert.equal(output.totalPredicates,4);
 assert.equal(output.rowsWithoutHumanObservations,4);
 assert.equal(output.reportedObservations,0);
 assert.equal(output.reportedContradictions,0);
 assert.equal(output.independentlyVerifiedPredicates,0);
 assert.equal(output.authenticatedApprovals,0);
 assert.equal(output.approved,false);
 assert.equal(output.canPublish,false);
 assert.equal(output.sourceVerified,false);
 assert.equal(output.publicationAllowed,false);
 assert.deepEqual(output.rows.map(r=>r.predicateId),ids);
 for(const row of output.rows){
  assert.equal(row.status,'NEEDS-EVIDENCE');
  assert.equal(row.recordingState,'NO-HUMAN-OBSERVATION');
  assert.equal(row.claimedSourceLeadMatched,false);
  assert.equal(row.existingProposalForSource,false);
  assert.equal(row.independentlyVerified,false);
  assert.equal(row.reviewerAuthenticated,false);
  assert.equal(row.supportsPredicateVerified,false);
  assert.equal(row.canPublish,false);
 }
 assert.deepEqual(assess(blank),output);
 assert.equal(blank,before);
});

test('one syntactically complete user-reported observation remains unverified',()=>{
 const csv=edit(blank,0,full);
 const output=assess(csv);
 assert.equal(output.reportedObservations,1);
 assert.equal(output.rowsWithoutHumanObservations,3);
 assert.equal(output.independentlyVerifiedPredicates,0);
 assert.equal(output.canPublish,false);
 assert.equal(output.rows[0].recordingState,'HUMAN-OBSERVATION-CLAIMED-UNVERIFIED');
 assert.equal(output.rows[0].claimedSourceLeadMatched,true);
 assert.equal(output.rows[0].existingProposalForSource,false);
 assert.deepEqual(output.rows[0].missingFields,[]);
 assert.equal(output.rows[0].supportsPredicateVerified,false);
 assert.equal(JSON.stringify(output).includes(sample),false);
 assert.equal(JSON.stringify(output).includes(full[0]),false);
 assert.equal(JSON.stringify(output).includes(full[6]),false);
});

test('contradiction can be reported on a separate HubSpot URL without creating a lead or verified claim',()=>{
 const fields=[...full];
 fields[0]='https://developers.hubspot.com/docs/api/crm/objects';
 fields[7]='CONTRADICTION-REPORTED-UNVERIFIED';
 const output=assess(edit(blank,3,fields));
 assert.equal(output.reportedContradictions,1);
 assert.equal(output.reportedObservations,0);
 assert.equal(output.rows[3].recordingState,'HUMAN-CONTRADICTION-CLAIMED-UNVERIFIED');
 assert.equal(output.rows[3].claimedSourceLeadMatched,false);
 assert.equal(output.rows[3].existingProposalForSource,false);
 assert.equal(output.approved,false);
 assert.equal(output.canPublish,false);
});

test('incomplete source entries, unknown scopes and declared observation without excerpt are gaps',()=>{
 const partial=[full[0],full[1],'unknown','unknown','','','','OBSERVED-UNVERIFIED'];
 const output=assess(edit(blank,1,partial));
 assert.equal(output.reportedObservations,0);
 assert.equal(output.rows[1].recordingState,'PARTIAL-LOCAL-NOTES');
 assert.ok(output.rows[1].missingFields.includes('plan'));
 assert.ok(output.rows[1].missingFields.includes('region'));
 assert.ok(output.rows[1].missingFields.includes('permissionScope'));
 assert.ok(output.rows[1].missingFields.includes('excerpt'));
 assert.ok(output.rows[1].missingFields.includes('limitations'));
 assert.equal(output.canPublish,false);
});

test('strict CSV shape and canonical unverified questions cannot be overwritten by hand',()=>{
 const editText=(from,to)=>blank.replace(from,to);
 for(const csv of [
  blank.replace('"Predicate ID (PRIVATE)"','"Verified?"'),
  editText('"deals-csv-export"','"contacts-csv-export"'),
  editText('"NEEDS-EVIDENCE"','"SUPPORTED"'),
  editText('"Deals — CSV record export"','"Deals fully verified"'),
  blank.replace('\r\n','\n'),
  blank.replace(/\r\n$/,''),
  blank+'\r\n',
  blank+'x',
  '',
  'a'.repeat(40000),
  blank.replace('Does an actual official vendor source','Claim is now approved'),
  blank.replace('""'+',""'.repeat(7),'""'+',""'.repeat(8))
 ])assert.throws(()=>assess(csv),/worksheet|CSV|shape|format|header/i);
});

test('reject malformed dates, unsafe source origins and disallowed dispositions',()=>{
 for(const [field,value] of [
  [0,'https://not-hubspot.example.com/export'],
  [0,'http://knowledge.hubspot.com/export'],
  [0,'https://evil.invalid@knowledge.hubspot.com/export'],
  [0,'https://knowledge.hubspot.com/export?secret=x'],
  [0,'https://knowledge.hubspot.com/export#secret'],
  [1,'2026-11-06'],[1,'2026-02-30'],[1,'today'],
  [7,'APPROVED'],[7,'VERIFIED'],[7,'RELEASE'],
  [5,'short'],[5,'<script>alert(1)</script>'],[5,report.candidateAssertion],
  [4,'=SUM(1,1)'],[6,'\u200B+HYPERLINK("x","y")']
 ]){
  const fields=[...full];fields[field]=value;
  assert.throws(()=>assess(edit(blank,0,fields)),/private|source|date|excerpt|disposition|worksheet/i);
 }
 assert.throws(()=>assess(blank,{today:'2026-02-30'}),/date|today/i);
});

test('CSV quoted commas and doubled quotes work without returning researcher notes',()=>{
 const fields=[...full];
 fields[6]='Synthetic notes, with "quoted details", are private and unverified.';
 const output=assess(edit(blank,2,fields));
 assert.equal(output.reportedObservations,1);
 assert.equal(output.rows[2].recordingState,'HUMAN-OBSERVATION-CLAIMED-UNVERIFIED');
 assert.equal(JSON.stringify(output).includes(fields[6]),false);
});

test('no input changes existing source proposal, evidence ledger or review register',()=>{
 const original=JSON.stringify({ledger:inputs.ledger,proposals:inputs.proposals,captures:inputs.captures});
 const output=assess(edit(blank,0,full));
 assert.equal(output.authenticatedApprovals,0);
 assert.equal(JSON.stringify({ledger:inputs.ledger,proposals:inputs.proposals,captures:inputs.captures}),original);
});

test('stdin-only command accepts blank and locally reported observations without leaking excerpt',()=>{
 const script=fileURLToPath(new URL('../scripts/hubspot-manual-worksheet-check.mjs',import.meta.url));
 const execute=(data,...args)=>spawnSync(process.execPath,[script,...args],{encoding:'utf8',input:data});
 const empty=execute(blank);
 assert.equal(empty.status,0,empty.stderr);
 assert.equal(JSON.parse(empty.stdout).rowsWithoutHumanObservations,4);
 const observation=execute(edit(blank,0,full));
 assert.equal(observation.status,0,observation.stderr);
 assert.equal(JSON.parse(observation.stdout).reportedObservations,1);
 assert.equal(observation.stdout.includes(sample),false);
 assert.equal(observation.stdout.includes(full[0]),false);
 for(const [csv,args] of [
  [blank,['--approve']],[blank,['--publish']],
  [edit(blank,0,[...full.slice(0,7),'APPROVED']),[]],
  ['not CSV',[]]
 ]){
  const result=execute(csv,...args);
  assert.notEqual(result.status,0);
  assert.equal(result.stdout.includes(sample),false);
  assert.equal(result.stderr.includes(sample),false);
  assert.equal(result.stderr.includes(full[0]),false);
 }
});

test('manual assessor is not imported by browser comparison pages',()=>{
 for(const path of ['../src/pages/compare/index.astro','../src/pages/compare/[slug].astro']){
  const page=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.doesNotMatch(page,/hubspot-manual-worksheet-check|assessManuallyCompletedHubspotWorksheet/);
 }
});

test('worksheet refuses spreadsheet formulas and invisible Unicode controls in manual fields',()=>{
 const unsafeExcerpts=[
  '=HYPERLINK("https://unsafe.example","click")',
  '+HYPERLINK("https://unsafe.example","click")',
  '-HYPERLINK("https://unsafe.example","click")',
  '@HYPERLINK("https://unsafe.example","click")',
  '\u200B=HYPERLINK("https://unsafe.example","click")',
  '\u2060=HYPERLINK("https://unsafe.example","click")',
  'A \u202E reversed invisible control inside manual excerpt that is longer than the minimum.',
  'A \u200D zero-width joiner inserted into private manually copied excerpt text.',
  'A \u2066 isolate text with invisible ordering control within the manual excerpt.'
 ];
 for(const value of unsafeExcerpts){
  assert.ok(value.length>=40,'Adversarial excerpts must pass length checks');
  const fields=[...full];fields[5]=value;
  assert.throws(()=>assess(edit(blank,0,fields)),/private|worksheet|entry/i);
 }
 for(const [index,value] of [
  [0,'https://knowledge.hubspot.com/help\u202Eexport'],
  [2,'Synthetic plan with \u200B invisible metadata'],
  [3,'Synthetic region with \u200C invisible metadata'],
  [4,'Synthetic permission \u2060 with invisible control'],
  [6,'Synthetic caveat \u202E with deceptive directionality']
 ]){
  const fields=[...full];fields[index]=value;
  assert.throws(()=>assess(edit(blank,0,fields)),/private|worksheet|entry/i);
 }
});

test('placeholder plan, region, permissions, and caveat text never complete a research observation',()=>{
 const placeholders=['unknown','n/a','N/A','TBD','pending','not checked','not documented','not verified','unspecified','none','?','-'];
 for(const index of [2,3,4,6]){
  const key={2:'plan',3:'region',4:'permissionScope',6:'limitations'}[index];
  for(const placeholder of placeholders){
   const fields=[...full];fields[index]=placeholder;
   const assessed=assess(edit(blank,0,fields));
   assert.equal(assessed.reportedObservations,0);
   assert.equal(assessed.rowsWithoutHumanObservations,4);
   assert.equal(assessed.rows[0].recordingState,'PARTIAL-LOCAL-NOTES');
   assert.ok(assessed.rows[0].missingFields.includes(key),key+' placeholder '+placeholder);
   assert.equal(assessed.canPublish,false);
   assert.equal(assessed.rows[0].independentlyVerified,false);
  }
 }
});

test('formula-looking excerpt is rejected by stdin CLI without leaking private contents',()=>{
 const payload='=HYPERLINK("https://invalid.example","Confidential source excerpt")';
 const fields=[...full];fields[5]=payload;
 const script=fileURLToPath(new URL('../scripts/hubspot-manual-worksheet-check.mjs',import.meta.url));
 const result=spawnSync(process.execPath,[script],{
  encoding:'utf8',input:edit(blank,0,fields)
 });
 assert.notEqual(result.status,0);
 assert.equal(result.stdout.includes(payload),false);
 assert.equal(result.stderr.includes(payload),false);
 assert.equal(result.stdout.includes(full[0]),false);
});

test('reused identical source excerpt cannot count as independent observations for different predicates',()=>{
 const twice=edit(edit(blank,0,full),1,full);
 const output=assess(twice);
 assert.equal(output.reportedObservations,0);
 assert.equal(output.rowsWithoutHumanObservations,4);
 for(const row of output.rows.slice(0,2)){
  assert.equal(row.status,'NEEDS-EVIDENCE');
  assert.equal(row.recordingState,'PARTIAL-LOCAL-NOTES');
  assert.ok(row.missingFields.includes('distinctPredicateExcerpt'));
  assert.equal(row.supportsPredicateVerified,false);
 }
 assert.equal(output.canPublish,false);
 // One official source may legitimately provide separate object-specific excerpts.
 const distinct=[...full];
 distinct[5]='SYNTHETIC TEST SENTENCE for the second object, distinct from the first and never authentic vendor evidence.';
 const separate=assess(edit(edit(blank,0,full),1,distinct));
 assert.equal(separate.reportedObservations,2);
 assert.equal(separate.independentlyVerifiedPredicates,0);
 assert.equal(separate.canPublish,false);
});

test('whitespace and casing changes cannot launder a reused source excerpt into independent observations',()=>{
 const cases=[
  sample.toUpperCase(),
  sample.replace(' this was never','   this   was    never'),
  sample.replace(' this was never','\u00a0this was never')
 ];
 for(const excerpt of cases){
  const other=[...full];other[5]=excerpt;
  const output=assess(edit(edit(blank,0,full),1,other));
  assert.equal(output.reportedObservations,0);
  assert.equal(output.rowsWithoutHumanObservations,4);
  for(const row of output.rows.slice(0,2)){
   assert.equal(row.recordingState,'PARTIAL-LOCAL-NOTES');
   assert.ok(row.missingFields.includes('distinctPredicateExcerpt'));
   assert.equal(row.supportsPredicateVerified,false);
  }
  assert.equal(output.approved,false);
  assert.equal(output.canPublish,false);
 }
});

test('cosmetically changed unverified candidate assertion cannot masquerade as a vendor quotation',()=>{
 const variants=[
  report.candidateAssertion.toUpperCase(),
  report.candidateAssertion.replaceAll(' ','   '),
  report.candidateAssertion.replaceAll(' ','\u00a0'),
  'Unverified preface: '+report.candidateAssertion.toLowerCase()+' (not a source quote).'
 ];
 for(const excerpt of variants){
  const fields=[...full];fields[5]=excerpt;
  assert.throws(()=>assess(edit(blank,0,fields)),/private|worksheet|entry/i);
 }
});

test('scope-prefixed placeholders are missing evidence, but substantive caveats remain notes',()=>{
 const cases=[
  [2,'plan unknown','plan'],
  [2,'Plan: TBD','plan'],
  [3,'region pending','region'],
  [3,'Region is not checked','region'],
  [4,'permissions unspecified','permissionScope'],
  [4,'Permission: not verified','permissionScope'],
  [6,'limitations unknown','limitations'],
  [6,'Limitations: not documented','limitations']
 ];
 for(const [index,value,key] of cases){
  const fields=[...full];fields[index]=value;
  const output=assess(edit(blank,0,fields));
  assert.equal(output.reportedObservations,0);
  assert.equal(output.rows[0].recordingState,'PARTIAL-LOCAL-NOTES');
  assert.ok(output.rows[0].missingFields.includes(key),key+' '+value);
  assert.equal(output.canPublish,false);
 }
 const substantive=[...full];
 substantive[6]='Limits not documented in this excerpt; a separate documentation page must be inspected.';
 const output=assess(edit(blank,0,substantive));
 assert.equal(output.reportedObservations,1);
 assert.equal(output.independentlyVerifiedPredicates,0);
 assert.equal(output.canPublish,false);
});
