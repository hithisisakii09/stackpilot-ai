/**
 * Offline-only internal review packets. Candidate assertions are UNSOURCED.
 * Never publish this output or treat it as authenticated editorial approval.
 */
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {buildComparisonReviewPackets} from '../src/lib/comparison-review-packets.mjs';
const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const report=buildComparisonReviewPackets({
 products:load('../src/data/products.json'),
 ledger:load('../src/data/comparison-evidence.json'),
 triage:load('../src/data/editorial-triage.json'),
 researchClaims:load('../src/data/research-claims.json'),
 revocations:load('../src/data/research-source-revocations.json'),
 proposals:load('../src/data/comparison-source-proposals.json'),
 pairs:COMPARISON_PAIRS
});
if(process.argv.includes('--json')){
 console.log(JSON.stringify(report,null,2));
}else{
 console.log('PRIVATE INTERNAL CANDIDATES — NO SOURCE VERIFIED, NO APPROVAL, NO PUBLICATION');
 console.log('Claims:',report.totalClaims,'| Proposed leads:',report.proposedSources,'| Without leads:',report.claimsWithoutProposals);
 for(const p of report.packets){
  console.log('\n'+p.key+' | '+p.dimension+' | '+p.triageDecision);
  console.log('UNVERIFIED candidate assertion:',p.candidateAssertion);
  console.log('Research task:',p.reviewQuestion);
  console.log('Unreviewed lead proposals:',p.proposedSources.length);
 }
}
