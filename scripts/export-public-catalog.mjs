/** Candidate-only public catalog exporter. Dry-run is the default. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import products from '../src/data/products.json' with {type:'json'};
import {buildPublicCatalog} from '../src/platform/growth/public-export.mjs';

const args=process.argv.slice(2);
if(args.length>2||args[0]!=='--write'&&args.length||args[0]==='--write'&&!args[1]) throw new Error('Usage: export-public-catalog.mjs [--write output.json]');
const output=JSON.stringify(buildPublicCatalog(products),null,2)+'\n';
if(args[0]==='--write') {
  const target=resolve(args[1]);
  if(!target.endsWith('.json')) throw new Error('Output must be a JSON file');
  mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,output,{encoding:'utf8',flag:'wx'});
}
process.stdout.write(output);
