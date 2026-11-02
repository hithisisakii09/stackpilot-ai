import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditStaticAssetReferences} from '../src/lib/static-asset-audit.mjs';

const page=(html,path='index.html')=>({path,html});
const local=(fragment)=>'<html lang="en"><head>'+fragment+'</head><body></body></html>';

test('detects missing first-party script, stylesheet, image and preload files',()=>{
 const html=local([
  '<script src="/_astro/missing.js"></script>',
  '<link rel="stylesheet" href="/_astro/absent.css">',
  '<img src="/images/not-here.webp" alt="">',
  '<link rel="modulepreload" href="/_astro/lazy.js">'
 ].join(''));
 const r=auditStaticAssetReferences([page(html)],['index.html','_astro/real.js']);
 assert.equal(r.checkedAssets,4);
 assert.equal(r.violations.length,4);
 for(const fragment of ['missing.js','absent.css','not-here.webp','lazy.js'])
  assert.ok(r.violations.some(v=>v.includes(fragment)),fragment+': '+r.violations.join(' | '));
});

test('supports nested page relative references, query, fragment and srcset sizes',()=>{
 const html=local([
  '<script src="../../_astro/app.js?v=2"></script>',
  '<link rel="stylesheet" href="../../_astro/main.css#v1">',
  '<img src="../../images/logo.webp" srcset="../../images/logo.webp 1x, /images/logo@2x.webp 2x" alt="">',
  '<source srcset="/images/hero.webp 1x, /images/hero2.webp 2x">',
  '<a href="/some-other-route/">Not an asset</a>'
 ].join(''));
 const files=['tools/demo/index.html','_astro/app.js','_astro/main.css','images/logo.webp','images/logo@2x.webp','images/hero.webp','images/hero2.webp'];
 const r=auditStaticAssetReferences([page(html,'tools/demo/index.html')],files,[{path:'_astro/main.css',content:'.hero{background:url(/images/local.webp)}'}]);
 assert.equal(r.checkedAssets,7);
 assert.deepEqual(r.violations,[]);
});

test('refuses escaped paths, malformed encodings, external URLs and missing inventory',()=>{
 const html=local([
  '<script src="//tracking.example/a.js"></script>',
  '<img src="javascript:alert(1)">',
  '<img src="/%2e%2e/secret.png">',
  '<img src="/bad%ZZ.png">'
 ].join(''));
 const r=auditStaticAssetReferences([page(html)],['index.html']);
 assert.equal(r.checkedAssets,4);
 assert.equal(r.violations.length,4);
 assert.ok(auditStaticAssetReferences([page(local(''))],[]).violations.length>0);
});

test('ignores non-fetch link relations and inert attributes, without mutation',()=>{
 const html=local([
  '<link rel="canonical" href="https://vendor.example/docs">',
  '<a href="/not-built/">Navigation is audited separately</a>',
  '<div data-src="https://tracker.example/nope"></div>',
  '<img data-src="/_astro/missing.png" alt="">'
 ].join(''));
 const pages=[page(html)],files=['index.html'];
 const snapshot=structuredClone({pages,files});
 assert.deepEqual(auditStaticAssetReferences(pages,files),{checkedAssets:0,violations:[]});
 assert.deepEqual({pages,files},snapshot);
});

test('repository release preflight must include all emitted first-party assets',()=>{
 const cli=readFileSync(new URL('../scripts/release-preflight.mjs',import.meta.url),'utf8');
 assert.match(cli,/auditStaticAssetReferences/);
 assert.match(cli,/assets\.violations/);
 assert.match(cli,/checkedAssets/);
});

test('audits emitted first-party CSS files for external imports and escaped remote URLs',()=>{
 const files=['index.html','_astro/site.css','_astro/legacy.css'];
 const sheets=[
  {path:'_astro/site.css',content:'@import url("https://fonts.example/theme.css");'},
  {path:'_astro/legacy.css',content:'.hero{background-image:url(\\68 ttps://tracker.example/pixel.png)}'}
 ];
 const r=auditStaticAssetReferences([page(local(''))],files,sheets);
 assert.ok(r.violations.some(v=>v.includes('_astro/site.css: external CSS resource')),r.violations.join(' | '));
 assert.ok(r.violations.some(v=>v.includes('_astro/legacy.css: external CSS resource')),r.violations.join(' | '));
});

test('fails closed when stylesheet content is missing and allows local/data CSS references',()=>{
 const files=['index.html','_astro/site.css'];
 const missing=auditStaticAssetReferences([page(local(''))],files);
 assert.ok(missing.violations.some(v=>v.includes('Missing emitted stylesheet contents: _astro/site.css')));
 const safe=auditStaticAssetReferences([page(local(''))],files,[
  {path:'_astro/site.css',content:'@import url("/fonts/local.css"); .hero{background:url(data:image/png;base64,AAAA)}'}
 ]);
 assert.deepEqual(safe.violations,[]);
});

test('release preflight reads every emitted CSS file and passes contents to the asset audit',()=>{
 const cli=readFileSync(new URL('../scripts/release-preflight.mjs',import.meta.url),'utf8');
 assert.ok(cli.includes('const stylesheets=allFiles.filter(path=>/\\.css$/i.test(path)).map(path=>({'));
 assert.ok(cli.includes('assets=auditStaticAssetReferences(pages,allFiles,stylesheets);'));
});
