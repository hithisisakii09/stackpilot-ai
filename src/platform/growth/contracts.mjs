const forbidden = /(?:affiliate|commission|referral|tracking|tenant|approval|actor|control|trust|tls|note)/i;

function fail(message='Invalid growth input') { throw new Error(message); }

function plainRecord(value, message='Invalid growth input') {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value)!==Object.prototype) fail(message);
    return value;
  } catch { fail(message); }
}

function keys(record, allowed, message='Invalid growth input') {
  let own;
  try { own=Object.keys(record); } catch { fail(message); }
  for (const key of own) {
    if (key==='__proto__'||key==='constructor'||key==='prototype') fail(message);
    if (!allowed.has(key)) fail(forbidden.test(key)?'Commercial input is prohibited':message);
  }
}

function text(value, limit, message='Invalid growth input') {
  if (typeof value!=='string'||!value||value.length>limit) fail(message);
  return value;
}

function textList(value, limit, itemLimit, message='Invalid growth input') {
  if (!Array.isArray(value)||value.length>limit) fail(message);
  const output=[];
  for (const item of value) {
    const normalized=text(item,itemLimit,message);
    if (output.includes(normalized)) fail(message);
    output.push(normalized);
  }
  return output.sort((a,b)=>a.localeCompare(b,'en'));
}

export function validateConstraints(value) {
  const record=plainRecord(value);
  keys(record,new Set(['category','teamSizeBand','budgetCeiling','requiredWorkflowDimensions']));
  const category=text(record.category,64);
  const teamSizeBand=text(record.teamSizeBand,32);
  if (typeof record.budgetCeiling!=='number'||!Number.isFinite(record.budgetCeiling)||record.budgetCeiling<0||record.budgetCeiling>10_000_000) fail();
  const requiredWorkflowDimensions=textList(record.requiredWorkflowDimensions,16,64);
  return Object.freeze({category,teamSizeBand,budgetCeiling:record.budgetCeiling,requiredWorkflowDimensions:Object.freeze(requiredWorkflowDimensions)});
}

export function validateProducts(value) {
  try {
    if (!Array.isArray(value)||value.length===0||value.length>50) fail();
    const seen=new Set();
    const output=[];
    for (const candidate of value) {
      const record=plainRecord(candidate,'Invalid product input');
      keys(record,new Set(['id','name','category','workflowTags','affiliateUrl','claims','pricingProjections']),'Invalid product input');
      if (record.affiliateUrl!==null) fail('Commercial input is prohibited');
      const id=text(record.id,80,'Invalid product input');
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)||seen.has(id)) fail('Invalid product input');
      seen.add(id);
      const name=text(record.name,160,'Invalid product input');
      const category=text(record.category,64,'Invalid product input');
      const workflowTags=textList(record.workflowTags,16,64,'Invalid product input');
      if (!Array.isArray(record.claims)||record.claims.length>64||!Array.isArray(record.pricingProjections)||record.pricingProjections.length>64) fail('Invalid product input');
      output.push(Object.freeze({id,name,category,workflowTags:Object.freeze(workflowTags),claims:Object.freeze([...record.claims]),pricingProjections:Object.freeze([...record.pricingProjections])}));
    }
    return Object.freeze(output.sort((left,right)=>left.id.localeCompare(right.id,'en')));
  } catch (error) {
    if (error instanceof Error&&error.message==='Commercial input is prohibited') throw error;
    fail('Invalid product input');
  }
}
