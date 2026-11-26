import {validateConstraints,validateProducts} from './contracts.mjs';

export function evaluateSuitability({constraints,products}={}) {
  const normalizedConstraints=validateConstraints(constraints);
  const normalizedProducts=validateProducts(products);
  return Object.freeze(normalizedProducts
    .filter(product=>product.category===normalizedConstraints.category)
    .map(product=>Object.freeze({
      id:product.id,
      status:'CANDIDATE_UNVERIFIED',
      score:null,
      evidenceConfidence:'UNKNOWN',
      rationale:Object.freeze([
        'Candidate-only claims are unapproved.',
        'Pricing evidence is unknown or unapproved.',
        `Requested workflow dimensions: ${normalizedConstraints.requiredWorkflowDimensions.join(', ')||'none'}.`
      ])
    })));
}
