const groups=[
 ['executive','analysis',['Chief Orchestration Agent','Business Strategy Agent','Business Performance Agent','Planning and Prioritization Agent'],'analysis-report','score-market'],
 ['market','research',['Market Research Agent','Market Trend Agent','Seasonal Intelligence Agent','Competitor Intelligence Agent','Opportunity Discovery Agent','Market Scoring Agent'],'market-research','research-market'],
 ['product','research',['Product Discovery Agent','Product Verification Agent','Pricing Intelligence Agent','Product Comparison Agent','Product Suitability Agent','Evidence Collection Agent'],'candidate-research','discover-products'],
 ['customer','analysis',['Customer Research Agent','Customer Requirement Analysis Agent','Customer Segmentation Agent','Recommendation Optimization Agent'],'customer-analysis','analyze-customer'],
 ['growth','analysis',['SEO Research Agent','Keyword Intelligence Agent','Content Strategy Agent','Editorial Agent','Content Quality Agent','Content Refresh Agent'],'content-draft','draft-content'],
 ['revenue','research',['Brand Discovery Agent','Vendor Research Agent','Partnership Preparation Agent','Commission Intelligence Agent','Affiliate Research Agent','Revenue Forecasting Agent'],'partner-research','research-affiliate'],
 ['engineering','engineering',['Software Architect Agent','Development Agent','Code Review Agent','QA Agent','Security Agent','DevOps Agent','Documentation Agent','Technical Debt Agent','Continuous Improvement Agent'],'code-proposal','prepare-code-change']
];
// Preparation scopes only. Role labels never assert verification or execution.
const overrides={
 'Market Scoring Agent':['analysis-report','score-market'],
 'Product Verification Agent':['evidence-inspection','inspect-evidence'],
 'Pricing Intelligence Agent':['evidence-intake','collect-evidence'],
 'Product Comparison Agent':['evidence-inspection','inspect-evidence'],
 'Product Suitability Agent':['customer-analysis','analyze-customer'],
 'Evidence Collection Agent':['evidence-intake','collect-evidence'],
 'Partnership Preparation Agent':['proposal-draft','draft-proposal'],
 'QA Agent':['test-report','run-tests'],
 'Security Agent':['test-report','run-tests'],
 'DevOps Agent':['test-report','run-tests'],
 'Documentation Agent':['documentation-draft','draft-documentation']
};
export const DEFAULT_AGENT_DEFINITIONS=Object.freeze(groups.flatMap(([group,pipeline,roles,tool,action])=>roles.map(role=>{
 const [scopedTool,capability]=overrides[role]??[tool,action];
 return Object.freeze({schemaVersion:1,version:1,id:role.toLowerCase().replaceAll(' ','-'),role,responsibility:'Prepare '+role.replace(/ Agent$/,'').toLowerCase()+' inputs and unapproved reports only; no execution or approval authority.',group,pipeline,capabilities:Object.freeze([capability]),tools:Object.freeze([scopedTool]),inputContract:'task-input-v1',outputContract:'artifact-v1',enabled:false,status:'disabled-no-handler',costINR:0,limits:Object.freeze({maxConcurrent:1,maxTasks:5,maxAttempts:2,timeoutMs:30000,maxOutputBytes:16384})});
})));
