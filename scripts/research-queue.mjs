import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/catalog-validation.mjs';
import { buildResearchQueue } from '../src/lib/research-audit.mjs';

const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));
validateCatalog(products);
const queue = buildResearchQueue(products);
if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), queue }, null, 2) + '\n');
} else {
  console.log('StackPilot AI — read-only research queue');
  for (const item of queue) console.log(`${item.name}: ${item.blockers.join(', ')} (sources: ${item.sourceCount})`);
  console.log('No approvals or product data have been changed.');
}
