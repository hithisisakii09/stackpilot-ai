import {createHash} from 'node:crypto';
import {validateCatalog} from '../../lib/catalog-validation.mjs';
import {validateEvidenceLeads} from '../../lib/evidence-ledger.mjs';
import {validateResearchClaims} from '../../lib/research-claims.mjs';
import {fields,dataArray,json} from '../contracts/validation.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const sorted = rows => [...rows].sort((a,b)=>a.id.localeCompare(b.id,'en'));
const canonical = value => Array.isArray(value)?value.map(canonical):value && typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;

export function prepareCandidateImport(value) {
  fields(value,['products','evidenceLeads','claims']);
  const products = dataArray(value.products).map(json);
  const evidenceLeads = dataArray(value.evidenceLeads).map(json);
  const claims = dataArray(value.claims).map(json);
  try {
    validateCatalog(products);
    if (products.some(product=>product.verified !== false)) throw new Error();
    validateEvidenceLeads(evidenceLeads,products);
    validateResearchClaims(claims,products);
  } catch {
    throw new Error('Invalid or unapproved candidate import');
  }
  const sourceDigest = digest(JSON.stringify(canonical({products:sorted(products),evidenceLeads:sorted(evidenceLeads),claims:sorted(claims)})));
  const sources = new Map();
  const addSource = (productId,url,day) => {
    const id = 'source-'+digest(productId+'\n'+url).slice(0,24);
    if (!sources.has(id)) sources.set(id,{id,productId,sourceUrl:url,collectedAt:new Date(day+'T00:00:00.000Z'),status:'candidate',sourceDigest:digest(productId+'\n'+url+'\n'+day)});
    return id;
  };
  for (const lead of evidenceLeads) addSource(lead.productId,lead.sourceUrl,lead.recordedOn);
  const links = [];
  const candidateClaims = sorted(claims).map(claim=>{
    const sourceId = addSource(claim.productId,claim.sourceUrl,claim.recordedOn);
    links.push({id:'link-'+digest(claim.id+'\n'+sourceId).slice(0,24),productId:claim.productId,claimId:claim.id,sourceId});
    return {id:claim.id,productId:claim.productId,statement:claim.statement,caveat:claim.caveat,status:'candidate',approved:false};
  });
  return {
    sourceDigest,
    categories:[...new Set(products.map(product=>product.category))].sort().map(category=>({id:'category-'+category.toLowerCase(),slug:category.toLowerCase(),name:category})),
    vendors:sorted(products).map(product=>({id:'vendor-'+product.id,name:product.name,website:product.website})),
    products:sorted(products).map(product=>({id:product.id,categoryId:'category-'+product.category.toLowerCase(),vendorId:'vendor-'+product.id,slug:product.id,name:product.name,website:product.website,status:'candidate',affiliateUrl:null,metadata:{description:product.description,sourceDigest}})),
    sources:sorted([...sources.values()]),claims:candidateClaims,links
  };
}
