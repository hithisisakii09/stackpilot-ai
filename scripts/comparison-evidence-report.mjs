import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {buildEditorialTriageQueue} from '../src/lib/editorial-triage.mjs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const products=read('../src/data/products.json');
const entries=read('../src/data/comparison-evidence.json');
const triage=read('../src/data/editorial-triage.json');
const queue=buildEditorialTriageQueue(triage,entries,COMPARISON_PAIRS,products);
if(process.argv.includes('--json'))console.log(JSON.stringify({status:'unapproved-review-only',total:queue.length,approved:0,authenticatedApprovals:0,rejected:queue.filter(x=>x.triageDecision==='rejected').length,items:queue},null,2));
else{
 console.log('StackPilot comparison evidence — REVIEW ONLY, 0 approved');
 console.log('Candidate dimensions awaiting specific sources:',queue.length);
 console.log('Negative triage records:',triage.length,'| Rejected:',queue.filter(x=>x.triageDecision==='rejected').length);
 for(const item of queue)console.log(item.key+' | '+item.reviewQuestion);
}
