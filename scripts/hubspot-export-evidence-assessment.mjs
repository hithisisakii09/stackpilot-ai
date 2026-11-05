/**
 * PRIVATE, read-only four-predicate research checklist for HubSpot export.
 * Default summary intentionally omits the raw unverified candidate assertion.
 * --json emits private research; do not publish or store in browser assets.
 */
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {buildHubspotExportAssessment} from '../src/lib/hubspot-export-evidence-assessment.mjs';

const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const args=process.argv.slice(2);
if(args.length>1||(args.length===1&&args[0]!=='--json')){
 console.error('Usage: npm run research:hubspot-export-checklist -- [--json]');
 process.exitCode=1;
}else{
 try{
  const report=buildHubspotExportAssessment({
   claimId:'comparison-hubspot-vs-pipedrive-05',
   productId:'hubspot',
   products:load('../src/data/products.json'),
   ledger:load('../src/data/comparison-evidence.json'),
   triage:load('../src/data/editorial-triage.json'),
   researchClaims:load('../src/data/research-claims.json'),
   revocations:load('../src/data/research-source-revocations.json'),
   proposals:load('../src/data/comparison-source-proposals.json'),
   captures:load('../src/data/comparison-evidence-captures.json'),
   pairs:COMPARISON_PAIRS
  });
  if(args[0]==='--json'){
   process.stdout.write(JSON.stringify(report,null,2)+'\n');
  }else{
   console.log('PRIVATE HUBSPOT EXPORT RESEARCH — UNVERIFIED, NO EDITORIAL APPROVAL');
   console.log('Claim:',report.claimId,'| research stage:',report.stage);
   console.log('Candidate source proposals:',report.unassignedResearchLeadIds.length,
    '| manual excerpts (unassigned, unverified):',report.unassignedCaptureIds.length);
   for(const predicate of report.predicates){
    console.log('\n'+predicate.predicateId+': '+predicate.status);
    for(const question of predicate.questions)console.log(' - '+question);
   }
   console.log('\nExisting vendor-documentation leads are NOT evidence for any predicate:');
   for(const lead of report.vendorLeads){
    console.log(' - '+lead.researchLeadId+' | '+lead.risk+
     ' | proposed for combined claim: '+lead.proposedForClaim);
   }
   console.log('Four independent human assessments are needed; no automatic source attribution or publishing is possible.');
   console.log('Use --json ONLY in private development to inspect the unverified original candidate assertion.');
  }
 }catch{
  console.error('Private HubSpot export assessment rejected: claim, source or research data invalid');
  process.exitCode=1;
 }
}
