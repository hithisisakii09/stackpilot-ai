/**
 * Scan local checked-out source tree only. Does not query provider settings,
 * create accounts, inspect credentials, or enable reviewer authentication.
 */
import {createHash} from 'node:crypto';
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditEditorialRuntimeSurface} from '../src/lib/editorial-authorization.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
// Only the reviewed build-time CSV endpoint may bypass the runtime-route check.
// A source change must be reviewed before updating its pinned digest.
const staticCsvPath='src/pages/compare/[slug].csv.js';
const staticCsvDigest='3dc93a848162453916c074704bff1381d860d8d345fa4bb181838f5f7fceead9';
const roots=['src','public','netlify','functions','api','server',
 'supabase','cloudflare','.netlify'];
function walk(path,found){
 for(const entry of readdirSync(path,{withFileTypes:true})){
  const next=join(path,entry.name);
  if(entry.isSymbolicLink())throw new Error('Symlink forbidden in editorial runtime source: '+relative(root,next));
  if(entry.isDirectory())walk(next,found);
  else if(entry.isFile())found.push(relative(root,next).split('\\').join('/'));
 }
}
export function auditCurrentEditorialRuntimeSurface(){
 const paths=['astro.config.mjs','netlify.toml'];
 for(const segment of roots){
  const dir=join(root,segment);
  if(existsSync(dir))walk(dir,paths);
 }
 const auditedPaths=paths.filter(path=>path!==staticCsvPath||
  createHash('sha256').update(readFileSync(join(root,path))).digest('hex')!==staticCsvDigest);
 return auditEditorialRuntimeSurface({
  paths:auditedPaths,
  astroConfig:readFileSync(join(root,'astro.config.mjs'),'utf8'),
  netlifyConfig:readFileSync(join(root,'netlify.toml'),'utf8')
 });
}
