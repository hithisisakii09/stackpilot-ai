import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/catalog-validation.mjs';
import { validateEvidenceLeads } from '../src/lib/evidence-ledger.mjs';

const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));
const count = validateCatalog(products);
console.log(`Validated ${count} products; unapproved affiliate links remain prohibited`);
const leads = JSON.parse(readFileSync(new URL('../src/data/evidence-leads.json', import.meta.url), 'utf8'));
console.log(`Validated ${validateEvidenceLeads(leads, products)} unreviewed source leads; approval remains disabled`);
