/**
 * Fail-closed, read-only audit of build outputs and development release locks.
 * This is NOT remote access verification, legal approval or public launch clearance.
 */
// Match real HTML attribute names, not inert data-* attributes. Accept quoted
// and unquoted forms; browser-only runtime tests remain a separate release gate.
function attributeValue(tag,name) {
  const pattern=/\s([a-z][a-z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/gi;
  for(const match of tag.matchAll(pattern)){
    if(match[1].toLowerCase()===name) return match[2]??match[3]??match[4];
  }
  return null;
}
function isExternalOrExecutable(value) {
  return typeof value==='string' &&
    /^(?:\/\/|[a-z][a-z0-9+.-]*:)/i.test(value.trim());
}

export function auditStaticRoutes(pages) {
  const violations=[];
  if (!Array.isArray(pages) || pages.length===0) return {checkedRoutes:0,violations:['No generated HTML routes found']};
  const seen=new Set();
  for (const page of pages) {
    const path=page?.path;
    if (typeof path!=='string' || !/^(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+[.]html$/.test(path) ||
        path.startsWith('../') || path.includes('/../')) {
      violations.push('Invalid route path: '+String(path));
      continue;
    }
    if (seen.has(path)) violations.push('Duplicate route: '+path);
    seen.add(path);
    if (typeof page.html!=='string') {
      violations.push(path+': missing rendered HTML');
      continue;
    }
    const html=page.html;
    const metaTags=html.match(/<meta\b[^>]*>/gi) || [];
    const noindex=metaTags.some(tag=>
      /\bname\s*=\s*["']robots["']/i.test(tag) &&
      /\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(tag)
    );
    if(!noindex) violations.push(path+': missing noindex meta robots directive');
    if(!/<html\b[^>]*\blang\s*=\s*["']en["']/i.test(html))
      violations.push(path+': missing html lang="en"');
    if(!/<title\b[^>]*>[^<\s][^<]*<\/title>/i.test(html))
      violations.push(path+': missing nonempty document title');
    const scripts=html.match(/<script\b[^>]*>/gi)||[];
    if(scripts.some(tag=>isExternalOrExecutable(attributeValue(tag,'src'))))
      violations.push(path+': unexpected externally hosted script');
    const forms=html.match(/<form\b[^>]*>/gi)||[];
    if(forms.some(tag=>isExternalOrExecutable(attributeValue(tag,'action'))))
      violations.push(path+': unexpected external form action');
    const submitControls=html.match(/<(?:button|input)\b[^>]*>/gi)||[];
    if(submitControls.some(tag=>isExternalOrExecutable(attributeValue(tag,'formaction'))))
      violations.push(path+': unexpected external form submission override');
  }
  return {checkedRoutes:pages.length,violations};
}
export function auditDeploymentConstraints({policy,headers,robots}={}) {
  const violations=[];
  const expected={policyVersion:1,monthlyBudgetINR:0,delegatedSpendINR:0,
    hostingCandidate:'netlify-free',commercialHostingApproved:false,
    productionLaunchApproved:false,affiliateActivationApproved:false,
    paidServicesApproved:false};
  for (const [key,value] of Object.entries(expected)) {
    if (!policy || policy[key]!==value)
      violations.push('Restrictive policy mismatch: '+key);
  }
  const text=typeof headers==='string'?headers:'';
  const rule=text.match(/(?:^|\r?\n)\/\*\s*\r?\n((?:[ \t]+[^\r\n]*\r?\n?)*)/);
  const wildcard=rule?.[1]||'';
  if(!/^\s*X-Robots-Tag:\s*noindex\b/im.test(wildcard))
    violations.push('Missing wildcard X-Robots-Tag: noindex');
  if(!/^\s*X-Content-Type-Options:\s*nosniff\b/im.test(wildcard))
    violations.push('Missing wildcard X-Content-Type-Options: nosniff');
  if(!/^\s*X-Frame-Options:\s*DENY\b/im.test(wildcard))
    violations.push('Missing wildcard X-Frame-Options: DENY');
  const robotsText=typeof robots==='string'?robots:'';
  if(!/^\s*User-agent:\s*\*\s*$/im.test(robotsText) ||
     !/^\s*Disallow:\s*\/\s*$/im.test(robotsText))
    violations.push('Missing User-agent: * and Disallow: / prelaunch crawl block');
  return {violations};
}
