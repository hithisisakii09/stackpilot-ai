/**
 * Deterministic, read-only next-action queue for StackPilot's scheduled agents.
 * This module only proposes safe research; it never runs agents, approves
 * evidence, applies to affiliate programs, spends or changes deployments.
 */
import { buildEvidenceReviewQueue } from './evidence-ledger.mjs';
import { createAffiliateResearchQueue } from './affiliate-readiness.mjs';

const OWNER_GATES = [
  ['operator-identity','Verify truthful business identity, contact and legal/privacy disclosures'],
  ['editorial-approval','Obtain authentic human editorial approval for any vendor claim'],
  ['affiliate-contract','Owner must submit real applications, verify eligibility, accept program terms and payout/KYC processes'],
  ['public-release','Owner must explicitly authorize public visibility, production, search indexing and monetization']
];
const PACKET_FIELDS = ['documentPath','id','preparedOn','productId','sourceIds','status'];
const dateValid = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10) === value;
};
const safePolicy = policy =>
  policy?.policyVersion === 1 &&
  policy.monthlyBudgetINR === 0 &&
  policy.delegatedSpendINR === 0 &&
  policy.hostingCandidate === 'netlify-free' &&
  policy.commercialHostingApproved === false &&
  policy.productionLaunchApproved === true &&
  policy.affiliateActivationApproved === false &&
  policy.paidServicesApproved === false;
function task(productId, action, priority, reason, sourceIds=[]) {
  return {id: action + ':' + productId,productId,priority,action,reason,
    autonomy:'automatic',approvalRequired:false,claimsApproved:false,sourceIds};
}
function reviewIsDue(lastReviewedOn,today,staleAfterDays) {
  if(!dateValid(lastReviewedOn)) return true;
  const ageDays=Math.floor(
    (Date.parse(today+'T00:00:00.000Z')-Date.parse(lastReviewedOn+'T00:00:00.000Z'))/86400000
  );
  return ageDays>staleAfterDays;
}
function validateEditorialPackets(packets,evidence,today) {
  if (!Array.isArray(packets)) throw new Error('Invalid editorial packet ledger');
  const expectedByProduct=new Map(evidence.map(entry=>[
    entry.productId,entry.leads.map(lead=>lead.id).sort()
  ]));
  const seenIds=new Set();
  const seenProducts=new Set();
  const byProduct=new Map();
  for(const packet of packets) {
    if (!packet || typeof packet!=='object' || Array.isArray(packet) ||
        JSON.stringify(Object.keys(packet).sort())!==JSON.stringify(PACKET_FIELDS)) {
      throw new Error('Invalid editorial packet fields');
    }
    if (typeof packet.id!=='string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(packet.id) ||
        seenIds.has(packet.id)) {
      throw new Error('Duplicate or invalid editorial packet id');
    }
    if (typeof packet.productId!=='string' || !expectedByProduct.has(packet.productId) ||
        seenProducts.has(packet.productId)) {
      throw new Error('Duplicate or unknown editorial packet product');
    }
    if (typeof packet.documentPath!=='string' ||
        !/^docs\/editorial-drafts\/[a-z0-9][a-z0-9._/-]*\.md$/i.test(packet.documentPath) ||
        packet.documentPath.includes('..')) {
      throw new Error('Unsafe editorial packet document path');
    }
    if (!dateValid(packet.preparedOn) || packet.preparedOn>today) {
      throw new Error('Invalid or future editorial packet date');
    }
    if (packet.status!=='prepared-unapproved') {
      throw new Error('Editorial packet must remain prepared-unapproved');
    }
    if (!Array.isArray(packet.sourceIds) || packet.sourceIds.length===0 ||
        packet.sourceIds.some(id=>typeof id!=='string' || !/^[a-z0-9-]+$/.test(id)) ||
        new Set(packet.sourceIds).size!==packet.sourceIds.length) {
      throw new Error('Invalid editorial packet source IDs');
    }
    const actual=[...packet.sourceIds].sort();
    const expected=expectedByProduct.get(packet.productId);
    if (expected.length===0 || JSON.stringify(actual)!==JSON.stringify(expected)) {
      throw new Error('Editorial packet source IDs do not match current evidence');
    }
    seenIds.add(packet.id);
    seenProducts.add(packet.productId);
    byProduct.set(packet.productId,packet);
  }
  return byProduct;
}
const indiaToday = () => {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
    timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date()).map(part=>[part.type,part.value]));
  return parts.year+'-'+parts.month+'-'+parts.day;
};
export function buildOperatingBacklog({
  products, evidenceLeads, affiliateCandidates, editorialPackets=[], policy,
  today = indiaToday(), staleAfterDays=90
} = {}) {
  if (!safePolicy(policy)) throw new Error('Unapproved budget or launch policy');
  if (!dateValid(today)) throw new Error('Invalid reference date');
  if (!Number.isInteger(staleAfterDays) || staleAfterDays<1 || staleAfterDays>3650) {
    throw new Error('Invalid staleAfterDays value');
  }
  if (!Array.isArray(products) || products.some(p=>!p||typeof p.id!=='string')) {
    throw new Error('Invalid product catalog');
  }
  const seen=new Set();
  for(const product of products) {
    if(seen.has(product.id)) throw new Error('Duplicate product id');
    seen.add(product.id);
    if(product.verified!==false) throw new Error('Unapproved verified product entry');
    if(product.affiliateUrl!==null) throw new Error('Unapproved affiliate URL');
  }
  const evidence=buildEvidenceReviewQueue(evidenceLeads,products,{today,staleAfterDays});
  const packetByProduct=validateEditorialPackets(editorialPackets,evidence,today);
  const affiliates=createAffiliateResearchQueue(affiliateCandidates,products,{today});
  if (affiliates.length !== products.length ||
      products.some(p=>!affiliates.some(x=>x.productId===p.id))) {
    throw new Error('Missing partner research candidate for catalog product');
  }

  const automatic=[];
  for(const entry of evidence) {
    const sources=entry.leads.map(x=>x.id).sort();
    if(entry.sourceLeadCount===0) {
      automatic.push(task(entry.productId,'collect-primary-source',10,
        'No candidate primary source is recorded; collect trustworthy vendor documentation.'));
    } else if(entry.needsRefresh) {
      automatic.push(task(entry.productId,'refresh-primary-source',20,
        'Candidate source intake is older than the configured freshness window; recheck claims manually.',
        sources));
    } else if(!packetByProduct.has(entry.productId)) {
      automatic.push(task(entry.productId,'draft-evidence-review',30,
        'Prepare a claim-level, plan-scoped verification brief; do not mark evidence approved.',
        sources));
    }
  }
  for(const partner of affiliates) {
    if(partner.researchStatus==='program-discovery-needed') {
      automatic.push(task(partner.productId,'locate-official-program',40,
        'Find a current first-party program source or record that no qualifying public program was found.'));
    } else if(partner.researchStatus==='no-public-program-found') {
      if(reviewIsDue(partner.lastReviewedOn,today,staleAfterDays)) {
        automatic.push(task(partner.productId,'recheck-program-status',60,
          'Recheck first-party sources after the review window; no public program was found at the previous review.'));
      }
    } else if(partner.researchStatus==='candidate' &&
              reviewIsDue(partner.lastReviewedOn,today,staleAfterDays)) {
      automatic.push(task(partner.productId,'recheck-program-eligibility',50,
        'Recheck current official eligibility and geography; do not apply, accept terms or generate tracked links.'));
    }
  }
  automatic.sort((a,b) => a.priority-b.priority ||
    a.productId.localeCompare(b.productId,'en') || a.action.localeCompare(b.action,'en'));
  const affiliateActionSet=new Set([
    'locate-official-program','recheck-program-eligibility','recheck-program-status'
  ]);
  return {
    asOf:today,
    mode:'prelaunch',
    execution:'advisory-only',
    canPublish:false, canMonetize:false, canSpend:false,
    metrics:{
      catalogCount:products.length,
      unreviewedProducts:evidence.filter(e=>e.editorialStatus!=='Reviewed').length,
      evidenceLeadCount:evidenceLeads.length,
      sourcesNeedingRefresh:evidence.filter(e=>e.sourceLeadCount>0 && e.needsRefresh).length,
      preparedEvidencePackets:packetByProduct.size,
      editorialReviewsPending:packetByProduct.size,
      programCandidates:affiliates.filter(a=>a.researchStatus==='candidate').length,
      programDiscoveryGaps:affiliates.filter(a=>a.researchStatus==='program-discovery-needed').length,
      programsWithoutPublicAffiliateProgram:affiliates.filter(a=>a.researchStatus==='no-public-program-found').length,
      affiliateReviewsDue:automatic.filter(item=>affiliateActionSet.has(item.action)).length,
      approvedClaims:0,
      acceptedAffiliatePrograms:0,
      verifiedRevenue:null
    },
    automatic,
    ownerGates:OWNER_GATES.map(([id,reason])=>({
      id,action:'request-owner-review',reason,autonomy:'owner',approvalRequired:true
    }))
  };
}
