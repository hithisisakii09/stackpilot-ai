/**
 * Read-only, offline validator for the human-filled, PRIVATE four-row CSV.
 * Never updates registers, fetches HubSpot, promotes excerpts, or approves.
 *
 * npm run research:hubspot-worksheet-check < /private/worksheet.csv
 */
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {buildHubspotExportAssessment} from '../src/lib/hubspot-export-evidence-assessment.mjs';
import {assessManuallyCompletedHubspotWorksheet} from '../src/lib/hubspot-manual-worksheet-check.mjs';

const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
if(process.argv.length!==2){
 console.error('Usage: npm run research:hubspot-worksheet-check < private-worksheet.csv');
 process.exitCode=1;
}else{
 try{
  const bytes=readFileSync(0);
  if(bytes.length>32768)throw new Error('Input too large');
  const csv=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  const assessment=buildHubspotExportAssessment({
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
  const result=assessManuallyCompletedHubspotWorksheet({csv,assessment});
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
 }catch{
  // Untrusted local fields may contain sensitive excerpts and private notes.
  console.error('Private HubSpot worksheet rejected; check CSV structure and unverified manual source fields');
  process.exitCode=1;
 }
}
