/**
 * PRIVATE CLI composition only — never import from Astro pages or browser JS.
 * A matching capture merely documents manual text and its claimed provenance.
 */
import {buildComparisonReviewPackets} from './comparison-review-packets.mjs';
import {buildComparisonEvidenceCaptureReport} from './comparison-evidence-captures.mjs';

export function buildPrivateReviewPacketBundle(inputs={}){
 const review=buildComparisonReviewPackets(inputs);
 const captured=buildComparisonEvidenceCaptureReport(inputs);
 const byClaim=new Map();
 for(const excerpt of captured.records){
  const key=excerpt.claimId+'\u0000'+excerpt.productId;
  if(!byClaim.has(key))byClaim.set(key,[]);
  byClaim.get(key).push({...excerpt});
 }
 return {
  ...review,
  manualCaptures:{
   total:captured.totalCaptures,
   claimsWithExcerpts:captured.claimsWithExcerpts,
   claimsWithoutExcerpts:captured.claimsWithoutExcerpts,
   approved:0,independentlyVerified:0
  },
  packets:review.packets.map(packet=>({
   ...packet,
   capturedExcerpts:byClaim.get(packet.claimId+'\u0000'+packet.productId)??[],
   approved:false,canPublish:false
  })),
  authenticatedApprovals:0,
  publicationAllowed:false
 };
}
