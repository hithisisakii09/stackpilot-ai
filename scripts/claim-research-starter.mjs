/**
 * Read-only, offline, private per-claim research starter.
 * Default output deliberately excludes raw unsourced candidate assertions.
 * --json exposes them ONLY to local private research; never copy to dist/.
 */
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {buildClaimResearchStarter} from '../src/lib/claim-research-starter.mjs';

const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const args=process.argv.slice(2);
const flags=new Map();
let error=null;
for(let i=0;i<args.length;i++){
 const key=args[i];
 if(!['--claim','--vendor','--json'].includes(key)||flags.has(key)){
  error='Unknown or duplicated research-starter argument';
  break;
 }
 if(key==='--json'){
  flags.set(key,true);
 }else{
  if(i+1>=args.length||args[i+1].startsWith('--')){
   error='Missing required comparison claim or vendor value';
   break;
  }
  flags.set(key,args[++i]);
 }
}
if(error||!flags.has('--claim')||!flags.has('--vendor')){
 console.error(error??'Usage: npm run research:claim-starter -- --claim <claimId> --vendor <productId> [--json]');
 process.exitCode=1;
}else{
 try{
  const report=buildClaimResearchStarter({
   claimId:flags.get('--claim'),
   productId:flags.get('--vendor'),
   products:read('../src/data/products.json'),
   researchClaims:read('../src/data/research-claims.json'),
   revocations:read('../src/data/research-source-revocations.json'),
   ledger:read('../src/data/comparison-evidence.json'),
   triage:read('../src/data/editorial-triage.json'),
   proposals:read('../src/data/comparison-source-proposals.json'),
   captures:read('../src/data/comparison-evidence-captures.json'),
   pairs:COMPARISON_PAIRS
  });
  if(flags.get('--json')){
   process.stdout.write(JSON.stringify(report,null,2)+'\n');
  }else{
   console.log('PRIVATE RESEARCH STARTER — ALL SOURCES UNVERIFIED, NO APPROVAL, NO PUBLICATION');
   console.log('Claim:',report.claimId,'| Vendor:',report.productName,'| Dimension:',report.dimension);
   console.log('Stage:',report.stage,'| Next manual action:',report.nextAction);
   console.log('Existing proposed source associations:',report.existingProposedLeadIds.length);
   console.log('Unverified vendor documentation leads for consideration:',report.vendorLeads.length);
   for(const lead of report.vendorLeads){
    console.log(lead.researchLeadId,'| risk:',lead.risk,
     '| proposed for this claim:',lead.proposedForClaim,
     '| URL (not verified):',lead.sourceUrl);
   }
   console.log('Source relevance must be established by manual inspection, never inferred from the vendor name.');
   console.log('Use --json locally to view the PRIVATE raw candidate assertion and unfilled intake templates.');
  }
 }catch{
  // The candidate content must never be included in failure output.
  console.error('Private research starter rejected: invalid claim/vendor or research data');
  process.exitCode=1;
 }
}
