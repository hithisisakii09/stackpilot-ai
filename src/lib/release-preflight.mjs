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
    // Browser resources can leak visitor metadata without JavaScript, e.g. a
    // tracking pixel, iframe, cross-site preload, or remote CSS font/image.
    // Treat all absolute/protocol-relative resource URLs as unreviewed.
    const resourceRules=[
      ['img',['src','srcset']],
      ['iframe',['src']],
      ['object',['data']],
      ['embed',['src']],
      ['source',['src','srcset']],
      ['audio',['src']],
      ['video',['src','poster']],
      ['track',['src']]
    ];
    const htmlTags=html.match(/<[a-z][a-z0-9-]*\b[^>]*>/gi)||[];
    for (const [type,attrs] of resourceRules) {
      const tags=htmlTags.filter(tag=>new RegExp('^<'+type+'\\b','i').test(tag));
      // srcdoc can contain HTML tags and '>' inside a quoted value. The
      // lightweight opening-tag scan may end before that quote closes, so
      // reject the attribute presence rather than requiring a parsed value.
      if(type==='iframe' && tags.some(tag=>/\ssrcdoc\s*=/i.test(tag)))
        violations.push(path+': inline iframe srcdoc forbidden');
      for (const tag of tags) {
        for (const attr of attrs) {
          const value=attributeValue(tag,attr);
          if (value===null) continue;
          if (attr==='srcdoc') {
            violations.push(path+': inline iframe srcdoc forbidden');
          } else if (attr==='srcset') {
            if(value.split(',').some(candidate=>isExternalOrExecutable(candidate.trim().split(/\s+/)[0])))
              violations.push(path+': external embedded resource ('+type+' '+attr+')');
          } else if(isExternalOrExecutable(value)) {
            violations.push(path+': external embedded resource ('+type+' '+attr+')');
          }
        }
      }
    }
    for (const tag of htmlTags.filter(tag=>/^<link\b/i.test(tag))) {
      const href=attributeValue(tag,'href');
      if(isExternalOrExecutable(href))
        violations.push(path+': external linked resource');
    }
    if(metaTags.some(tag=>String(attributeValue(tag,'http-equiv')).toLowerCase()==='refresh'))
      violations.push(path+': automatic meta refresh forbidden');
    const embeddedStyle=html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi)||[];
    const inlineStyle=htmlTags.map(tag=>attributeValue(tag,'style')).filter(value=>value!==null);
    // A static HTML regexp is defense-in-depth, not full CSS parsing.
    const cssExternal=/(?:@import\s+(?:url\(\s*)?["']?\s*|url\(\s*["']?\s*)(?:https?:\/\/|\/\/)/i;
    if([...embeddedStyle,...inlineStyle].some(fragment=>cssExternal.test(fragment)))
      violations.push(path+': external CSS resource');

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
