/**
 * Read-only verification of first-party static anchors against emitted files.
 * This is not hosted authentication, response header or browser UAT evidence.
 */
const safeFile=/^[A-Za-z0-9_][A-Za-z0-9_./-]*$/;
const attr=/\s([a-z][a-z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'\x60=<>]+))/gi;
function getHref(tag){
 for(const m of tag.matchAll(attr))if(m[1].toLowerCase()==='href')
  return m[2]??m[3]??m[4];
 return null;
}
function validFile(path){
 return typeof path==='string'&&path.length>0&&safeFile.test(path)&&
  !path.startsWith('/')&&!path.includes('//')&&!path.endsWith('/')&&
  path.split('/').every(part=>part!=='.'&&part!=='..'&&!part.startsWith('.'));
}
function assetFor(pathname){
 const decoded=decodeURIComponent(pathname);
 if(decoded.includes('\\')||decoded.includes('\0')||decoded.includes('//')||
    !decoded.startsWith('/')||decoded.split('/').includes('..'))
  throw new Error('Invalid local navigation path');
 const raw=decoded.slice(1);
 if(raw===''||raw.endsWith('/'))return raw+'index.html';
 const leaf=raw.split('/').at(-1);
 return leaf.includes('.')?raw:raw+'/index.html';
}
export function auditInternalNavigation(pages,files){
 const violations=[];
 let checkedLinks=0;
 if(!Array.isArray(files)||!files.length){
  violations.push('Missing emitted static file inventory');
  return {checkedLinks,violations};
 }
 const inventory=new Set();
 for(const file of files){
  if(!validFile(file))violations.push('Invalid static file path: '+String(file));
  else if(inventory.has(file))violations.push('Duplicate static file path: '+file);
  else inventory.add(file);
 }
 if(!Array.isArray(pages)||!pages.length){
  violations.push('Missing HTML pages to check navigation');
  return {checkedLinks,violations};
 }
 const visited=new Set();
 for(const page of pages){
  const name=page?.path;
  if(!validFile(name)||!name.endsWith('.html')){
   violations.push('Invalid navigation source page: '+String(name));continue;
  }
  if(visited.has(name))violations.push('Duplicate navigation source page: '+name);
  visited.add(name);
  if(!inventory.has(name))violations.push('Navigation source page missing from build inventory: '+name);
  if(typeof page.html!=='string'){
   violations.push('Navigation source page missing HTML: '+name);continue;
  }
  const basePath=name==='index.html'?'/':
   name.endsWith('/index.html')?'/'+name.slice(0,-'index.html'.length):
   '/'+name;
  const base='https://stackpilot-local.invalid'+basePath;
  for(const match of page.html.matchAll(/<a\b[^>]*>/gi)){
   const href=getHref(match[0]);
   if(href===null)continue;
   checkedLinks++;
   const value=href.trim();
   if(!value){violations.push(name+': empty internal navigation href');continue;}
   // JS may hydrate fragment destinations; browser QA remains a separate gate.
   if(value.startsWith('#'))continue;
   if(/^https:\/\//i.test(value)||/^mailto:/i.test(value))continue;
   if(/^\/\//.test(value)||/^[a-z][a-z0-9+.-]*:/i.test(value)||
      /[\\\u0000-\u001f\u007f]/.test(value)||/%(?![0-9a-f]{2})/i.test(value)){
    violations.push(name+': unsafe or invalid navigation href: '+value);continue;
   }
   try{
    const u=new URL(value,base);
    if(u.origin!=='https://stackpilot-local.invalid'||u.username||u.password||
       /%2f|%5c|%00/i.test(u.pathname))
      throw new Error('Invalid URL scheme or encoded path');
    const target=assetFor(u.pathname);
    if(!validFile(target)||!inventory.has(target))
     violations.push(name+': broken internal navigation href: '+value+' (missing '+target+')');
   }catch{
    violations.push(name+': invalid internal navigation href: '+value);
   }
  }
 }
 return {checkedLinks,violations};
}
