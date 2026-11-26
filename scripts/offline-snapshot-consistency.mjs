/**
 * Private offline test of a manually supplied plaintext snapshot.
 *
 * Example:
 * npm run research:snapshot-check < /private/local-snapshot-check.json
 *
 * The stdin JSON object contains {capture, snapshot:{sourceUrl,snapshotOn,text}}.
 * No network, file output, source approval, or authenticated review occurs.
 */
import {readFileSync} from 'node:fs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';
import {checkOfflineSnapshotConsistency} from '../src/lib/offline-snapshot-consistency.mjs';
import {readPrivateSourceTextFile} from '../src/lib/private-source-text-file.mjs';

const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const args=process.argv.slice(2);
const fileMode=args.length===2&&args[0]==='--text-file'&&typeof args[1]==='string'&&args[1].length>0;
if(!(args.length===0||fileMode)){
 console.error('Usage: npm run research:snapshot-check [--text-file /absolute/private/source.txt] < private-check.json');
 process.exitCode=1;
}else{
 try{
  const bytes=readFileSync(0);
  if(bytes.length>(fileMode?8192:262144))throw new Error('Private snapshot metadata or input exceeds maximum size');
  const input=JSON.parse(bytes.toString('utf8'));
  if(!input||typeof input!=='object'||Array.isArray(input)||
     Object.keys(input).length!==2||!Object.hasOwn(input,'capture')||
     !Object.hasOwn(input,'snapshot'))
   throw new Error('Expected exactly capture and snapshot fields');
  let snapshot=input.snapshot;
  if(fileMode){
   if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||
      Object.keys(snapshot).length!==2||!Object.hasOwn(snapshot,'sourceUrl')||
      !Object.hasOwn(snapshot,'snapshotOn'))
    throw new Error('Private file mode needs only a source URL and snapshot date');
   snapshot={...snapshot,text:readPrivateSourceTextFile(args[1])};
  }
  const report=checkOfflineSnapshotConsistency({
   capture:input.capture,snapshot,
   products:load('../src/data/products.json'),
   researchClaims:load('../src/data/research-claims.json'),
   revocations:load('../src/data/research-source-revocations.json'),
   ledger:load('../src/data/comparison-evidence.json'),
   triage:load('../src/data/editorial-triage.json'),
   proposals:load('../src/data/comparison-source-proposals.json'),
   captures:load('../src/data/comparison-evidence-captures.json'),
   pairs:COMPARISON_PAIRS
  });
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(!report.exactExcerptFound)process.exitCode=1;
 }catch{
  // Never echo possibly private user-entered source text or claim assertions.
  console.error('Private local snapshot check rejected: missing or invalid validated proposal/capture/source data');
  process.exitCode=1;
 }
}
