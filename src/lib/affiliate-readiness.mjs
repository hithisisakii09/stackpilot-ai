/**
 * Pre-application research leads only. This module cannot apply to, accept,
 * activate, or connect to an affiliate program and never infers earnings.
 */
const fields = [
  'productId','programUrl','researchStatus','sourceLoggedOn','lastReviewedOn','applicationStatus',
  'applicationSubmittedAt','acceptedByProgram','acceptedTerms','trackingUrl',
  'earningsReported','nextResearchAction'
];
const requiredFields=fields.filter(field=>field!=='lastReviewedOn');
const allowedActions = new Set([
 'assess-eligibility','locate-official-program','check-content-depth',
 'confirm-traffic-requirements','check-payout-eligibility','draft-unsubmitted-application',
 'recheck-program-status'
]);
const officialDomains = new Map([
 ['pipedrive','pipedrive.com'],['hubspot','hubspot.com'],
 ['kinsta','kinsta.com'],['semrush','semrush.com'],
 ['cloudways','cloudways.com'],['ahrefs','ahrefs.com']
]);

function parseDate(s) {
 if(typeof s !== 'string'|| !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
 const d=new Date(s+'T00:00:00Z');
 return Number.isNaN(d.valueOf())||d.toISOString().slice(0,10)!==s ? null:d;
}
function validOfficialUrl(value, productId) {
 if(typeof value !== 'string') return false;
 try{
  const url = new URL(value);
  const domain = officialDomains.get(productId);
  if(!domain || url.protocol!=='https:' ||url.username||url.password||url.search||url.hash||url.port) return false;
  return url.hostname===domain || url.hostname.endsWith('.'+domain);
 }catch{return false;}
}

export function validateAffiliateCandidates(candidates, products, {today=new Date().toISOString().slice(0,10)}={}) {
 if (!parseDate(today)) throw new Error('Invalid reference date');
 if(!Array.isArray(candidates)) throw new Error('Affiliate candidates must be an array');
 if(!Array.isArray(products)) throw new Error('Product catalog must be an array');
 const productIds = new Set(products.map(p=>p.id));
 const seen = new Set();
 for(const lead of candidates){
  const keys=lead&&typeof lead==='object'&&!Array.isArray(lead)?Object.keys(lead):[];
  if (!lead || typeof lead!=='object'||Array.isArray(lead) ||
    requiredFields.some(k=>!Object.hasOwn(lead,k)) ||
    keys.some(k=>!fields.includes(k)) ||
    (keys.length!==requiredFields.length && keys.length!==fields.length)) {
   throw new Error('Invalid affiliate field set');
  }
  if(!productIds.has(lead.productId)) throw new Error('Unknown product in affiliate intake');
  if(seen.has(lead.productId)) throw new Error('Duplicate affiliate candidate');
  seen.add(lead.productId);
  if(!parseDate(lead.sourceLoggedOn) || lead.sourceLoggedOn>today) throw new Error('Invalid or future source date');
  const lastReviewedOn=Object.hasOwn(lead,'lastReviewedOn')?lead.lastReviewedOn:null;
  if(lastReviewedOn!==null && (!parseDate(lastReviewedOn)||lastReviewedOn>today))
   throw new Error('Invalid or future affiliate review date');
  if(lead.applicationStatus!=='not-applied' || lead.applicationSubmittedAt!==null)
   throw new Error('Application submission/status requires owner authorization');
  if(lead.acceptedByProgram!==false) throw new Error('Affiliate program approval cannot be asserted');
  if(lead.acceptedTerms!==false) throw new Error('Affiliate contract cannot be accepted automatically');
  if(lead.trackingUrl!==null) throw new Error('Affiliate tracking URL activation prohibited');
  if(lead.earningsReported!==null) throw new Error('Unverified affiliate earnings prohibited');
  if(!allowedActions.has(lead.nextResearchAction)) throw new Error('Unsupported research action');
  if(lead.researchStatus==='candidate'){
   if(!validOfficialUrl(lead.programUrl,lead.productId)) throw new Error('Invalid official program source URL/domain');
  } else if(lead.researchStatus==='program-discovery-needed') {
   if(lead.programUrl!==null || lead.nextResearchAction!=='locate-official-program')
    throw new Error('Unknown program source requires discovery status and null URL');
  } else if(lead.researchStatus==='no-public-program-found') {
   if(lead.programUrl!==null || lead.nextResearchAction!=='recheck-program-status')
    throw new Error('No-public-program-found status requires null URL and a future status recheck');
  } else throw new Error('Invalid candidate research status');
 }
 return candidates.length;
}

export function createAffiliateResearchQueue(candidates,products,opts={}) {
 validateAffiliateCandidates(candidates,products,opts);
 return candidates.map(lead=>({
  productId:lead.productId,
  productName:products.find(p=>p.id===lead.productId).name,
  researchStatus:lead.researchStatus,
  sourceUrl:lead.programUrl,
  sourceLoggedOn:lead.sourceLoggedOn,
  lastReviewedOn:lead.lastReviewedOn??null,
  applicationStatus:'not-applied',
  partnerAcceptance:'not-verified',
  affiliateReady:false,
  earningsKnown:false,
  nextAction:lead.nextResearchAction
 })).sort((a,b)=>a.productId.localeCompare(b.productId,'en'));
}
