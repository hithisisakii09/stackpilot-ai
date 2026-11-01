/**
 * Browser QA coverage of emitted static HTML. No network, approvals or deployment.
 * Paths are relative to dist; route list is derived dynamically from all regular files.
 */
const safeFile=/^[A-Za-z0-9_][A-Za-z0-9_./-]*$/;
function validFile(path){
 return typeof path==='string'&&safeFile.test(path)&&
  !path.startsWith('/')&&!path.endsWith('/')&&!path.includes('//')&&
  path.split('/').every(part=>part.length&&part!=='.'&&part!=='..'&&!part.startsWith('.'));
}
function validRoute(route){
 return typeof route==='string'&&route.startsWith('/')&&
  route.length<=1024&&!route.includes('//')&&!route.includes('\\')&&
  !/[?#%\u0000-\u001f\u007f]/.test(route)&&
  (route==='/'||route.endsWith('/')||route.endsWith('.html'))&&
  route.split('/').every(part=>part!=='.'&&part!=='..');
}
/**
 * Every emitted HTML file is a browser test route, including files outside
 * manually curated checklists. Reject suspicious or duplicate build inventory.
 */
export function routePathsFromBuiltHtml(files){
 if(!Array.isArray(files)||files.length===0)throw new Error('Missing build file inventory');
 const seen=new Set(),routes=[];
 for(const file of files){
  if(!validFile(file))throw new Error('Invalid build file inventory path');
  if(seen.has(file))throw new Error('Duplicate emitted build file: '+file);
  seen.add(file);
  if(!file.endsWith('.html'))continue;
  const route=file==='index.html'?'/':
   file.endsWith('/index.html')?'/'+file.slice(0,-'index.html'.length):
   '/'+file;
  if(!validRoute(route))throw new Error('Invalid browser route for built HTML');
  routes.push(route);
 }
 if(!routes.length)throw new Error('Missing HTML routes in emitted build');
 return routes.sort((a,b)=>a.localeCompare(b,'en'));
}
/** Require a one-to-one browser visit for every HTML page at each viewport. */
export function assertExactBrowserRouteCoverage(expected,visited){
 function check(routes,label){
  if(!Array.isArray(routes)||!routes.length)throw new Error('Missing '+label+' browser routes');
  const seen=new Set();
  for(const route of routes){
   if(!validRoute(route))throw new Error('Invalid '+label+' browser route');
   if(seen.has(route))throw new Error('Duplicate '+label+' browser route: '+route);
   seen.add(route);
  }
  return seen;
 }
 const want=check(expected,'expected');
 const got=check(visited,'visited');
 const missing=[...want].filter(route=>!got.has(route));
 const unexpected=[...got].filter(route=>!want.has(route));
 if(missing.length||unexpected.length)
  throw new Error('Incomplete browser route coverage (missing: '+missing.join(',')+'; unexpected: '+unexpected.join(',')+')');
 return want.size;
}
