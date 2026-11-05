/**
 * Scan local checked-out source tree only. Does not query provider settings,
 * create accounts, inspect credentials, or enable reviewer authentication.
 */
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditEditorialRuntimeSurface} from '../src/lib/editorial-authorization.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
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
 return auditEditorialRuntimeSurface({
  paths,
  astroConfig:readFileSync(join(root,'astro.config.mjs'),'utf8'),
  netlifyConfig:readFileSync(join(root,'netlify.toml'),'utf8')
 });
}
