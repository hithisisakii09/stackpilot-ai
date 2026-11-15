import {fields, id, dataArray} from '../contracts/validation.mjs';
import {digest} from '../orchestration/dag.mjs';
import {canonicalCandidateUrl} from './discovery.mjs';

export function proposeProductDuplicates(value) {
  const products = dataArray(value, 100).map(record => {
    fields(record, ['id', 'vendorUrl']);
    return {id:id(record.id), vendorUrl:canonicalCandidateUrl(record.vendorUrl)};
  }).sort((a, b) => a.id.localeCompare(b.id, 'en'));
  if (new Set(products.map(record => record.id)).size !== products.length) throw new Error('Duplicate product identity');
  const proposals = [];
  for (let left = 0; left < products.length; left++) {
    for (let right = left + 1; right < products.length; right++) {
      if (products[left].vendorUrl !== products[right].vendorUrl) continue;
      const pair = {leftProductId:products[left].id, rightProductId:products[right].id, vendorUrl:products[left].vendorUrl};
      proposals.push({...pair, id:'duplicate-'+digest(pair).slice(0,48), reason:'same-canonical-vendor-url', reviewState:'unreviewed'});
      if (proposals.length > 100) throw new Error('Duplicate proposal limit');
    }
  }
  return Object.freeze(proposals.map(proposal => Object.freeze(proposal)));
}
