/**
 * Build-artifact release preflight. Read-only; never deploys, authenticates or approves.
 * npm run build must run first. This tests ALL emitted HTML, not just known routes.
 */
import {readFileSync,readdirSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditStaticRoutes,auditDeploymentConstraints} from '../src/lib/release-preflight.mjs';
import {auditInternalNavigation} from '../src/lib/internal-navigation-audit.mjs';
import {auditStaticAssetReferences} from '../src/lib/static-asset-audit.mjs';
import {auditInternalResearchLeaks} from '../src/lib/internal-research-leak-audit.mjs';
import {COMPARISON_PAIRS} from '../src/lib/comparison-pairs.mjs';

const root=new URL('../',import.meta.url);
const dist=new URL('../dist/',import.meta.url);
const distPath=fileURLToPath(dist);
const read=url=>readFileSync(url,'utf8');
function walk(directory) {
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const path=join(directory,entry.name);
    if(entry.isSymbolicLink()) throw new Error('Symlinks not permitted in built route scan: '+path);
    if(entry.isDirectory())return walk(path);
    return entry.isFile()?[path]:[];
  });
}
let routes,deploy,navigation,assets,internalResearch;
try {
  const allFiles=walk(distPath).map(file=>relative(distPath,file).split('\\').join('/'));
  const pages=allFiles.filter(path=>path.endsWith('.html')).map(path=>({
    path,html:readFileSync(join(distPath,path),'utf8')
  }));
  navigation=auditInternalNavigation(pages,allFiles);
  const stylesheets=allFiles.filter(path=>/\.css$/i.test(path)).map(path=>({
    path,content:readFileSync(join(distPath,path),'utf8')
  }));
  assets=auditStaticAssetReferences(pages,allFiles,stylesheets);
  // Scan every generated text asset, not just pages on a known route list.
  // Binary assets are inspected by path only; no private candidate content is logged.
  internalResearch=auditInternalResearchLeaks(allFiles.map(path=>({
    path,
    content:/\.(?:html?|[cm]?js|json|css|txt|xml|svg|map|md|csv)$/i.test(path)
      ?readFileSync(join(distPath,path),'utf8'):null
  })),COMPARISON_PAIRS);
  routes=auditStaticRoutes(pages);
  deploy=auditDeploymentConstraints({
    policy:JSON.parse(read(new URL('config/operating-policy.json',root))),
    headers:read(new URL('dist/_headers',root)),
    robots:read(new URL('dist/robots.txt',root))
  });
} catch(error) {
  routes={checkedRoutes:0,violations:[error instanceof Error ? error.message : 'Unable to inspect built assets']};
  deploy={violations:[]};
  navigation={checkedLinks:0,violations:[]};
  assets={checkedAssets:0,violations:[]};
  internalResearch={checkedFiles:0,violations:[]};
}
const violations=[...routes.violations,...deploy.violations,...navigation.violations,...assets.violations,...internalResearch.violations];
const output={
  check:'static-prelaunch-engineering-only',
  status:violations.length?'BLOCKED':'PASS',
  checkedRoutes:routes.checkedRoutes,
  checkedLinks:navigation.checkedLinks,
  checkedAssets:assets.checkedAssets,
  checkedResearchSurfaceFiles:internalResearch.checkedFiles,
  violations,
  remoteAccessVerified:false,
  publisherAndLegalApproved:false,
  publicReleaseAuthorized:false,
  spendAuthorized:false
};
if(process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(output,null,2)+'\n');
}else{
  console.log('Static prelaunch audit:',output.status,'| Generated routes scanned:',output.checkedRoutes,'| Internal links checked:',output.checkedLinks,'| Static asset references checked:',output.checkedAssets,'| Research leakage surface files:',output.checkedResearchSurfaceFiles);
  for(const issue of violations)console.error('BLOCKER:',issue);
  console.log('Remote authentication, owner/legal/editorial review and public production remain separate NO-GO gates.');
}
if(violations.length) process.exitCode=1;
