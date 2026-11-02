/**
 * Read-only first-party asset reference audit for a private static build.
 * This verifies that rendered references point to emitted files; it never
 * makes HTTP requests or proves that a remote Netlify preview serves them.
 */
const origin='https://stackpilot-local.invalid';
const attrPattern=/\s([a-z][a-z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'\x60=<>]+))/gi;
const assetAttrs={
 script:['src'],img:['src','srcset'],source:['src','srcset'],
 iframe:['src'],audio:['src'],video:['src','poster'],track:['src'],
 embed:['src'],object:['data']
};
const localFile=/^[A-Za-z0-9_][A-Za-z0-9_./@-]*$/;
const linkedResources=new Set(['stylesheet','icon','modulepreload','preload','prefetch','manifest','apple-touch-icon']);

const cssExternalResource=/(?:@import\s+(?:url\(\s*)?["']?\s*|url\(\s*["']?\s*)(?:https?:\/\/|\/\/)/i;
function decodeCssEscapes(value){
 return value.replace(/\\([0-9a-f]{1,6})(?:\r\n|[\t\n\r\f ])?|\\([\s\S])/gi,(full,hex,escaped)=>{
  if(hex){
   const point=Number.parseInt(hex,16);
   return point===0||point>0x10ffff||(point>=0xd800&&point<=0xdfff)
    ?'\uFFFD':String.fromCodePoint(point);
  }
  if(escaped===undefined)return '';
  return /[\r\n\f]/.test(escaped)?'':escaped;
 });
}
/** Conservative defense-in-depth check; not a full CSS parser. */
export function hasExternalCssResource(css){
 return typeof css==='string'&&cssExternalResource.test(decodeCssEscapes(css));
}

function attrs(tag){
 const result=Object.create(null);
 for(const m of tag.matchAll(attrPattern))result[m[1].toLowerCase()]=m[2]??m[3]??m[4];
 return result;
}
function emittedPath(raw,base){
 const input=raw.trim();
 if(!input||/[%](?![0-9a-fA-F]{2})/.test(input)||
    /%(?:2e|2f|5c|00)/i.test(input)||/[\\\u0000-\u001f\u007f]/.test(input)||
    input.startsWith('//')||/^[a-z][a-z0-9+.-]*:/i.test(input))return null;
 let url;
 try{url=new URL(input,base);}catch{return null;}
 if(url.origin!==origin||url.username||url.password)return null;
 let path;
 try{path=decodeURIComponent(url.pathname).slice(1);}catch{return null;}
 if(path.includes('//')||path.split('/').includes('..')||path.split('/').includes('.'))return null;
 if(!path||path.endsWith('/'))path+='index.html';
 return localFile.test(path)?path:null;
}
export function auditStaticAssetReferences(pages,files,stylesheets=[]){
 const violations=[];
 let checkedAssets=0;
 if(!Array.isArray(files)||files.length===0||!Array.isArray(pages)||pages.length===0)
  return {checkedAssets,violations:['Missing build pages or static file inventory for asset check']};
 const inventory=new Set(files);
 if(!Array.isArray(stylesheets)){
  violations.push('Invalid emitted stylesheet content inventory');
  stylesheets=[];
 }
 const cssPaths=[...inventory].filter(path=>typeof path==='string'&&/\.css$/i.test(path));
 const cssContent=new Map();
 for(const stylesheet of stylesheets){
  if(typeof stylesheet?.path!=='string'||!inventory.has(stylesheet.path)||
     !/\.css$/i.test(stylesheet.path)||typeof stylesheet.content!=='string'){
   violations.push('Invalid emitted stylesheet record');
   continue;
  }
  if(cssContent.has(stylesheet.path)){
   violations.push('Duplicate emitted stylesheet content: '+stylesheet.path);
   continue;
  }
  cssContent.set(stylesheet.path,stylesheet.content);
 }
 for(const path of cssPaths){
  if(!cssContent.has(path)){
   violations.push('Missing emitted stylesheet contents: '+path);
  }else if(hasExternalCssResource(cssContent.get(path))){
   violations.push(path+': external CSS resource');
  }
 }
 for(const page of pages){
  if(typeof page?.path!=='string'||typeof page?.html!=='string'){
   violations.push('Invalid rendered page in asset audit');continue;
  }
  const basePath=page.path==='index.html'?'/':page.path.endsWith('/index.html')?
    '/'+page.path.slice(0,-'index.html'.length):'/'+page.path;
  const base=origin+basePath;
  for(const match of page.html.matchAll(/<(script|link|img|source|iframe|audio|video|track|embed|object)\b[^>]*>/gi)){
   const tag=match[1].toLowerCase(),props=attrs(match[0]);
   const names=tag==='link'?
     String(props.rel??'').toLowerCase().split(/\s+/).some(r=>linkedResources.has(r))?['href']:[]:
     assetAttrs[tag]??[];
   for(const name of names){
    if(!Object.hasOwn(props,name))continue;
    const sources=name==='srcset'?props[name].split(',').map(v=>v.trim().split(/\s+/)[0]):[props[name]];
    for(const source of sources){
     checkedAssets++;
     const target=emittedPath(source,base);
     if(!target)violations.push(page.path+': invalid or external '+tag+' '+name+': '+source);
     else if(!inventory.has(target))violations.push(page.path+': missing local asset: '+source+' ('+target+')');
    }
   }
  }
 }
 return {checkedAssets,violations};
}
