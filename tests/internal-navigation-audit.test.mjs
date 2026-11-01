import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditInternalNavigation} from '../src/lib/internal-navigation-audit.mjs';
const html=(links)=>'<!doctype html><html lang="en"><head></head><body>'+links.join('')+'</body></html>';
const pages=()=>[
 {path:'index.html',html:html([
  '<a href="/compare/">Compare</a>',
  '<a href="/guides/hosting/">Hosting</a>',
  '<a href="/tools/seat-audit/?mode=private#how">Seat audit</a>',
  '<a href="#tools">Tools</a>',
  '<a href="/#tools">Home tools</a>',
  '<a href="https://www.vendor.example/pricing">Official vendor</a>',
  '<a href="mailto:contact@example.com">Email</a>',
  '<a data-href="/does-not-exist/">Data only</a>'
 ])},
 {path:'compare/index.html',html:html(['<a href="../">Home</a>','<a href="../guides/hosting/">Guide</a>'])},
 {path:'guides/hosting/index.html',html:html(['<a href="../../tools/seat-audit/">Tool</a>','<a href="/assets/template.csv">CSV</a>'])},
 {path:'tools/seat-audit/index.html',html:html(['<a href="/">Home</a>','<a href="/guides/hosting">Route without trailing slash</a>'])}
];
const files=()=>[...pages().map(x=>x.path),'assets/template.csv','_headers','robots.txt'];
test('audits emitted HTML pages and assets with paths, query and relative navigation',()=>{
 const result=auditInternalNavigation(pages(),files());
 assert.deepEqual(result.violations,[]);
 assert.equal(result.checkedLinks,11);
});
test('reports local navigation to deleted route and absent static attachment',()=>{
 const source=pages();
 source[0].html=html([
  '<a href="/unknown/">Missing route</a>',
  '<a href=../../secrets.txt>Missing file</a>',
  '<a href="/assets/missing.csv">Missing CSV</a>'
 ]);
 const r=auditInternalNavigation(source,files());
 assert.equal(r.checkedLinks,12);
 assert.ok(r.violations.some(s=>s.includes('index.html')&&s.includes('/unknown/')));
 assert.ok(r.violations.some(s=>s.includes('/assets/missing.csv')));
});
test('recognizes single-quoted and unquoted href while excluding inert data-href',()=>{
 const source=[{path:'index.html',html:html([
  "<a href='/compare/'>OK</a>",
  '<a href=/compare/>OK</a>',
  '<a data-href="/nope/">Inert</a>',
  "<a href='/definitely-broken/'>Broken</a>"
 ])},{path:'compare/index.html',html:html([])}];
 const r=auditInternalNavigation(source,['index.html','compare/index.html']);
 assert.equal(r.checkedLinks,3);
 assert.equal(r.violations.length,1);
 assert.match(r.violations[0],/definitely-broken/);
});
test('handles anchor-only and HTTPS without false missing-route claims',()=>{
 const source=[{path:'index.html',html:html([
  '<a href="#advisor">Jump</a>',
  '<a href="https://www.vendor.example/">Source</a>',
  '<a href="https://www.vendor.example/?a=1&amp;b=2">Source with query</a>',
  '<a href="mailto:contact@example.com">Email</a>'
 ])}];
 assert.deepEqual(auditInternalNavigation(source,['index.html']).violations,[]);
});
test('rejects suspicious or unsupported destinations instead of treating them as local paths',()=>{
 const source=[{path:'index.html',html:html([
  '<a href="javascript:alert(1)">Bad</a>',
  '<a href="//evil.example/steal">Bad</a>',
  '<a href="http://evil.example/">Unencrypted</a>',
  '<a href="data:text/html,foo">Executable</a>',
  '<a href="">Empty</a>',
  '<a href="/%ZZ/">Bad encoding</a>'
 ])}];
 const r=auditInternalNavigation(source,['index.html']);
 assert.equal(r.checkedLinks,6);
 assert.equal(r.violations.length,6);
});
test('fail closed for incomplete and hostile build file inventory and missing page contents',()=>{
 for(const input of [
  {pages:[],files:['index.html']},
  {pages:[{path:'index.html',html:'<a href="/">Home</a>'}],files:[]},
  {pages:[{path:'index.html',html:'<a href="/">Home</a>'}],files:['index.html','index.html']},
  {pages:[{path:'index.html',html:'<a href="/">Home</a>'}],files:['index.html','../.env']},
  {pages:[{path:'index.html',html:'<a href="/">Home</a>'}],files:['compare/index.html']}
 ]){
  assert.ok(auditInternalNavigation(input.pages,input.files).violations.length>0);
 }
});
test('does not mutate source page or file inventories',()=>{
 const p=pages(),f=files(),before=structuredClone({p,f});
 auditInternalNavigation(p,f);
 assert.deepEqual({p,f},before);
});
test('repository release preflight must invoke navigation check against ALL emitted dist files',()=>{
 const cli=readFileSync('scripts/release-preflight.mjs','utf8');
 assert.match(cli,/auditInternalNavigation/);
 assert.match(cli,/checkedLinks/);
 assert.match(cli,/allFiles/);
 assert.match(cli,/navigation\.violations/);
});
