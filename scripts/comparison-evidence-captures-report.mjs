/**
 * Read-only private manual research-excerpt report. No network fetch, source
 * verification, authorization, new files, reviewer identity, or publication.
 * --json includes raw internal excerpts: never publish or upload its output.
 */
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {buildComparisonEvidenceCaptureReport} from '../src/lib/comparison-evidence-captures.mjs';

const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const report=buildComparisonEvidenceCaptureReport({
 captures:load('../src/data/comparison-evidence-captures.json'),
 proposals:load('../src/data/comparison-source-proposals.json'),
 ledger:load('../src/data/comparison-evidence.json'),
 triage:load('../src/data/editorial-triage.json'),
 researchClaims:load('../src/data/research-claims.json'),
 revocations:load('../src/data/research-source-revocations.json'),
 products:load('../src/data/products.json'),
 pairs:COMPARISON_PAIRS
});

if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else{
 console.log('PRIVATE INTERNAL MANUAL EXCERPTS — NOT VERIFIED OR APPROVED');
 console.log('Captured:',report.totalCaptures,'| Claims with candidate excerpts:',
  report.claimsWithExcerpts,'| Claims without:',report.claimsWithoutExcerpts);
 for(const row of report.records){
  console.log(row.captureId+' | '+row.claimId+':'+row.productId+
   ' | source risk: '+row.researchLeadRisk+' | independently verified: false');
 }
}
