/**
 * OFFLINE PRIVATE worksheet validation: a human-entered CSV is an untrusted
 * research note, never vendor truth, authenticated review, or publication.
 * No stdout/stderr leaks of source URLs, excerpts or user-entered notes.
 */
import {serializeHubspotExportWorksheetCsv} from './hubspot-export-evidence-assessment.mjs';
import {hashEvidenceExcerpt} from './comparison-evidence-captures.mjs';

const MAX_BYTES=32768;
const formulaStart=/^[\s\uFEFF\u200B-\u200D\u2060]*[=+\-@]/u;
const invisibleFormatting=/[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/u;
// Unverified researcher placeholders cannot establish a plan, region,
// permission or limitation, even if the rest of a row looks complete.
const unfilledLabels=new Set([
 'unknown','n/a','not applicable','tbd','pending','not checked',
 'not documented','not verified','unspecified','none','?','-',
 'unconfirmed','no evidence','not evaluated'
]);
const unfilled=value=>!value||unfilledLabels.has(value.trim().toLowerCase().replace(/\s+/g,' '));
const fields=['sourceUrl','inspectionDate','plan','region','permissionScope','excerpt','limitations'];
const allowedDisposition=new Set([
 '','NEEDS-EVIDENCE','OBSERVED-UNVERIFIED','CONTRADICTION-REPORTED-UNVERIFIED'
]);
const NO_AUTH={
 sourceVerified:false,independentlyVerified:false,
 reviewerAuthenticated:false,supportsPredicateVerified:false,
 canPublish:false
};
const error=()=>new Error('Invalid private HubSpot research worksheet: structure or research entry rejected');

function parseQuotedLine(line){
 if(typeof line!=='string'||!line.length||/[\r\n\x00-\x1f\x7f]/.test(line))
  throw error();
 const cells=[];
 let i=0;
 while(i<line.length){
  if(line[i]!=='"')throw error();
  ++i;
  let cell='',closed=false;
  while(i<line.length){
   if(line[i]==='"'){
    if(line[i+1]==='"'){cell+='"';i+=2;}
    else{++i;closed=true;break;}
   }else{cell+=line[i++];}
  }
  if(!closed)throw error();
  cells.push(cell);
  if(i===line.length)break;
  if(line[i]!==',')throw error();
  ++i;
  if(i>=line.length)throw error();
 }
 return cells;
}

function parseCsv(csv){
 if(typeof csv!=='string'||Buffer.byteLength(csv,'utf8')>MAX_BYTES||
    !csv.endsWith('\r\n')||/[\u0000\uFEFF]/.test(csv))
  throw error();
 const lines=csv.split('\r\n');
 if(lines.at(-1)!=='')throw error();
 lines.pop();
 if(lines.length!==5)throw error();
 const rows=lines.map(parseQuotedLine);
 if(rows.some(row=>row.length!==12))throw error();
 return rows;
}
function validDay(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T00:00:00.000Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function plain(value,max){
 return typeof value==='string'&&value.length<=max&&value.trim()===value&&
  !/[<>\x00-\x1f\x7f]/.test(value)&&!invisibleFormatting.test(value)&&
  (!formulaStart.test(value)||value==='-');
}
function vendorUrl(value){
 if(value.length>400||!plain(value,400))throw error();
 try{
  const url=new URL(value);
  const host=url.hostname.toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||url.port||
     url.search||url.hash||(host!=='hubspot.com'&&!host.endsWith('.hubspot.com'))||
     !url.pathname||url.pathname==='/')
   throw error();
  return url.href;
 }catch{
  throw error();
 }
}

export function assessManuallyCompletedHubspotWorksheet(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).some(key=>!['csv','assessment','today'].includes(key))||
    !Object.hasOwn(input,'csv')||!Object.hasOwn(input,'assessment'))
  throw error();
 const {csv,assessment,today=new Date().toISOString().slice(0,10)}=input;
 if(!validDay(today))throw new Error('Invalid current date for private worksheet');
 // Reuse exact, unapproved canonical question/row validation.
 const expected=parseCsv(serializeHubspotExportWorksheetCsv(assessment));
 const rows=parseCsv(csv);
 if(rows.some((row,i)=>row.slice(0,4).some((value,j)=>value!==expected[i][j])))
  throw error();
 const results=[];
 for(let i=1;i<rows.length;i++){
  const manual=rows[i].slice(4);
  const values=Object.fromEntries(fields.map((key,j)=>[key,manual[j]]));
  const disposition=manual[7];
  if(!allowedDisposition.has(disposition))throw error();
  for(const key of ['plan','region','permissionScope','limitations']){
   if(!plain(values[key],key==='limitations'?400:200))throw error();
  }
  if(values.sourceUrl)vendorUrl(values.sourceUrl);
  if(values.inspectionDate&&(!validDay(values.inspectionDate)||values.inspectionDate>today))
   throw error();
  if(values.excerpt){
   // Vendor text in an editable CSV is untrusted; reject formula-like and
   // visually deceptive bytes before counting a self-reported observation.
   if(formulaStart.test(values.excerpt)||invisibleFormatting.test(values.excerpt))throw error();
   try{hashEvidenceExcerpt(values.excerpt);}catch{throw error();}
   if(values.excerpt.includes(assessment.candidateAssertion))
    throw error();
  }
  const missing=fields.filter(key=>{
   const value=values[key];
   return unfilled(value);
  });
  if(!disposition&&manual.some(Boolean))missing.push('disposition');
  const complete=missing.length===0;
  let recordingState='NO-HUMAN-OBSERVATION';
  if(manual.some(Boolean)){
   if(complete&&disposition==='OBSERVED-UNVERIFIED')
    recordingState='HUMAN-OBSERVATION-CLAIMED-UNVERIFIED';
   else if(complete&&disposition==='CONTRADICTION-REPORTED-UNVERIFIED')
    recordingState='HUMAN-CONTRADICTION-CLAIMED-UNVERIFIED';
   else recordingState='PARTIAL-LOCAL-NOTES';
  }
  const lead=assessment.vendorLeads.find(entry=>entry.sourceUrl===values.sourceUrl);
  results.push({
   predicateId:rows[i][0],
   status:'NEEDS-EVIDENCE',
   recordingState,
   missingFields:missing,
   claimedSourceLeadMatched:Boolean(lead),
   existingProposalForSource:Boolean(lead?.proposedForClaim),
   ...NO_AUTH
  });
 }
 const reportedObservations=results.filter(row=>row.recordingState==='HUMAN-OBSERVATION-CLAIMED-UNVERIFIED').length;
 const reportedContradictions=results.filter(row=>row.recordingState==='HUMAN-CONTRADICTION-CLAIMED-UNVERIFIED').length;
 return {
  status:'PRIVATE-MANUAL-WORKSHEET-UNVERIFIED',
  claimId:assessment.claimId,
  productId:assessment.productId,
  totalPredicates:4,
  rowsWithoutHumanObservations:4-reportedObservations-reportedContradictions,
  reportedObservations,
  reportedContradictions,
  independentlyVerifiedPredicates:0,
  authenticatedApprovals:0,
  approved:false,
  sourceVerified:false,
  canPublish:false,
  publicationAllowed:false,
  rows:results
 };
}
