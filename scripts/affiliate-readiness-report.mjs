/**
 * Read-only program research report. No network calls, partner applications,
 * account changes, tracked URLs, payout promises, or paid services.
 */
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/catalog-validation.mjs';
import { createAffiliateResearchQueue } from '../src/lib/affiliate-readiness.mjs';

const products=JSON.parse(readFileSync(new URL('../src/data/products.json',import.meta.url),'utf8'));
const candidates=JSON.parse(readFileSync(new URL('../src/data/affiliate-programs.json',import.meta.url),'utf8'));
validateCatalog(products);
const queue=createAffiliateResearchQueue(candidates,products);
const report={
  reportKind:'unapproved-affiliate-program-research',
  source:'candidate-intake-not-program-confirmation',
  applicationsSubmitted:0,
  programsAccepted:0,
  trackedLinksEnabled:0,
  verifiedEarnings:null,
  delegatedSpendINR:0,
  reviewedPrograms:queue.length,
  awaitingOfficialProgramDiscovery:queue.filter(row=>row.researchStatus==='program-discovery-needed').length,
  queue
};
if(process.argv.includes('--json')) {
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
}else{
 console.log('StackPilot AI — unapplied affiliate program research candidates');
 console.log(`Candidates: ${report.reviewedPrograms}, approved: 0, applications: 0, tracking links: 0; actual earnings unknown`);
 for(const row of queue) console.log(`${row.productName}: ${row.researchStatus}; action: ${row.nextAction}`);
 console.log('The owner must independently review and submit any future program application.');
}
