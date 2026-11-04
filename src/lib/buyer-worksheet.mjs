/**
 * Vendor-neutral software procurement worksheet.
 * Pure and local: no vendor comparisons, telemetry, cookies, network calls or persistence.
 */
const groups = {
 CRM: [
  ['pipeline-stages','Pipeline and deal stages','Can the product represent your actual sales stages and deal owners?'],
  ['import-export','Data import and export','Can you import and export contacts and deals with required fields and associations?'],
  ['access-control','Role-based access','Can you configure team access and visibility to meet your security needs?'],
  ['integrations','Integration requirements','Are the integrations you depend on supported by your actual plan?'],
  ['automations','Workflow automation','Are the workflows you need available without unwanted extra charges?'],
  ['reporting','Reporting and dashboards','Can you reproduce your key sales reports and measure data accurately?'],
  ['total-cost','Total cost of ownership','What are the current per-seat costs, add-ons, limits and cancellation terms?']
 ],
 SEO: [
  ['audit-coverage','Site audit coverage','How many URLs may be audited and what technical issues are reported?'],
  ['rank-tracking','Rank tracking coverage','Which locations, devices and search engines can be tracked on your plan?'],
  ['keyword-data','Keyword research scope','What countries, languages and history periods are included in keyword research?'],
  ['exports','Data exports','Which export formats and monthly export limits apply?'],
  ['seat-limits','User seats and permissions','How many teammates can access the workspace and at what cost?'],
  ['crawl-limits','Crawl or credit limits','What monthly crawl credits or other usage allowances apply?'],
  ['ownership','Verified property access','Does connecting your own verified site change available features or limits?']
 ],
 Hosting: [
  ['traffic-bandwidth','Traffic and bandwidth','How are visits and bandwidth measured and what happens if you exceed limits?'],
  ['backups','Backup retention and restore','How often are backups taken, how long are they kept, and is restore extra?'],
  ['regions','Hosting regions','Where can your application and data be hosted for latency and residency requirements?'],
  ['staging','Staging and deployment','Is a safe staging environment included and how is deployment rollback handled?'],
  ['storage','Storage and capacity','What storage, CPU, memory and scaling limits apply at your expected usage?'],
  ['support','Support and reliability','Which support response expectations and availability commitments are documented?'],
  ['total-bill','Total monthly bill','Which extras, backup fees, overages and tax rules could affect the monthly bill?']
 ]
};
const order=['CRM','SEO','Hosting'];
const safeCategory=value=> {
 if(typeof value!=='string'||!Object.hasOwn(groups,value))throw new Error('Invalid software category');
 return value;
};
export const listCategories=()=>[...order];
export const criteriaFor=category=>groups[safeCategory(category)].map(([id,label,question])=>({id,label,question}));
export function buildBuyerWorksheet(category,selectedIds){
 const c=safeCategory(category);
 if(!Array.isArray(selectedIds))throw new Error('Selected criteria must be an array');
 if(selectedIds.length>12)throw new Error('Too many selected criteria');
 if(selectedIds.length===0)throw new Error('Select at least one requirement');
 const unique=new Set(selectedIds);
 if(unique.size!==selectedIds.length)throw new Error('Duplicate selected criterion');
 const items=criteriaFor(c);
 if(selectedIds.some(id=>typeof id!=='string'||!items.some(item=>item.id===id))){
  throw new Error('Invalid criterion for selected category');
 }
 const selected=items.filter(item=>unique.has(item.id));
 return [
  'StackPilot AI — Software requirements worksheet',
  'Category: '+c,
  'This worksheet represents your requirements, not verified vendor capabilities.',
  '',
  ...selected.flatMap((item,i)=>[`${i+1}. ${item.label}`,`   Ask: ${item.question}`,'   Evidence / plan / region / date: __________________']),
  '',
  'Confirm all features, prices, regional restrictions and plan limits with the provider.',
  'No paid rankings or affiliate links are used in this worksheet.',
  'This text was generated locally in your browser; StackPilot does not collect your selections.'
 ].join('\n');
}


/**
 * Safely escape one UTF-8 CSV cell for spreadsheets.
 * Guard against formula evaluation even if a future catalog string is untrusted.
 * Validation in buildBuyerWorksheetCsv means only known category and criterion
 * values are currently exportable, never arbitrary buyer-entered answers.
 */
export function escapeSpreadsheetCsvCell(value) {
 const text = String(value ?? '').replaceAll('\0', '');
 const safe = /^[\s\uFEFF]*[=+\-@\t\r|%]/u.test(text) ? "'" + text : text;
 return '"' + safe.replaceAll('"', '""') + '"';
}

/** Export selected buyer questions, with every vendor response unverified and blank. */
export function buildBuyerWorksheetCsv(category,selectedIds) {
 // Reuse the same validation and stable category ordering as the text worksheet.
 buildBuyerWorksheet(category,selectedIds);
 const selected=new Set(selectedIds);
 const fields=['category','requirement_id','requirement','question','verification_status','vendor_answer','evidence_plan_region_date'];
 const rows=criteriaFor(category)
   .filter(item=>selected.has(item.id))
   .map(item=>[category,item.id,item.label,item.question,'Unverified','','']
     .map(escapeSpreadsheetCsvCell).join(','));
 return [fields.join(','),...rows].join('\r\n')+'\r\n';
}
