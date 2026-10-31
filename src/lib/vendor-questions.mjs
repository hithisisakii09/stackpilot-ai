/** Neutral, locally exported comparison checklist. No vendor facts are inferred. */
const COMMON_QUESTIONS = [
  ['Pricing and contract','What is the written current total price, currency, tax, renewal term, cancellation policy and usage limit for our plan and region?'],
  ['Team access','Which documented roles and seats are included for our required team size and workflow?'],
  ['Data ownership','What are the export formats, retention rules, deletion options and exit costs?'],
  ['Security and privacy','Which documented access controls, data regions, security reports and processing terms apply?'],
  ['Onboarding and support','What migration assistance, support channels, response windows and training are included?']
];
const CATEGORY_QUESTION = {
  CRM: ['Migration and portability','Can we validate a sample pipeline import, field mapping, duplicates and rollback before committing?'],
  SEO: ['SEO usage limits','What crawl and query limits apply to the proposed plan, and how can we verify quota and overage policies?'],
  Hosting: ['Hosting recovery drill','How is backup restoration tested, and what are the actual retention, downtime and overage policies?']
};
const safeCell = value => {
  const text=String(value).replaceAll('\0','');
  const safe=/^\s*[=+\-@]/.test(text) ? "'"+text : text;
  return '"'+safe.replaceAll('"','""')+'"';
};
export function buildVendorQuestionsCsv(model) {
  if (!model || !Object.hasOwn(CATEGORY_QUESTION,model.category) ||
      !Array.isArray(model.products) || model.products.length !== 2 ||
      model.products.some(p=>!p || typeof p.id!=='string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id) ||
        typeof p.name!=='string' || !p.name.trim() || p.name.length>120) ||
      model.products[0].id === model.products[1].id) {
    throw new Error('Invalid comparison category or candidates');
  }
  const [first,second] = model.products;
  const header=['category','criterion','question','first_vendor','first_vendor_verification',
    'second_vendor','second_vendor_verification','evidence_url_plan_region_date'];
  const questions=[...COMMON_QUESTIONS,CATEGORY_QUESTION[model.category]];
  const rows=[header,...questions.map(([criterion,question])=>[
    model.category,criterion,question,first.name,'Unverified',second.name,'Unverified',''
  ])];
  return rows.map(row=>row.map(safeCell).join(',')).join('\r\n')+'\r\n';
}
