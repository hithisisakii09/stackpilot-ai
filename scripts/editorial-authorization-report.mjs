/** Read-only proof of a locked reviewer and editorial API boundary. */
import {readFileSync} from 'node:fs';
import {auditCurrentEditorialRuntimeSurface} from './editorial-runtime-source.mjs';
import {EDITORIAL_ACTIONS,evaluateEditorialAuthorization} from '../src/lib/editorial-authorization.mjs';
const policy=JSON.parse(readFileSync(new URL('../config/operating-policy.json',import.meta.url),'utf8'));
const surface=auditCurrentEditorialRuntimeSurface();
const actions=EDITORIAL_ACTIONS.map(action=>evaluateEditorialAuthorization({action,policy}));
const result={
 status:surface.violations.length?'BLOCKED':'STATIC-ONLY-LOCKED',
 currentSiteHasReviewerAuth:false,editorialActionsAllowed:0,
 surface,
 actions
};
console.log(JSON.stringify(result,null,2));
if(surface.violations.length)process.exitCode=1;
