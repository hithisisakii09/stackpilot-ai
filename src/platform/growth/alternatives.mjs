import {validateProducts} from './contracts.mjs';

function fail(message='Invalid alternatives input') { throw new Error(message); }

export function recommendAlternatives({productSlug,products}={}) {
  if (typeof productSlug!=='string'||!productSlug||productSlug.length>80||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productSlug)) fail();
  const normalized=validateProducts(products);
  const target=normalized.find(product=>product.id===productSlug);
  if (!target) throw new Error('Unknown product');
  const alternatives=normalized.filter(product=>product.category===target.category&&product.id!==target.id).map(product=>{
    const shared=target.workflowTags.filter(tag=>product.workflowTags.includes(tag));
    const onlyTarget=target.workflowTags.filter(tag=>!product.workflowTags.includes(tag));
    const onlyAlternative=product.workflowTags.filter(tag=>!target.workflowTags.includes(tag));
    return Object.freeze({
      id:product.id,
      evidenceConfidence:'UNKNOWN',
      tradeoffs:Object.freeze({
        status:'CANDIDATE_UNVERIFIED',
        shared:Object.freeze(shared),
        onlyTarget:Object.freeze(onlyTarget),
        onlyAlternative:Object.freeze(onlyAlternative)
      })
    });
  });
  return Object.freeze({target:Object.freeze({id:target.id}),alternatives:Object.freeze(alternatives)});
}
