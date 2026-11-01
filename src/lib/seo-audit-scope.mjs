/**
 * Client-only, vendor-neutral Site Audit scope arithmetic.
 * This never crawls a website, checks a vendor plan, stores data or transmits counts.
 */
const countFields=['rootPages','folderPages','subdomainPages','pageCap'];
const booleanFields=['includeFolders','includeSubdomains'];
const fields=[...countFields,...booleanFields];
const has=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);

function count(value,key){
  if(!((typeof value==='number' && Number.isSafeInteger(value))||
       (typeof value==='string' && /^(0|[1-9]\d*)$/.test(value))))
    throw new Error('Invalid '+key+' integer count');
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<0||n>1000000)
    throw new Error('Invalid '+key+' range (0–1000000)');
  return n;
}
export function planSeoAuditScope(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).length!==fields.length||
    fields.some(key=>!has(input,key))||
    Object.keys(input).some(key=>!fields.includes(key)))
    throw new Error('Invalid SEO audit scope field set');
  const parsed=Object.fromEntries(countFields.map(key=>[key,count(input[key],key)]));
  for(const key of booleanFields)
    if(typeof input[key]!=='boolean')throw new Error('Invalid boolean: '+key);
  const includedPages=parsed.rootPages+
    (input.includeFolders?parsed.folderPages:0)+
    (input.includeSubdomains?parsed.subdomainPages:0);
  const totalInventoryPages=parsed.rootPages+parsed.folderPages+parsed.subdomainPages;
  const excludedPages=totalInventoryPages-includedPages;
  const remainingPages=Math.max(0,parsed.pageCap-includedPages);
  const excessPages=Math.max(0,includedPages-parsed.pageCap);
  const status=includedPages===0?'EMPTY_SCOPE':
    excessPages>0?'ABOVE_USER_CAP':'WITHIN_USER_CAP';
  return {
    ...parsed,
    includeFolders:input.includeFolders,includeSubdomains:input.includeSubdomains,
    includedPages,excludedPages,totalInventoryPages,remainingPages,excessPages,status,
    verified:false,providerAllowanceVerified:false,crawlCredits:null,
    dataSource:'user-entered-only'
  };
}
export function formatSeoAuditScopeReport(result){
  if(!result||result.dataSource!=='user-entered-only'||
     result.verified!==false||result.providerAllowanceVerified!==false||
     result.crawlCredits!==null||
     !['EMPTY_SCOPE','WITHIN_USER_CAP','ABOVE_USER_CAP'].includes(result.status))
    throw new Error('Invalid or independently unverified SEO audit scope report');
  return [
    'StackPilot AI — Private SEO site-audit scope plan',
    'Main-domain pages (excluding separate groups): '+result.rootPages,
    'Selected subfolder pages (separate group): '+result.folderPages,
    'Subdomain pages (separate group): '+result.subdomainPages,
    'Include selected subfolders: '+(result.includeFolders?'yes':'no'),
    'Include subdomains: '+(result.includeSubdomains?'yes':'no'),
    'User-entered page cap (not a vendor allowance): '+result.pageCap,
    'Planned included URLs: '+result.includedPages,
    'Excluded inventory URLs: '+result.excludedPages,
    'Unused amount against user-entered cap: '+result.remainingPages,
    'Excess above user-entered cap: '+result.excessPages,
    'Scope result: '+result.status,
    'Provider allowance: UNVERIFIED. Actual crawl credits: UNKNOWN.',
    'This is not a crawl, search index count, product quote, or guarantee that these URLs will be audited.',
    'Keep groups mutually exclusive; check canonical URLs, redirects, robots exclusions, plans, regions and provider-specific counting rules yourself.',
    'No website was fetched and no entered data was submitted to StackPilot.'
  ].join('\n');
}
