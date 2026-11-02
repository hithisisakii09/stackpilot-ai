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
// HTML decodes character references in URL-bearing attributes before navigation
// or network requests. Reuse the same limited decoder for anchors and
// fetched resources so disguised external destinations do not pass preflight.
// A static regexp remains defense in depth; browser UAT is a separate gate.
function decodeHtmlUrlReferences(value) {
  if(typeof value!=='string') return '';
  return value.replace(/&(?:#(x[0-9a-f]+|[0-9]+);?|([a-z][a-z0-9]*);?)/gi,
    (full,numeric,named)=>{
      if(numeric){
        const hex=numeric[0].toLowerCase()==='x';
        const code=Number.parseInt(hex?numeric.slice(1):numeric,hex?16:10);
        return Number.isInteger(code)&&code>0&&code<=0x10ffff&&
          !(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):'\uFFFD';
      }
      const namedReferences={amp:'&',colon:':',tab:'\t',newline:'\n',sol:'/'};
      return namedReferences[named.toLowerCase()]??full;
    });
}
function normalizedUrlAttribute(value) {
  return decodeHtmlUrlReferences(value).trim().replace(/[\u0000-\u0020\u007f]/g,'');
}
function isExternalOrExecutable(value) {
  if(typeof value!=='string') return false;
  const candidate=normalizedUrlAttribute(value);
  return /^(?:\/\/|[a-z][a-z0-9+.-]*:)/i.test(candidate);
}
function unsafeAnchorDestination(value) {
  if(typeof value!=='string') return false;
  const href=normalizedUrlAttribute(value);
  if(href.startsWith('//')) return true;
  const scheme=/^([a-z][a-z0-9+.-]*):/i.exec(href);
  return Boolean(scheme&&!['https','mailto'].includes(scheme[1].toLowerCase()));
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
    // Only the actual name/content attributes count. A data-name spoof or
    // token such as noindex-test must not satisfy the prelaunch requirement.
    const robotsDirectives=metaTags
      .filter(tag=>String(attributeValue(tag,'name')??'').trim().toLowerCase()==='robots')
      .flatMap(tag=>String(attributeValue(tag,'content')??'')
        .split(',').map(value=>value.trim().toLowerCase()));
    const noindex=robotsDirectives.includes('noindex') && !robotsDirectives.includes('index');
    if(!noindex) violations.push(path+': missing or conflicting noindex meta robots directive');
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
    for (const tag of htmlTags.filter(tag=>/^<a\b/i.test(tag))) {
      const href=attributeValue(tag,'href');
      if (unsafeAnchorDestination(href))
        violations.push(path+': unsafe anchor destination');
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
  // Netlify supports path-scoped _headers blocks. Any second path block can
  // override prelaunch security/noindex behavior even when /* remains intact.
  // The unpublished site permits only one global wildcard block.
  const headerScopes=text.split(/\r?\n/).map(line=>line.trim())
    .filter(line=>line.startsWith('/'));
  if(headerScopes.length!==1 || headerScopes[0]!=='/*')
    violations.push('Unsafe Netlify headers: route-specific override or duplicate wildcard scope');
  const rule=text.match(/(?:^|\r?\n)\/\*\s*\r?\n((?:[ \t]+[^\r\n]*\r?\n?)*)/);
  const wildcard=rule?.[1]||'';
  for(const name of ['X-Robots-Tag','X-Content-Type-Options','X-Frame-Options']) {
    const count=wildcard.split(/\r?\n/)
      .filter(line=>line.trim().toLowerCase().startsWith(name.toLowerCase()+':')).length;
    if(count!==1) violations.push('Duplicate or missing wildcard header: '+name);
  }
  const headerValue=name=>wildcard.split(/\r?\n/).map(line=>line.trim())
    .find(line=>line.toLowerCase().startsWith(name.toLowerCase()+':'))
    ?.slice(name.length+1).trim()??'';
  const robotsDirectives=headerValue('X-Robots-Tag')
    .split(',').map(value=>value.trim().toLowerCase());
  const allowedRobots=new Set(['noindex','nofollow','noarchive']);
  if(!robotsDirectives.includes('noindex')||
     robotsDirectives.some(value=>!allowedRobots.has(value))||
     new Set(robotsDirectives).size!==robotsDirectives.length)
    violations.push('Missing or malformed wildcard X-Robots-Tag: noindex');
  if(headerValue('X-Content-Type-Options').toLowerCase()!=='nosniff')
    violations.push('Missing or malformed wildcard X-Content-Type-Options: nosniff');
  if(headerValue('X-Frame-Options').toUpperCase()!=='DENY')
    violations.push('Missing or malformed wildcard X-Frame-Options: DENY');

  // Browser enforcement on Netlify: a single restrictive wildcard CSP.
  // This protects scripts and passive connections that evade static HTML scans.
  const expectedCsp={
  "default-src": [
    "'none'"
  ],
  "script-src": [
    "'self'"
  ],
  "style-src": [
    "'self'",
    "'unsafe-inline'"
  ],
  "img-src": [
    "'self'",
    "data:"
  ],
  "font-src": [
    "'self'"
  ],
  "connect-src": [
    "'self'"
  ],
  "form-action": [
    "'self'"
  ],
  "frame-ancestors": [
    "'none'"
  ],
  "frame-src": [
    "'none'"
  ],
  "object-src": [
    "'none'"
  ],
  "base-uri": [
    "'self'"
  ],
  "worker-src": [
    "'none'"
  ],
  "media-src": [
    "'self'"
  ],
  "manifest-src": [
    "'self'"
  ],
  "upgrade-insecure-requests": []
};
  const policies=[...wildcard.matchAll(/^\s*Content-Security-Policy:\s*(.+)$/gmi)].map(match=>match[1].trim());
  if(policies.length!==1) {
    violations.push('Content-Security-Policy must appear exactly once in wildcard headers');
  } else {
    const declared=new Map();
    for(const part of policies[0].split(';').map(x=>x.trim()).filter(Boolean)) {
      const [name,...tokens]=part.split(/\s+/);
      if(!Object.hasOwn(expectedCsp,name)||declared.has(name)) {
        violations.push('Content-Security-Policy unexpected or duplicated directive: '+name);
      } else {
        declared.set(name,tokens);
      }
    }
    for(const [name,required] of Object.entries(expectedCsp)){
      const values=declared.get(name);
      if(!values||values.length!==required.length||
          values.slice().sort().join(' ')!==required.slice().sort().join(' ')){
        violations.push('Content-Security-Policy invalid directive: '+name);
      }
    }
  }
  const robotsText=typeof robots==='string'?robots:'';
  // A later Allow rule, user-agent group, or duplicate directive can override
  // the global Disallow. Accept exactly this unpublished crawl policy.
  const robotsRules=robotsText.split(/\r?\n/).map(line=>line.trim())
    .filter(line=>line.length>0 && !line.startsWith('#'));
  if(robotsRules.length!==2 ||
     !/^User-agent:\s*\*$/i.test(robotsRules[0]) ||
     !/^Disallow:\s*\/$/i.test(robotsRules[1]))
    violations.push('Unsafe robots.txt: unexpected or conflicting crawl directives');
  if(!/^\s*User-agent:\s*\*\s*$/im.test(robotsText) ||
     !/^\s*Disallow:\s*\/\s*$/im.test(robotsText))
    violations.push('Missing User-agent: * and Disallow: / prelaunch crawl block');
  return {violations};
}
