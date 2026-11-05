/**
 * Read-only Git index audit of accidentally tracked private research artifacts.
 * Git ignore rules are separately exercised with the real Git pattern engine.
 * No source-content inspection, network or mutation takes place.
 */
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {
 auditTrackedPrivateResearchPaths,validatePrivateResearchIgnorePolicy,
 PROTECTED_PRIVATE_RESEARCH_DIRS,PROTECTED_PRIVATE_RESEARCH_FILES
} from '../src/lib/private-research-material-guard.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
function git(args,options={}){
 const result=spawnSync('git',args,{cwd:root,encoding:'utf8',
  maxBuffer:4*1024*1024,...options});
 if(result.error||result.status!==0||result.signal)
  throw new Error('Private research Git inventory or ignore rule verification failed');
 return result.stdout;
}

export function auditCurrentPrivateResearchMaterials(){
 const tracked=git(['ls-files','--cached','-z']).split('\0').filter(Boolean);
 const files=auditTrackedPrivateResearchPaths(tracked);
 const ignore=readFileSync(new URL('../.gitignore',import.meta.url),'utf8');
 const policy=validatePrivateResearchIgnorePolicy(ignore);
 const probes=[
  ...PROTECTED_PRIVATE_RESEARCH_DIRS.flatMap(folder=>[
   folder+'/document.txt','docs/'+folder+'/document.txt'
  ]),
  ...PROTECTED_PRIVATE_RESEARCH_FILES.flatMap(name=>[
   name,'docs/manual/'+name
  ])
 ];
 // --no-index is critical: check-ignore must test patterns even on tracked files.
 const matches=new Set(git(['check-ignore','--no-index','-z','--stdin'],{
  input:probes.join('\0')+'\0'
 }).split('\0').filter(Boolean));
 if(probes.some(probe=>!matches.has(probe)))
  throw new Error('Private research ignore rules do not apply to all protected paths');
 if(files.violations.length)throw new Error('Git index includes prohibited private research material paths');
 return {
  ...files,
  protectedIgnorePatterns:policy.protectedPatterns,
  missingIgnoreRules:policy.missingIgnoreRules,
  gitRulesVerified:true
 };
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const audit=auditCurrentPrivateResearchMaterials();
  console.log('Private research Git material guard:',audit.status,
   '| tracked files checked:',audit.checkedPaths,
   '| ignore patterns:',audit.protectedIgnorePatterns,
   '| actual Git ignores checked:',audit.gitRulesVerified,
   '| publication/reviewer authority: disabled');
 }catch{
  console.error('BLOCKED: private research Git material inventory or ignore rules invalid');
  process.exitCode=1;
 }
}
