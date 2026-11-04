/**
 * Candidate vendor-doc claims for editorial inspection only.
 * No verified claims, partner application, recommendation, or publication
 * can originate from this module. All sources are first-party vendor pages.
 */
const keys=[
 'id','productId','sourceUrl','statement','caveat','recordedOn',
 'status','approved','reviewer','reviewedAt'
];
const approvedHosts=new Map([
 ['hubspot','knowledge.hubspot.com'],
 ['pipedrive','support.pipedrive.com'],
 ['ahrefs','help.ahrefs.com'],
 ['semrush','www.semrush.com'],
 ['kinsta','kinsta.com'],
 ['cloudways','support.cloudways.com']
]);
const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function parseDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const d=new Date(value+'T00:00:00.000Z');
 return Number.isNaN(d.valueOf())||d.toISOString().slice(0,10)!==value?null:d;
}
function officialUrl(value,productId){
 if(typeof value!=='string'||!approvedHosts.has(productId))return false;
 try{
  const u=new URL(value);
  return u.protocol==='https:'&&u.hostname===approvedHosts.get(productId)&&
   !u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&u.pathname.length>1;
 }catch{return false;}
}
function plain(value,min,max){
 return typeof value==='string'&&value.trim().length>=min&&value.length<=max&&
  !/[<>\r\n]/.test(value);
}
export function validateResearchClaims(claims,products,{today=new Date().toISOString().slice(0,10)}={}){
 if(!parseDate(today))throw new Error('Invalid reference date');
 if(!Array.isArray(claims))throw new Error('Research claims must be an array');
 if(!Array.isArray(products)||products.some(p=>!isRecord(p)||typeof p.id!=='string'))
  throw new Error('Invalid product catalog');
 const known=new Set(products.map(p=>p.id));
 if(known.size!==products.length)throw new Error('Duplicate product id in research catalog');
 const seen=new Set(),sources=new Set();
 for(const c of claims){
  if(!isRecord(c)||Object.keys(c).length!==keys.length||
   keys.some(key=>!Object.hasOwn(c,key))||
   Object.keys(c).some(key=>!keys.includes(key)))
   throw new Error('Invalid or undeclared claim field/property');
  if(typeof c.id!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id))
   throw new Error('Invalid claim id');
  if(seen.has(c.id))throw new Error('Duplicate claim id');
  seen.add(c.id);
  if(!known.has(c.productId))throw new Error('Unknown claim product reference');
  if(!officialUrl(c.sourceUrl,c.productId))throw new Error('Invalid source URL or vendor domain');
  const signature=c.productId+'\u0000'+c.sourceUrl;
  if(sources.has(signature))throw new Error('Duplicate product source claim');
  sources.add(signature);
  if(!plain(c.statement,30,350)||/\b(cheapest|guaranteed|commission|affiliate)\b|[$€₹]\s*\d/i.test(c.statement))
   throw new Error('Invalid claim statement or price/marketing assertion');
  if(!plain(c.caveat,20,350))throw new Error('Invalid claim caveat');
  if(!parseDate(c.recordedOn)||c.recordedOn>today)throw new Error('Invalid or future claim date');
  if(c.status!=='candidate')throw new Error('Claim status must stay candidate');
  if(c.approved!==false)throw new Error('Unapproved claim cannot be marked approved');
  if(c.reviewer!==null||c.reviewedAt!==null)throw new Error('Unapproved claim cannot have review metadata');
 }
 return claims.length;
}
export function buildResearchClaimReviewQueue(claims,products,{today=new Date().toISOString().slice(0,10),staleAfterDays=90}={}){
 if(!Number.isInteger(staleAfterDays)||staleAfterDays<1||staleAfterDays>3650)
  throw new Error('Invalid staleAfterDays threshold');
 validateResearchClaims(claims,products,{today});
 const now=parseDate(today);
 return products.map(p=>{
  const records=claims.filter(c=>c.productId===p.id);
  const mostRecent=records.reduce((last,c)=>!last||c.recordedOn>last?c.recordedOn:last,null);
  const days=mostRecent?Math.floor((now-parseDate(mostRecent))/86_400_000):null;
  return{
   productId:p.id,productName:p.name,category:p.category,
   candidateCount:records.length,approvedClaims:0,status:'Unreviewed',
   latestRecordedOn:mostRecent,needsRefresh:days===null||days>staleAfterDays,
   candidates:records.map(c=>({
    id:c.id,sourceUrl:c.sourceUrl,statement:c.statement,caveat:c.caveat,
    recordedOn:c.recordedOn,status:'candidate'
   })).sort((a,b)=>a.id.localeCompare(b.id,'en'))
  };
 }).sort((a,b)=>a.productName.localeCompare(b.productName,'en'));
}
