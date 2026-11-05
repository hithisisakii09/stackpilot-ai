import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {buildComparisonReviewQueue} from '../src/lib/comparison-evidence.mjs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const products=read('../src/data/products.json');
const entries=read('../src/data/comparison-evidence.json');
const queue=buildComparisonReviewQueue(entries,COMPARISON_PAIRS,products);
if(process.argv.includes('--json'))console.log(JSON.stringify({status:'unapproved-review-only',total:queue.length,approved:0,items:queue},null,2));
else{
 console.log('StackPilot comparison evidence — REVIEW ONLY, 0 approved');
 console.log('Candidate dimensions awaiting specific sources:',queue.length);
 for(const item of queue)console.log(item.key+' | '+item.reviewQuestion);
}
