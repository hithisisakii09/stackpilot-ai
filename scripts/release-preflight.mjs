/**
 * Build-artifact release preflight. Read-only; never deploys, authenticates or approves.
 * npm run build must run first. This tests ALL emitted HTML, not just known routes.
 */
import {readFileSync,readdirSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditStaticRoutes,auditDeploymentConstraints} from '../src/lib/release-preflight.mjs';

const root=new URL('../',import.meta.url);
const dist=new URL('../dist/',import.meta.url);
const distPath=fileURLToPath(dist);
const read=url=>readFileSync(url,'utf8');
function walk(directory) {
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const path=join(directory,entry.name);
    if(entry.isSymbolicLink()) throw new Error('Symlinks not permitted in built route scan: '+path);
    if(entry.isDirectory())return walk(path);
    return entry.isFile() && entry.name.endsWith('.html')?[path]:[];
  });
}
let routes,deploy;
try {
  const pages=walk(distPath).map(file=>({
    path:relative(distPath,file).split('\\').join('/'),
    html:readFileSync(file,'utf8')
  }));
  routes=auditStaticRoutes(pages);
  deploy=auditDeploymentConstraints({
    policy:JSON.parse(read(new URL('config/operating-policy.json',root))),
    headers:read(new URL('dist/_headers',root)),
    robots:read(new URL('dist/robots.txt',root))
  });
} catch(error) {
  routes={checkedRoutes:0,violations:[error instanceof Error ? error.message : 'Unable to inspect built assets']};
  deploy={violations:[]};
}
const violations=[...routes.violations,...deploy.violations];
const output={
  check:'static-prelaunch-engineering-only',
  status:violations.length?'BLOCKED':'PASS',
  checkedRoutes:routes.checkedRoutes,
  violations,
  remoteAccessVerified:false,
  publisherAndLegalApproved:false,
  publicReleaseAuthorized:false,
  spendAuthorized:false
};
if(process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(output,null,2)+'\n');
}else{
  console.log('Static prelaunch audit:',output.status,'| Generated routes scanned:',output.checkedRoutes);
  for(const issue of violations)console.error('BLOCKER:',issue);
  console.log('Remote authentication, owner/legal/editorial review and public production remain separate NO-GO gates.');
}
if(violations.length) process.exitCode=1;
