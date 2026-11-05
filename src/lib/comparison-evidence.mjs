/**
 * Strict candidate-only comparison evidence references.
 * A source reference is a research lead, NOT proof of a matrix assertion.
 * No approval transition is exposed by this module.
 */


const keys=['claimId','productId','sourceId','status','approved','checkedAt','expiresAt'];
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const day=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x))&&new Date(x+'T00:00:00.000Z').toISOString().slice(0,10)===x;

export function validateComparisonEvidence(entries,pairs,products,{today=new Date().toISOString().slice(0,10)}={}){
 if(!day(today))throw new Error('Invalid reference date');
 if(!Array.isArray(entries)||!Array.isArray(pairs)||!Array.isArray(products))throw new Error('Invalid comparison evidence inputs');
 const productsById=new Map(products.map(p=>[p.id,p]));
 if(productsById.size!==products.length)throw new Error('Duplicate product ID');
 const allowed=new Set();
 for(const pair of pairs){
  if(!productsById.has(pair.firstId)||!productsById.has(pair.secondId)||!Array.isArray(pair.matrix))throw new Error('Invalid comparison pair');
  pair.matrix.forEach((_,i)=>{
   const id=`comparison-${pair.slug}-${String(i+1).padStart(2,'0')}`;
   allowed.add(id+'\u0000'+pair.firstId);
   allowed.add(id+'\u0000'+pair.secondId);
  });
 }
 const seen=new Set();
 for(const e of entries){
  if(!record(e)||Object.keys(e).length!==keys.length||keys.some(k=>!Object.hasOwn(e,k)))throw new Error('Invalid evidence fields');
  const key=e.claimId+'\u0000'+e.productId;
  if(!allowed.has(key))throw new Error('Unknown claim or product reference');
  if(seen.has(key))throw new Error('Duplicate evidence claim reference');
  seen.add(key);
  // A source is not evidence for a particular matrix dimension until reviewed.
  if(e.sourceId!==null)throw new Error('Unreviewed source mapping must remain null');
  if(e.status!=='candidate'||e.approved!==false||e.checkedAt!==null||e.expiresAt!==null)throw new Error('Evidence must remain unapproved candidate');
 }
 if(seen.size!==allowed.size)throw new Error('Incomplete comparison evidence coverage');
 return entries.length;
}

export function buildComparisonEvidenceIndex(entries,pairs,products,options={}){
 validateComparisonEvidence(entries,pairs,products,options);
 return new Map(entries.map(e=>[e.claimId+'\u0000'+e.productId,{...e}]));
}
