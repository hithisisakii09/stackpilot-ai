/**
 * Read-only local action queue; no APIs, credentials, account actions or charges.
 * JSON mode is for the existing daily operator and GitHub Actions artifact.
 */
import { readFileSync } from 'node:fs';
import { buildOperatingBacklog } from '../src/lib/operating-backlog.mjs';
import { validateCatalog } from '../src/lib/catalog-validation.mjs';

const load = name=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const products=load('src/data/products.json');
validateCatalog(products);
const editorialPackets=load('src/data/editorial-packet-ledger.json');
const dateArg=process.argv.find(arg=>arg.startsWith('--as-of='));
const ageArg=process.argv.find(arg=>arg.startsWith('--stale-after='));
const options={
  products,
  evidenceLeads:load('src/data/evidence-leads.json'),
  affiliateCandidates:load('src/data/affiliate-programs.json'),
  editorialPackets,
  policy:load('config/operating-policy.json')
};
if(dateArg) options.today=dateArg.slice('--as-of='.length);
if(ageArg) {
  const raw=ageArg.slice('--stale-after='.length);
  options.staleAfterDays=/^[1-9]\d*$/.test(raw)?Number(raw):NaN;
}
const result=buildOperatingBacklog(options);
for(const packet of editorialPackets) {
  const note=readFileSync(new URL('../'+packet.documentPath,import.meta.url),'utf8');
  if(!note.includes('Approved claims: 0') || !note.includes('human editorial review')) {
    throw new Error('Editorial packet document is missing its explicit unapproved review boundary');
  }
}
if(process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
}else{
  console.log(`StackPilot AI — read-only research backlog as of ${result.asOf}`);
  console.log(`Actions: ${result.automatic.length} draft/research, ${result.ownerGates.length} owner gates. Spending ₹0. No deployments or affiliate activation.`);
  for (const entry of result.automatic) {
    console.log(`P${entry.priority} ${entry.productId}: ${entry.action} — ${entry.reason}`);
  }
  console.log('Decisions are advisory, not execution of a scheduled worker.');
}
