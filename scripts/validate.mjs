import { readFileSync } from 'node:fs';
const products=JSON.parse(readFileSync(new URL('../src/data/products.json',import.meta.url),'utf8'));
const ids=new Set();
for(const p of products){if(!p.id||!p.name||!p.description||!Array.isArray(p.bestFor)||ids.has(p.id))throw Error('Invalid or duplicate product '+p.id);ids.add(p.id);if(new URL(p.website).protocol!=='https:')throw Error('Non-HTTPS URL');if(p.affiliateUrl!==null)throw Error('Affiliate URLs require approval');}
console.log(`Validated ${products.length} products`);
