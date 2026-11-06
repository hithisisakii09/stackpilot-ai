/**
 * Local research data is not an editorial source of truth and must never
 * be accidentally committed, even if git add -f bypasses .gitignore.
 * This is a filename/path inventory guard, not content classification.
 */
export const PROTECTED_PRIVATE_RESEARCH_DIRS=Object.freeze([
 'private-research','local-research','research-local','vendor-snapshots',
 'source-snapshots','private-inputs','research-inputs','source-copies',
 'client-research','prospect-research','lead-research'
]);
export const PROTECTED_PRIVATE_RESEARCH_FILES=Object.freeze([
 'vendor-document.txt','source-snapshot-check.json',
 'vendor-source-snapshot.json','private-proposal.json','private-capture.json',
 'proposal-input.json','capture-input.json','snapshot-metadata.json',
 'private-snapshot-check.json','manual-source-check.json',
 'comparison-gap-worklist.csv','comparison-gap-worklist.json',
 'claim-research-starter.json','hubspot-export-evidence-assessment.json','hubspot-export-evidence-assessment.csv','hubspot-manual-worksheet-check.json'
]);

// Versioned private research workbooks may eventually contain prospect contact data.
// Protect the exact family, not all spreadsheet files in the repository.
export const PROTECTED_PRIVATE_RESEARCH_WORKBOOK_GLOBS=Object.freeze([
 'StackPilot_Client_Research_Architecture*.xlsx',
 'stackpilot_client_research_architecture*.xlsx'
]);
const privateWorkbook=name=>/^stackpilot_client_research_architecture(?:_v[0-9]+)?\.xlsx$/i.test(name);

const exactPath=path=>typeof path==='string'&&path.length>0&&path.length<=4096&&
 !path.startsWith('/')&&!/[\\\x00-\x1f\x7f]/.test(path)&&
 path.split('/').every(part=>part.length>0&&part!=='.'&&part!=='..');
const folderNames=new Set(PROTECTED_PRIVATE_RESEARCH_DIRS);
const filenames=new Set(PROTECTED_PRIVATE_RESEARCH_FILES);

/** Tracked source list, not untracked scratch files or a privacy proof. */
export function auditTrackedPrivateResearchPaths(paths){
 if(!Array.isArray(paths)||paths.length===0)
  throw new Error('Tracked repository paths must be a nonempty array');
 const seen=new Set(),violations=[];
 for(const [i,path] of paths.entries()){
  if(!exactPath(path))throw new Error('Invalid tracked repository path');
  const canonical=path.toLowerCase();
  if(seen.has(canonical))throw new Error('Duplicate tracked repository path');
  seen.add(canonical);
  const parts=canonical.split('/');
  if(parts.slice(0,-1).some(part=>folderNames.has(part))||
     (filenames.has(parts.at(-1))||privateWorkbook(parts.at(-1)))){
   // Do not echo potentially sensitive path, source text, or vendor detail.
   violations.push('Tracked item #'+(i+1)+': prohibited private research material path');
  }
 }
 return {
  status:violations.length?'BLOCKED':'PRIVATE-RESEARCH-MATERIALS-LOCKED',
  checkedPaths:paths.length,violations
 };
}

export function validatePrivateResearchIgnorePolicy(contents){
 if(typeof contents!=='string')throw new Error('Missing private research ignore policy');
 const lines=new Set(contents.split(/\r?\n/).map(line=>line.trim())
  .filter(line=>line&&!line.startsWith('#')));
 const required=[
  ...PROTECTED_PRIVATE_RESEARCH_DIRS.map(name=>name+'/'),
  ...PROTECTED_PRIVATE_RESEARCH_FILES,
  ...PROTECTED_PRIVATE_RESEARCH_WORKBOOK_GLOBS
 ];
 if(required.some(rule=>!lines.has(rule)))
  throw new Error('Missing required private research .gitignore pattern');
 return {protectedPatterns:required.length,missingIgnoreRules:0};
}
