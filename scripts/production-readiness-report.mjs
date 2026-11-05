import {readFileSync} from 'node:fs';
import {buildProductionReadinessReport} from '../src/lib/production-readiness.mjs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const report=buildProductionReadinessReport({
 policy:read('../config/operating-policy.json'),
 products:read('../src/data/products.json'),
 ledger:read('../src/data/comparison-evidence.json'),
 claims:read('../src/data/research-claims.json'),
 revocations:read('../src/data/research-source-revocations.json')
});
console.log(JSON.stringify(report,null,2));
