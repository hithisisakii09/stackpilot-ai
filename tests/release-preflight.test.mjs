import test from 'node:test';
import assert from 'node:assert/strict';
import { auditStaticRoutes, auditDeploymentConstraints } from '../src/lib/release-preflight.mjs';

const goodPage = '<!doctype html><html lang="en"><head><meta name="robots" content="index, follow"><title>StackPilot AI</title></head><body><h1>Comparison</h1></body></html>';
const privatePage = '<!doctype html><html lang="en"><head><meta name="robots" content="noindex, nofollow"><title>StackPilot AI</title></head><body><h1>Private</h1></body></html>';
const policy = {policyVersion:1,monthlyBudgetINR:0,delegatedSpendINR:0,hostingCandidate:'netlify-free',commercialHostingApproved:false,productionLaunchApproved:true,affiliateActivationApproved:false,paidServicesApproved:false};
const secureCsp = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; worker-src 'none'; media-src 'self'; manifest-src 'self'; upgrade-insecure-requests";
const headers = '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Content-Security-Policy: '+secureCsp+'\n\n/tools/private-uat-worksheet/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n\n/preview-build/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n\n/research/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n';
const robots = 'User-agent: *\nAllow: /\nDisallow: /tools/private-uat-worksheet/\nDisallow: /preview-build/\nDisallow: /research/\nSitemap: https://inspiring-chaja-cfb85f.netlify.app/sitemap.xml\n';

test('audits all generated static routes rather than a fixed hand-written shortlist', () => {
  const result=auditStaticRoutes([
    {path:'index.html',html:goodPage},
    {path:'unplanned/new-tool/index.html',html:goodPage},
    {path:'software/kinsta/index.html',html:goodPage}
  ]);
  assert.equal(result.checkedRoutes,3);
  assert.deepEqual(result.violations,[]);
});

test('fails closed if public page has noindex, private page lacks noindex, or page lacks title/lang', () => {
  const accidentalNoindex=goodPage.replace('index, follow','noindex, nofollow');
  const badPublic=auditStaticRoutes([{path:'index.html',html:goodPage},{path:'new-path/index.html',html:accidentalNoindex}]);
  assert.ok(badPublic.violations.some(v=>v.includes('new-path/index.html')&&v.includes('index')));
  const badPrivate=auditStaticRoutes([{path:'tools/private-uat-worksheet/index.html',html:goodPage}]);
  assert.ok(badPrivate.violations.some(v=>v.includes('tools/private-uat-worksheet/index.html')&&v.includes('noindex')));
  assert.deepEqual(auditStaticRoutes([{path:'tools/private-uat-worksheet/index.html',html:privatePage}]).violations,[]);
  assert.deepEqual(auditStaticRoutes([{path:'index.html',html:goodPage.replace('<title>StackPilot AI</title>','')}]).violations.filter(v=>v.includes('title')).length,1);
  assert.ok(auditStaticRoutes([{path:'index.html',html:goodPage.replace('lang="en"','lang="fr"')}]).violations.some(v=>v.includes('lang')));
});

test('fails closed for unexpected external JavaScript and external form submission', () => {
  const external=goodPage.replace('</body>', '<script src="https://tracking.example/collect.js"></script><form action="https://tracking.example/collect" method="post"></form></body>');
  const violations=auditStaticRoutes([{path:'index.html',html:external}]).violations;
  assert.ok(violations.some(v=>v.includes('externally hosted script')));
  assert.ok(violations.some(v=>v.includes('external form action')));
});

test('requires at least one route and rejects duplicate or unsafe route paths', () => {
  assert.ok(auditStaticRoutes([]).violations.length>0);
  assert.ok(auditStaticRoutes([{path:'index.html',html:goodPage},{path:'index.html',html:goodPage}]).violations.some(v=>v.includes('Duplicate')));
  assert.ok(auditStaticRoutes([{path:'../secret.html',html:goodPage}]).violations.some(v=>v.includes('Invalid route')));
});

test('validates zero budget, disabled affiliate gates, public launch headers and robots', () => {
  assert.deepEqual(auditDeploymentConstraints({policy,headers,robots}).violations,[]);
  for (const [key,value] of Object.entries({monthlyBudgetINR:1,delegatedSpendINR:1,productionLaunchApproved:false,affiliateActivationApproved:true,paidServicesApproved:true,commercialHostingApproved:true})) {
    const result=auditDeploymentConstraints({policy:{...policy,[key]:value},headers,robots});
    assert.ok(result.violations.some(v=>v.includes(key)),key);
  }
  assert.ok(auditDeploymentConstraints({policy,headers:headers.replace('noindex','index'),robots}).violations.some(v=>v.includes('X-Robots-Tag')));
  assert.ok(auditDeploymentConstraints({policy,headers,robots:'User-agent: *\nDisallow: /\n'}).violations.some(v=>v.includes('robots')));
});

test('does not mutate supplied inputs or assert site access from a static scan', () => {
  const pages=[{path:'index.html',html:goodPage}];
  const config={policy:{...policy},headers,robots};
  const before=structuredClone({pages,config});
  const route=auditStaticRoutes(pages);
  const deploy=auditDeploymentConstraints(config);
  assert.deepEqual({pages,config},before);
  assert.equal(route.checkedRoutes,1);
  assert.equal(Object.hasOwn(route,'authenticatedAccessVerified'),false);
  assert.equal(Object.hasOwn(deploy,'publicLaunchAuthorized'),false);
});

test('blocks protocol-relative, unquoted and active-scheme external scripts and forms', () => {
  const cases=[
    ['<script src=//telemetry.example/collect.js></script>','externally hosted script'],
    ['<script SRC=https://telemetry.example/collect.js></script>','externally hosted script'],
    ['<script src="data:text/javascript,alert(1)"></script>','externally hosted script'],
    ['<form action=//telemetry.example/submit method=post></form>','external form action'],
    ["<form ACTION='javascript:alert(1)'></form>",'external form action'],
    ['<form action=https://telemetry.example/submit></form>','external form action']
  ];
  for(const [injection,expected] of cases){
    const html=goodPage.replace('</body>',injection+'</body>');
    const violations=auditStaticRoutes([{path:'index.html',html}]).violations;
    assert.ok(violations.some(v=>v.includes(expected)),injection+': '+violations.join(' | '));
  }
});

test('rejects external form submission overrides while allowing local URLs and inert data-src', () => {
  const cases=[
    '<form action="/local"><button type=submit formaction=//telemetry.example/submit>Send</button></form>',
    '<form action="/local"><input type=submit formaction="https://telemetry.example/submit"></form>'
  ];
  for(const injection of cases){
    const html=goodPage.replace('</body>',injection+'</body>');
    const violations=auditStaticRoutes([{path:'index.html',html}]).violations;
    assert.ok(violations.some(v=>v.includes('external form submission override')),injection+': '+violations.join(' | '));
  }
  const safe=goodPage.replace('</body>','<script data-src="https://example.com/inert.js"></script><script src="/_astro/app.js"></script><form action="/local"><button type=submit formaction="/safe">Go</button></form></body>');
  assert.deepEqual(auditStaticRoutes([{path:'index.html',html:safe}]).violations,[]);
});


test('blocks third-party image pixels, source/srcset and embedded frames', () => {
  const cases=[
    ['<img src=https://telemetry.example/pixel.gif alt="">','external embedded resource'],
    ['<img srcset="/local.png 1x, https://tracker.example/pixel@2x.png 2x" alt="">','external embedded resource'],
    ['<iframe src="//partner.example/frame"></iframe>','external embedded resource'],
    ['<iframe srcdoc="<script>fetch(&quot;https://tracker.example&quot;)</script>"></iframe>','iframe srcdoc'],
    ['<object data="https://tracker.example/embed"></object>','external embedded resource'],
    ['<embed src=//tracker.example/embed>','external embedded resource'],
    ['<source srcset="https://tracker.example/media.webp 1x">','external embedded resource'],
    ['<video poster=https://tracker.example/poster.png></video>','external embedded resource'],
    ['<audio src="//tracker.example/stream.mp3"></audio>','external embedded resource']
  ];
  for (const [injection,reason] of cases) {
    const rendered=goodPage.replace('</body>',injection+'</body>');
    const result=auditStaticRoutes([{path:'index.html',html:rendered}]);
    assert.ok(result.violations.some(v=>v.includes(reason)),injection+': '+result.violations.join(' | '));
  }
});

test('blocks external stylesheet, preconnect, prefetched resources and automatic redirects', () => {
  const cases=[
    ['<link rel=stylesheet href="https://cdn.example/theme.css">','external linked resource'],
    ['<link rel=preconnect href="//tracker.example">','external linked resource'],
    ['<link rel="dns-prefetch" href="https://tracker.example">','external linked resource'],
    ['<link rel=preload as=script href=https://tracker.example/js>','external linked resource'],
    ['<meta http-equiv="refresh" content="0;url=https://tracker.example">','meta refresh']
  ];
  for (const [injection,reason] of cases) {
    const rendered=goodPage.replace('</head>',injection+'</head>');
    const result=auditStaticRoutes([{path:'index.html',html:rendered}]);
    assert.ok(result.violations.some(v=>v.includes(reason)),injection+': '+result.violations.join(' | '));
  }
});

test('blocks third-party CSS imports and background image URLs', () => {
  const cases=[
    '<style>@import "https://fonts.example/theme.css";</style>',
    '<style>.hero{background-image:url(//tracker.example/pixel.png)}</style>',
    '<div style="background:url(https://tracker.example/pixel.png)">Hello</div>'
  ];
  for(const injection of cases){
    const result=auditStaticRoutes([{path:'index.html',html:goodPage.replace('</body>',injection+'</body>')}]);
    assert.ok(result.violations.some(v=>v.includes('external CSS resource')),injection+': '+result.violations.join(' | '));
  }
});

test('allows first-party static assets, normal official external links and inert data attributes', () => {
  const safe=goodPage.replace('</body>',[
    '<img alt="local" src="/images/logo.webp" srcset="/images/logo.webp 1x, /images/logo2.webp 2x">',
    '<link rel="stylesheet" href="/_astro/app.css">',
    '<script src="/_astro/app.js"></script>',
    '<a href="https://www.hubspot.com/" target="_blank" rel="noopener noreferrer">Official site</a>',
    '<img alt="inert" data-src="https://tracker.example/never-loaded.jpg">',
    '<style>.box{background:url(/images/local.png)}</style>',
    '<div style="background-image:url(/images/local.png)">Preview</div>'
  ].join('')+'</body>');
  assert.deepEqual(auditStaticRoutes([{path:'index.html',html:safe}]).violations,[]);
});


const withCsp = headers;
const withoutCsp = headers.replace(/  Content-Security-Policy:[^\n]*\n/, '');

test('requires a restrictive wildcard Content Security Policy before prelaunch', () => {
  assert.deepEqual(auditDeploymentConstraints({policy,headers:withCsp,robots}).violations,[]);
  assert.ok(auditDeploymentConstraints({policy,headers:withoutCsp,robots}).violations.some(v=>v.includes('Content-Security-Policy')));
});

test('fails closed when CSP enables active scripts, remote connections, or unsafe framing', () => {
  const attacks=[
    ["script-src 'self'", "script-src 'self' 'unsafe-inline'"],
    ["script-src 'self'", "script-src 'self' 'unsafe-eval'"],
    ["script-src 'self'", "script-src *"],
    ["connect-src 'self'", "connect-src 'self' https://tracking.example"],
    ["img-src 'self' data:", "img-src *"],
    ["frame-ancestors 'none'", "frame-ancestors *"],
    ["object-src 'none'", "object-src https://cdn.example"],
    ["default-src 'none'", "default-src 'self'"]
  ];
  for(const [original,replacement] of attacks){
    const compromised=withCsp.replace(original,replacement);
    const violations=auditDeploymentConstraints({policy,headers:compromised,robots}).violations;
    assert.ok(violations.some(v=>v.includes('Content-Security-Policy')),replacement+': '+violations.join(' | '));
  }
  assert.ok(auditDeploymentConstraints({policy,headers:withCsp.replace("  Content-Security-Policy:", "  X-Not-CSP:"),robots}).violations.some(v=>v.includes('Content-Security-Policy')));
});

test('rejects duplicate, truncated and unexpected CSP directives', () => {
  const wrong=[
    withCsp.replace('  X-Frame-Options: DENY', '  X-Frame-Options: DENY\n  Content-Security-Policy: default-src *'),
    withCsp.replace("object-src 'none'; ",""),
    withCsp.replace("; upgrade-insecure-requests",""),
    withCsp.replace("; upgrade-insecure-requests","; report-uri https://tracking.example")
  ];
  for(const compromised of wrong){
    const violations=auditDeploymentConstraints({policy,headers:compromised,robots}).violations;
    assert.ok(violations.some(v=>v.includes('Content-Security-Policy')),violations.join(' | '));
  }
});

test('fails closed if Netlify headers add unexpected route overrides or wildcard X-Robots-Tag', () => {
  const variants=[
    headers+'\n/tools/*\n  X-Robots-Tag: index, follow\n',
    headers+'\n/tools/*\n  Content-Security-Policy: default-src *\n',
    headers+'\n/*\n  X-Robots-Tag: noindex\n',
    headers.replace('X-Frame-Options: DENY','X-Frame-Options: DENY\n  X-Robots-Tag: noindex, nofollow')
  ];
  for(const compromised of variants){
    const violations=auditDeploymentConstraints({policy,headers:compromised,robots}).violations;
    assert.ok(violations.length>0,'Competing Netlify header rule was not rejected');
  }
});

test('fails closed if robots.txt drops private disallow rules or adds unexpected crawler bypass', () => {
  const variants=[
    'User-agent: *\nDisallow: /\n',
    robots+'User-agent: Googlebot\nAllow: /\n',
    'User-agent: *\nAllow: /\n'
  ];
  for(const compromised of variants){
    const violations=auditDeploymentConstraints({policy,headers,robots:compromised}).violations;
    assert.ok(violations.some(v=>v.includes('crawl')||v.includes('robots')),
      'Conflicting robots rule was not rejected: '+compromised);
  }
  assert.deepEqual(auditDeploymentConstraints({policy,headers,robots:'# Public launch\n'+robots+'\n# Comments allowed\n'}).violations,[]);
});

test('rejects spoofed or malformed noindex metadata on private routes and validates public index metadata',()=>{
 const page=meta=>privatePage.replace('<meta name="robots" content="noindex, nofollow">',meta);
 const rejected=[
  '<meta data-name="robots" content="noindex">',
  '<meta name="robots" data-content="noindex">',
  '<meta name="robots" content="noindex-test">',
  '<meta name="robots" content="index, noindex">',
  '<meta name="robots" content="noindex"><meta name="robots" content="index">'
 ];
 for(const injected of rejected){
  const result=auditStaticRoutes([{path:'tools/private-uat-worksheet/index.html',html:page(injected)}]);
  assert.ok(result.violations.some(v=>v.includes('noindex')),injected+': '+result.violations.join(' | '));
 }
 for(const ok of [
  '<meta name="robots" content="noindex">',
  '<meta name=robots content=noindex>',
  "<meta content='nofollow, noindex' name='robots'>"
 ]){
  assert.deepEqual(auditStaticRoutes([{path:'tools/private-uat-worksheet/index.html',html:page(ok)}]).violations,[],ok);
 }
});

test('rejects invalid private X-Robots-Tag, nosniff and DENY security header values',()=>{
 const variants=[
  ['X-Robots-Tag','noindex-not-a-directive'],
  ['X-Robots-Tag','noindex, index'],
  ['X-Robots-Tag','noindex, nofollow, unexpected'],
  ['X-Content-Type-Options','nosniff-but-invalid'],
  ['X-Frame-Options','DENY-unknown']
 ];
 for(const [name,value] of variants){
  const modified=headers.replace(new RegExp('('+name+': )[^\\n]+'),'$1'+value);
  const violations=auditDeploymentConstraints({policy,headers:modified,robots}).violations;
  assert.ok(violations.some(v=>v.includes(name)),name+': '+value+'; '+violations.join(' | '));
 }
 assert.deepEqual(auditDeploymentConstraints({policy,headers,robots}).violations,[]);
});

test('rejects entity-encoded third-party resource URLs before any private preview build',()=>{
 const cases=[
  ['<script src="&#x68;ttps://tracker.example/collect.js"></script>','externally hosted script'],
  ['<form action="&#x68;ttps://tracker.example/submit"></form>','external form action'],
  ['<button formaction="&#x6a;avascript:alert(1)">Go</button>','external form submission override'],
  ['<img src="https&colon;//tracker.example/pixel.gif">','external embedded resource'],
  ['<img srcset="/images/local.png 1x, &sol;&sol;tracker.example/pixel.png 2x">','external embedded resource'],
  ['<iframe src="&sol;&sol;tracker.example/frame"></iframe>','external embedded resource'],
  ['<link rel="dns-prefetch" href="&sol;&sol;tracker.example">','external linked resource'],
  ['<link rel="preconnect" href="&#x2f;&#x2f;tracker.example">','external linked resource']
 ];
 for(const [injection,reason] of cases){
  const page=goodPage.replace('</body>',injection+'</body>');
  const r=auditStaticRoutes([{path:'index.html',html:page}]);
  assert.ok(r.violations.some(v=>v.includes(reason)),injection+': '+r.violations.join(' | '));
 }
});

test('allows encoded local resource paths and official links without treating inert data attributes as fetches',()=>{
 const page=goodPage.replace('</body>',[
  '<script src="&#x2f;_astro/app.js"></script>',
  '<img src="&sol;images/logo.svg" alt="">',
  '<a href="https://www.hubspot.com/">Official</a>',
  '<img data-src="&#x68;ttps://tracker.example/inert.gif" alt="">',
  '<link rel="stylesheet" href="/_astro/main.css">'
 ].join('')+'</body>');
 assert.deepEqual(auditStaticRoutes([{path:'index.html',html:page}]).violations,[]);
});

test('blocks HTML-entity and CSS-escaped external URLs in inline styles',()=>{
 const cases=[
  ['<div style="background:url(https&colon;//tracker.example/pixel.png)"></div>','HTML entity in style attribute'],
  ['<style>.hero{background:url(h\\74 tps://tracker.example/pixel.png)}</style>','hex-escaped CSS scheme'],
  ['<style>@import url(\\68 ttps://fonts.example/theme.css);</style>','escaped CSS import scheme'],
  ['<style>.hero{background:url(\\2f\\2f tracker.example/pixel.png)}</style>','escaped protocol-relative URL']
 ];
 for(const [injection,label] of cases){
  const violations=auditStaticRoutes([{path:'index.html',html:goodPage.replace('</body>',injection+'</body>')}]).violations;
  assert.ok(violations.some(v=>v.includes('external CSS resource')),label+': '+violations.join(' | '));
 }
});

test('allows encoded first-party CSS paths and ordinary local CSS escapes',()=>{
 const safe=goodPage.replace('</body>',[
  '<div style="background:url(&sol;images/local.png)"></div>',
  '<style>.hero{background:url(\\2f images/local.png)}</style>'
 ].join('')+'</body>');
 assert.deepEqual(auditStaticRoutes([{path:'index.html',html:safe}]).violations,[]);
});
