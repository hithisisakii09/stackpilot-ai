/**
 * Offline structural consistency report only. No authenticated reviewer,
 * externally anchored audit log, editorial approval or network activity.
 */
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {validateEditorialReviewHistory} from '../src/lib/editorial-review-history.mjs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const report=validateEditorialReviewHistory({
 history:read('../src/data/editorial-review-history.json'),
 ledger:read('../src/data/comparison-evidence.json'),
 pairs:COMPARISON_PAIRS,
 products:read('../src/data/products.json')
});
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else console.log(
 'INTERNAL LOCAL REVIEW HISTORY — NOT AUTHENTICATED OR EXTERNALLY ANCHORED\n'+
 'Events: '+report.events+' | Local chain consistent: '+report.localChainConsistent+
 ' | Reviewer authenticated: '+report.reviewerAuthenticated+
 ' | Approved claims: '+report.authenticatedApprovals
);
