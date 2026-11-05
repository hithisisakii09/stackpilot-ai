/**
 * Read-only private development tool for manual, claim-level research triage.
 * --csv/--json emit UNVERIFIED candidate assertions. Keep stdout private.
 * No fetching, payment, file writes, approvals, publishing or contact.
 */
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {
 buildComparisonGapWorklist,serializeComparisonGapCsv
} from '../src/lib/comparison-gap-worklist.mjs';

const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const worklist=buildComparisonGapWorklist({
 products:load('../src/data/products.json'),
 ledger:load('../src/data/comparison-evidence.json'),
 triage:load('../src/data/editorial-triage.json'),
 researchClaims:load('../src/data/research-claims.json'),
 revocations:load('../src/data/research-source-revocations.json'),
 proposals:load('../src/data/comparison-source-proposals.json'),
 captures:load('../src/data/comparison-evidence-captures.json'),
 pairs:COMPARISON_PAIRS
});

const formats=process.argv.slice(2).filter(arg=>arg==='--csv'||arg==='--json');
if(formats.length>1)throw new Error('Choose one private output format: --csv OR --json');
if(process.argv.slice(2).some(arg=>!['--csv','--json'].includes(arg)))
 throw new Error('Unknown worklist argument');
if(formats[0]==='--csv'){
 process.stdout.write(serializeComparisonGapCsv(worklist));
}else if(formats[0]==='--json'){
 process.stdout.write(JSON.stringify(worklist,null,2)+'\n');
}else{
 console.log('PRIVATE RESEARCH ONLY — NO SOURCE VERIFIED, NO EDITORIAL APPROVAL, NO PUBLICATION');
 console.log('Vendor-specific claims:',worklist.totalClaims,
  '| need source leads:',worklist.withoutProposals,
  '| need manual excerpts:',worklist.awaitingManualCapture,
  '| need independent review:',worklist.awaitingIndependentVerification,
  '| source refresh needed:',worklist.requiringSourceRefresh,
  '| rejected:',worklist.rejected);
 for(const row of worklist.rows)
  console.log(row.key+' | '+row.stage+' | '+row.nextAction);
 console.log('Use --csv to produce a PRIVATE manual worksheet. --json includes raw unverified assertions.');
}
