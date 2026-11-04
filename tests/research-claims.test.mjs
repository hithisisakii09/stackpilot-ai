import test from 'node:test';
import assert from 'node:assert/strict';
import products from '../src/data/products.json' with { type:'json' };
import {validateResearchClaims,buildResearchClaimReviewQueue} from '../src/lib/research-claims.mjs';

const url = {
  hubspot:'https://knowledge.hubspot.com/import-and-export/export-records',
  pipedrive:'https://support.pipedrive.com/en/article/importing-data-into-pipedrive-with-spreadsheets',
  ahrefs:'https://help.ahrefs.com/en/articles/3119402-how-are-crawl-credits-in-site-audit-spent',
  semrush:'https://www.semrush.com/kb/539-configuring-site-audit',
  kinsta:'https://kinsta.com/docs/billing/wordpress-hosting-plans/overages/',
  cloudways:'https://support.cloudways.com/en/articles/5119648-charges-for-off-site-backups'
};
const claim=(productId='hubspot')=>({
  id:productId+'-claim-1',
  productId,
  sourceUrl:url[productId],
  statement:'The vendor describes a documented workflow or limitation requiring plan-specific verification.',
  caveat:'This is a vendor statement and not independently tested, priced or editor-approved.',
  recordedOn:'2026-10-31',
  status:'candidate',
  approved:false,
  reviewer:null,
  reviewedAt:null
});
const all=()=>Object.keys(url).map(claim);
const opts={today:'2026-10-31'};
test('accepts six candidate-only vendor documentation leads',()=>{
 assert.equal(validateResearchClaims(all(),products,opts),6);
 const result=buildResearchClaimReviewQueue(all(),products,opts);
 assert.equal(result.length,6);
 assert.ok(result.every(x=>x.status==='Unreviewed'&&x.approvedClaims===0));
});
test('each product remains a candidate; no verified claim or affiliate is inferred',()=>{
 const q=buildResearchClaimReviewQueue(all(),products,opts);
 assert.equal(q.reduce((sum,row)=>sum+row.candidateCount,0),6);
 assert.ok(q.every(row=>!Object.hasOwn(row,'affiliateUrl')&&!Object.hasOwn(row,'approved')));
});
test('rejects cross-vendor source attribution and unknown product',()=>{
 const c=claim('pipedrive');c.sourceUrl=url.kinsta;
 assert.throws(()=>validateResearchClaims([c],products,opts),/source|domain/i);
 const bad=claim();bad.productId='other';
 assert.throws(()=>validateResearchClaims([bad],products,opts),/product/i);
});
test('rejects insecure, tracking, and credential-bearing URLs',()=>{
 for(const sourceUrl of [
  'http://knowledge.hubspot.com/import-and-export/export-records',
  url.hubspot+'?utm_source=paid',
  url.hubspot+'#ref',
  'https://name:pw@knowledge.hubspot.com/import-and-export/export-records'
 ]){
   const c=claim();c.sourceUrl=sourceUrl;
   assert.throws(()=>validateResearchClaims([c],products,opts),/source|url/i);
 }
});
test('rejects duplicate IDs and undeclared field injection',()=>{
 const duplicate=[claim(),claim()];
 assert.throws(()=>validateResearchClaims(duplicate,products,opts),/duplicate/i);
 const c={...claim(),commission:100};
 assert.throws(()=>validateResearchClaims([c],products,opts),/field|property/i);
});
test('rejects fabricated editorial approval and reviewer metadata',()=>{
 for(const [key,value] of Object.entries({approved:true,status:'approved',reviewer:'Fake Editor',reviewedAt:'2026-10-31'})){
  const c={...claim(),[key]:value};
  assert.throws(()=>validateResearchClaims([c],products,opts),/approved|review|status|candidate/i);
 }
});
test('rejects future or impossible dates',()=>{
 for(const recordedOn of ['2099-01-01','2026-02-30','2026-10-32']){
  const c={...claim(),recordedOn};
  assert.throws(()=>validateResearchClaims([c],products,opts),/date/i);
 }
});
test('requires meaningful plain-text claim and caveat, no marketing price assertions',()=>{
 for(const [key,value] of [
  ['statement','short'],['caveat',''],['statement','<script>alert(1)</script>'],
  ['statement','The cheapest guaranteed product for every business is $99/month.']
 ]){
  const c={...claim(),[key]:value};
  assert.throws(()=>validateResearchClaims([c],products,opts),/statement|caveat|claim|price|marketing/i);
 }
});
test('source intake becomes refresh-needed without implying verified status',()=>{
 const q=buildResearchClaimReviewQueue(all(),products,{today:'2027-03-15',staleAfterDays:90});
 assert.ok(q.every(x=>x.needsRefresh && x.status==='Unreviewed'));
});
test('queue is stable and does not mutate source arrays',()=>{
 const entries=all().reverse(), before=structuredClone(entries);
 const result=buildResearchClaimReviewQueue(entries,products,opts);
 assert.deepEqual(entries,before);
 assert.deepEqual(result.map(x=>x.productName),[...result.map(x=>x.productName)].sort((a,b)=>a.localeCompare(b)));
});
test('rejects invalid freshness threshold and date reference',()=>{
 assert.throws(()=>buildResearchClaimReviewQueue(all(),products,{today:'2026-02-30'}),/date/i);
 assert.throws(()=>buildResearchClaimReviewQueue(all(),products,{...opts,staleAfterDays:0}),/stale/i);
});

test('rejects duplicate catalog IDs before attributing evidence',()=>{
 const duplicated=[products[0],products[0],...products.slice(1)];
 assert.throws(()=>validateResearchClaims(all(),duplicated,opts),/duplicate product/i);
});

test('Kinsta candidate cites accessible first-party plan documentation without approval', async () => {
 const {default:records}=await import('../src/data/research-claims.json',{with:{type:'json'}});
 const entry=records.find(x=>x.productId==='kinsta');
 assert.equal(entry.sourceUrl,'https://kinsta.com/docs/billing/wordpress-hosting-plans/');
 assert.equal(entry.status,'candidate');
 assert.equal(entry.approved,false);
 assert.equal(entry.reviewer,null);
});
