import {projectPricingHistory} from '../products/projection.mjs';

const fail=()=>new Error('Public catalog operation failed');
const productKeys=new Set(['id','name','category','bestFor','affiliateUrl','description','website','sources','verified','researchStatus','lastVerifiedAt','supportedTeams','budgetTiers','pricing']);
const identifier=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const text=value=>typeof value==='string'&&value.trim()&&value.length<=120&&!/[<>\u0000-\u001f]/.test(value);

/**
 * Builds the deliberately small, candidate-only browser read model.  The
 * pricing projection is invoked with an empty eligibility set so the public
 * boundary cannot accidentally grow a price field as it is reused by callers.
 */
export function buildPublicCatalog(products) {
  try {
    if(!Array.isArray(products)||products.length>100||projectPricingHistory({observations:[],eligibleIds:[],nowMs:Date.UTC(2026,0,1)}).length) throw fail();
    const seen=new Set();
    const projected=products.map(product=>{
      if(!product||Object.getPrototypeOf(product)!==Object.prototype||Object.keys(product).some(key=>!productKeys.has(key))||
        !identifier.test(product.id)||seen.has(product.id)||!text(product.name)||!text(product.category)||!Array.isArray(product.bestFor)||product.bestFor.length>20||
        product.bestFor.some(tag=>!identifier.test(tag))||product.affiliateUrl!==null||product.pricing?.status!=='unverified') throw fail();
      seen.add(product.id);
      return Object.freeze({id:product.id,name:product.name.trim(),category:product.category.trim(),workflowTags:Object.freeze([...new Set(product.bestFor)].sort()),suitabilityStatus:'CANDIDATE_UNVERIFIED'});
    });
    return Object.freeze({schema:'stackpilot-public-catalog-v1',products:Object.freeze(projected.sort((a,b)=>a.id.localeCompare(b.id)))});
  } catch { throw fail(); }
}
