/**
 * Public-safe comparison navigation: only static route identities, no
 * private candidate claims, source excerpts, pricing, or research matrices.
 * Tests require this map to agree exactly with COMPARISON_PAIRS, which
 * deliberately stays on the build/private research side of the boundary.
 */
export const PUBLIC_COMPARISON_ROUTES=Object.freeze([
 Object.freeze({slug:'hubspot-vs-pipedrive',firstId:'hubspot',secondId:'pipedrive'}),
 Object.freeze({slug:'semrush-vs-ahrefs',firstId:'semrush',secondId:'ahrefs'}),
 Object.freeze({slug:'kinsta-vs-cloudways',firstId:'kinsta',secondId:'cloudways'})
]);

/** Null when no real prebuilt comparison route matches. Never invent URLs. */
export function getPublicComparisonRoute(productId,peerId){
 if(typeof productId!=='string'||!productId)return null;
 if(peerId!==undefined&&(typeof peerId!=='string'||!peerId))return null;
 const pair=PUBLIC_COMPARISON_ROUTES.find(
  x=>x.firstId===productId||x.secondId===productId
 );
 if(!pair)return null;
 const actualPeer=pair.firstId===productId?pair.secondId:pair.firstId;
 if(peerId!==undefined&&peerId!==actualPeer)return null;
 return '/compare/'+pair.slug+'/';
}
