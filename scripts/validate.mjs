import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/lib/catalog-validation.mjs';
import { validateEvidenceLeads } from '../src/lib/evidence-ledger.mjs';
import { validateAffiliateCandidates } from '../src/lib/affiliate-readiness.mjs';

const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));
const count = validateCatalog(products);
console.log(`Validated ${count} products; unapproved affiliate links remain prohibited`);
const leads = JSON.parse(readFileSync(new URL('../src/data/evidence-leads.json', import.meta.url), 'utf8'));
console.log(`Validated ${validateEvidenceLeads(leads, products)} unreviewed source leads; approval remains disabled`);
const programs = JSON.parse(readFileSync(new URL('../src/data/affiliate-programs.json', import.meta.url), 'utf8'));
console.log(`Validated ${validateAffiliateCandidates(programs, products)} candidate partner records; no applications or tracking authorized`);
