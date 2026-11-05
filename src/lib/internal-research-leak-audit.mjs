/**
 * Prelaunch defense-in-depth: fail if private editorial research appears in
 * browser-delivered static assets. This is NOT an authenticated access test.
 * Never include leaked candidate assertions in violations/logs.
 */
const textAsset=/\.(?:html?|[cm]?js|json|css|txt|xml|svg|map|md|csv)$/i;
const privateData=/(?:^|\/)(?:editorial-triage|comparison-source-proposals|editorial-review-receipts|editorial-review-trust-anchors|research-claims|research-source-revocations|comparison-evidence|editorial-review-history)\.json$/i;
const privateField=/\b(?:candidateAssertion|triageReason|relevanceNote|publicKeySpkiBase64|sourceSnapshotSha256|previousDigest)\b\s*["']?\s*:/i;
const validPath=/^(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+$/;

function normalized(input){
 const named={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '};
 return input
  .replace(/&#(x[0-9a-f]+|[0-9]+);?/gi,(_,code)=>{
   const numeric=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):parseInt(code,10);
   return Number.isInteger(numeric)&&numeric>0&&numeric<=0x10ffff&&
    !(numeric>=0xd800&&numeric<=0xdfff)?String.fromCodePoint(numeric):'';
  })
  .replace(/&(amp|quot|apos|lt|gt|nbsp);/gi,(_,key)=>named[key.toLowerCase()])
  .replace(/\\u([0-9a-f]{4})/gi,(_,code)=>String.fromCharCode(parseInt(code,16)))
  .replace(/\\x([0-9a-f]{2})/gi,(_,code)=>String.fromCharCode(parseInt(code,16)))
  .replace(/\\(["'\\/])/g,'$1')
  .replace(/\s+/g,' ').trim().toLowerCase();
}

/**
 * @param {Array<{path:string, content:string|null}>} files generated dist
 * @param {Array<{slug:string,matrix:Array<{firstValue:string,secondValue:string}>}>} pairs
 */
export function auditInternalResearchLeaks(files,pairs){
 if(!Array.isArray(files)||!files.length)throw new Error('Missing built asset files');
 if(!Array.isArray(pairs)||!pairs.length||
    pairs.some(pair=>!pair||typeof pair.slug!=='string'||!Array.isArray(pair.matrix)||
      !pair.matrix.length||pair.matrix.some(row=>!row||
       typeof row.firstValue!=='string'||typeof row.secondValue!=='string'||
       row.firstValue.length<20||row.secondValue.length<20)))
  throw new Error('Invalid comparison pairs or matrix candidates');
 const assertions=pairs.flatMap(pair=>pair.matrix.flatMap((row,i)=>[
  {id:pair.slug+'-'+(i+1)+'-first',value:normalized(row.firstValue)},
  {id:pair.slug+'-'+(i+1)+'-second',value:normalized(row.secondValue)}
 ]));
 // Original SEO descriptions are unreviewed candidate narrative too.
 // Public pages must use the detached neutral description in getComparisonPair.
 const descriptions=pairs.filter(pair=>
   typeof pair.metaDescription==='string'&&pair.metaDescription.length>=20
 ).map(pair=>({id:pair.slug,value:normalized(pair.metaDescription)}));
 const violations=[];
 const seen=new Set();
 let checkedFiles=0;
 for(const file of files){
  const path=file?.path;
  if(typeof path!=='string'||!validPath.test(path)||
     path.split('/').some(segment=>segment==='.'||segment==='..'))
   throw new Error('Invalid built asset path');
  if(seen.has(path))throw new Error('Duplicate built asset path');
  seen.add(path);
  if(privateData.test(path))
   violations.push(path+': Private research data asset present in public build');
  if(!textAsset.test(path))continue;
  if(typeof file.content!=='string')throw new Error('Missing text asset content: '+path);
  checkedFiles++;
  const text=normalized(file.content);
  if(privateField.test(text))
   violations.push(path+': Internal review metadata exposed in public build');
  for(const assertion of assertions){
   if(text.includes(assertion.value))
    violations.push(path+': Unreviewed comparison assertion exposed ('+assertion.id+')');
  }
  for(const description of descriptions){
   if(text.includes(description.value))
    violations.push(path+': Unreviewed comparison description exposed ('+description.id+')');
  }
 }
 return {checkedFiles,violations};
}
