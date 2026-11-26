// Classification metadata, never a permission grant or an executable tool.
const definitions=[
 ['research-market','allowed','market','draft'],
 ['discover-products','allowed','product','draft'],
 ['collect-evidence','allowed','claim','draft'],
 ['inspect-evidence','allowed','claim','inspect'],
 ['analyze-customer','allowed','product','inspect'],
 ['score-market','allowed','market','inspect'],
 ['draft-content','allowed','content','draft'],
 ['draft-proposal','allowed','partnership','draft'],
 ['research-affiliate','allowed','partnership','inspect'],
 ['run-tests','allowed','repository','inspect'],
 ['prepare-code-change','allowed','repository','draft'],
 ['prepare-dev-branch','allowed','repository','draft'],
 ['prepare-draft-pr','allowed','repository','draft'],
 ['draft-documentation','allowed','repository','draft'],
 ['approve-claim','human_approval','claim','review'],
 ['decide-approval','human_approval','workflow','review'],
 ['publish-content','human_approval','content','publish'],
 ['send-brand-proposal','human_approval','partnership','publish'],
 ['activate-affiliate','human_approval','partnership','admin'],
 ['merge-protected-pr','human_approval','repository','admin'],
 ['launch-production','human_approval','system','admin'],
 ['accept-commercial-agreement','legal_review','partnership','review'],
 ['approve-legal-policy','legal_review','system','review'],
 ['unlock-publishing','prohibited','system','admin'],
 ['spend-money','prohibited','system','spend']
];
export const ACTION_POLICIES=Object.freeze(Object.fromEntries(definitions.map(([action,tier,resourceType,scope])=>[action,Object.freeze({tier,resourceType,scope})])));
export function classifyAction(action){
 return typeof action==='string'&&Object.hasOwn(ACTION_POLICIES,action)?ACTION_POLICIES[action].tier:'prohibited';
}
