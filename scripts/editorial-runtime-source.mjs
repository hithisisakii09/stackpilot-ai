/**
 * Scan local checked-out source tree only. Does not query provider settings,
 * create accounts, inspect credentials, or enable reviewer authentication.
 */
import {createHash} from 'node:crypto';
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditEditorialRuntimeSurface} from '../src/lib/editorial-authorization.mjs';
import {isReviewedLocalControlSource,reviewedLocalControlSources} from './local-control-plane-source.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
// Only the reviewed build-time CSV endpoint may bypass the runtime-route check.
// A source change must be reviewed before updating its pinned digest.
const staticCsvPath='src/pages/compare/[slug].csv.js';
const staticCsvDigest='3dc93a848162453916c074704bff1381d860d8d345fa4bb181838f5f7fceead9';
// Git may check out LF source as CRLF on Windows. Normalize only CRLF byte
// pairs: every other byte (including BOM, bare CR and invalid UTF-8) remains
// part of the pinned digest. Never normalize syntax, whitespace or comments.
export function isReviewedStaticCsvSource(bytes){
 if(!Buffer.isBuffer(bytes))return false;
 const canonical=[];
 for(let i=0;i<bytes.length;i++){
  if(bytes[i]===13&&bytes[i+1]===10)continue;
  canonical.push(bytes[i]);
 }
 return createHash('sha256').update(Buffer.from(canonical)).digest('hex')===staticCsvDigest;
}
const roots=['src','scripts','public','netlify','functions','api','server',
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
 const auditedPaths=paths.filter(path=>!(path===staticCsvPath&&isReviewedStaticCsvSource(readFileSync(join(root,path))))&&
  !(Object.hasOwn(reviewedLocalControlSources,path)&&isReviewedLocalControlSource(path,readFileSync(join(root,path)))));
 const result=auditEditorialRuntimeSurface({
  paths:auditedPaths,
  astroConfig:readFileSync(join(root,'astro.config.mjs'),'utf8'),
  netlifyConfig:readFileSync(join(root,'netlify.toml'),'utf8')
 });
 for(const path of Object.keys(reviewedLocalControlSources)) if(!paths.includes(path)) result.violations.push('Missing reviewed local control-plane source');
 if(result.violations.length) result.status='BLOCKED';
 return result;
}
