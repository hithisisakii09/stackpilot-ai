/**
 * Manual intake from private local JSON on stdin.
 * --proposal: requires human-written relevance note and date.
 * --capture: requires an existing source proposal and human-supplied excerpt.
 * Output is a draft ONLY. No data files are written or vendor sites fetched.
 */
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {
 prepareManualSourceProposal,prepareManualEvidenceCapture
} from '../src/lib/manual-research-intake.mjs';

const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const args=process.argv.slice(2);
if(args.length!==1||!['--proposal','--capture'].includes(args[0])){
 console.error('Usage: npm run research:intake -- --proposal|--capture < private-input.json');
 process.exitCode=1;
}else{
 try{
  // Limit input size to keep this an intentionally small, local manual form.
  const raw=readFileSync(0,'utf8');
  if(Buffer.byteLength(raw,'utf8')>8192)throw new Error('Manual research input exceeds the 8 KiB limit');
  const input=JSON.parse(raw);
  const inputs={
   products:load('../src/data/products.json'),
   researchClaims:load('../src/data/research-claims.json'),
   revocations:load('../src/data/research-source-revocations.json'),
   ledger:load('../src/data/comparison-evidence.json'),
   triage:load('../src/data/editorial-triage.json'),
   proposals:load('../src/data/comparison-source-proposals.json'),
   captures:load('../src/data/comparison-evidence-captures.json'),
   pairs:COMPARISON_PAIRS
  };
  const report=args[0]==='--proposal'?
   prepareManualSourceProposal(input,inputs):
   prepareManualEvidenceCapture(input,inputs);
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
 }catch(error){
  // Avoid echoing manually supplied candidate assertion/excerpt values on error.
  console.error('Private manual research draft rejected:',
   error instanceof Error?error.message:'Invalid input');
  process.exitCode=1;
 }
}
