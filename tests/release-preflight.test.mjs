import test from 'node:test';
import assert from 'node:assert/strict';
import { auditStaticRoutes, auditDeploymentConstraints } from '../src/lib/release-preflight.mjs';

const goodPage = '<!doctype html><html lang="en"><head><meta name="robots" content="noindex, nofollow"><title>StackPilot AI</title></head><body><h1>Comparison</h1></body></html>';
const policy = {policyVersion:1,monthlyBudgetINR:0,delegatedSpendINR:0,hostingCandidate:'netlify-free',commercialHostingApproved:false,productionLaunchApproved:false,affiliateActivationApproved:false,paidServicesApproved:false};
const headers = '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n';
const robots = 'User-agent: *\nDisallow: /\n';

test('audits all generated static routes rather than a fixed hand-written shortlist', () => {
  const result=auditStaticRoutes([
    {path:'index.html',html:goodPage},
    {path:'unplanned/new-tool/index.html',html:goodPage},
    {path:'software/kinsta/index.html',html:goodPage}
  ]);
  assert.equal(result.checkedRoutes,3);
  assert.deepEqual(result.violations,[]);
});

test('fails closed if any new page lacks prelaunch noindex, title or English language marker', () => {
  const missingIndex=goodPage.replace('noindex, nofollow','index, follow');
  const bad=auditStaticRoutes([{path:'index.html',html:goodPage},{path:'new-path/index.html',html:missingIndex}]);
  assert.ok(bad.violations.some(v=>v.includes('new-path/index.html')&&v.includes('noindex')));
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

test('validates zero budget, disabled release and affiliate gates, wildcard headers and robots', () => {
  assert.deepEqual(auditDeploymentConstraints({policy,headers,robots}).violations,[]);
  for (const [key,value] of Object.entries({monthlyBudgetINR:1,delegatedSpendINR:1,productionLaunchApproved:true,affiliateActivationApproved:true,paidServicesApproved:true,commercialHostingApproved:true})) {
    const result=auditDeploymentConstraints({policy:{...policy,[key]:value},headers,robots});
    assert.ok(result.violations.some(v=>v.includes(key)),key);
  }
  assert.ok(auditDeploymentConstraints({policy,headers:headers.replace('noindex','index'),robots}).violations.some(v=>v.includes('X-Robots-Tag')));
  assert.ok(auditDeploymentConstraints({policy,headers,robots:'User-agent: *\nAllow: /\n'}).violations.some(v=>v.includes('Disallow')));
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


const secureCsp = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; worker-src 'none'; media-src 'self'; manifest-src 'self'; upgrade-insecure-requests";
const withCsp = headers + '  Content-Security-Policy: '+secureCsp+'\n';

test('requires a restrictive wildcard Content Security Policy before prelaunch', () => {
  assert.deepEqual(auditDeploymentConstraints({policy,headers:withCsp,robots}).violations,[]);
  assert.ok(auditDeploymentConstraints({policy,headers,robots}).violations.some(v=>v.includes('Content-Security-Policy')));
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
    withCsp+'  Content-Security-Policy: default-src *\n',
    withCsp.replace("object-src 'none'; ",""),
    withCsp.replace("; upgrade-insecure-requests",""),
    withCsp.replace("; upgrade-insecure-requests","; report-uri https://tracking.example")
  ];
  for(const compromised of wrong){
    const violations=auditDeploymentConstraints({policy,headers:compromised,robots}).violations;
    assert.ok(violations.some(v=>v.includes('Content-Security-Policy')),violations.join(' | '));
  }
});
