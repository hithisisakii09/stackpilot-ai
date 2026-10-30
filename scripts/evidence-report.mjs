import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/catalog-validation.mjs';
import { buildEvidenceReviewQueue } from '../src/lib/evidence-ledger.mjs';

const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));
const leads = JSON.parse(readFileSync(new URL('../src/data/evidence-leads.json', import.meta.url), 'utf8'));
validateCatalog(products);
const queue = buildEvidenceReviewQueue(leads, products);
if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ approvedClaims: 0, queue }, null, 2) + '\n');
} else {
  console.log('StackPilot AI — unreviewed vendor source leads');
  for (const item of queue) {
    console.log(`${item.productName} | source leads ${item.sourceLeadCount} | review: ${item.editorialStatus} | refresh: ${item.needsRefresh}`);
  }
  console.log('Zero approved claims. This command is read-only; no editorial approval, affiliates or publishing actions.');
}
