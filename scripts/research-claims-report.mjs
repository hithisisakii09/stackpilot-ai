/**
 * Read-only first-party vendor documentation intake.
 * Not editorial approval, pricing evidence, or an affiliate activation script.
 */
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/catalog-validation.mjs';
import { buildResearchClaimReviewQueue } from '../src/lib/research-claims.mjs';

const load = name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const products=load('src/data/products.json');
const claims=load('src/data/research-claims.json');
validateCatalog(products);
const queue=buildResearchClaimReviewQueue(claims,products);
const report={
 reportKind:'unapproved-vendor-documentation-intake',
 reviewedOn:null,
 approvedClaims:0,
 monetizationEnabled:false,
 sourcesRecordedForReview:claims.length,
 productsAwaitingReview:queue.filter(x=>x.status==='Unreviewed').length,
 independentTestingCompleted:false,
 queue
};
if(process.argv.includes('--json')){
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
}else{
 console.log('StackPilot AI — internal vendor-documentation intake, NOT independently verified');
 console.log('Claim candidates:',report.sourcesRecordedForReview,'| Approved claims: 0');
 for(const item of queue){
  console.log(item.productName,':',item.candidateCount,'vendor statement(s); refresh needed:',item.needsRefresh);
 }
 console.log('No publication, review approval, account action, affiliate tracking, or spending occurred.');
}
