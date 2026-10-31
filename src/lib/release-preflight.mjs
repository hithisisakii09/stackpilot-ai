/**
 * Fail-closed, read-only audit of build outputs and development release locks.
 * This is NOT remote access verification, legal approval or public launch clearance.
 */
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
    if(/<script\b[^>]*\bsrc\s*=\s*["']https?:\/\//i.test(html))
      violations.push(path+': unexpected externally hosted script');
    if(/<form\b[^>]*\baction\s*=\s*["']https?:\/\//i.test(html))
      violations.push(path+': unexpected external form action');
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
