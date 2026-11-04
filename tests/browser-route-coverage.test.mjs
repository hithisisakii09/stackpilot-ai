import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {routePathsFromBuiltHtml,assertExactBrowserRouteCoverage} from '../src/lib/browser-route-coverage.mjs';

const files=['index.html','tools/crm-seat-audit/index.html','software/ahrefs/index.html',
 '404.html','assets/app.001.css','robots.txt','_headers'];
const expected=['/','/404.html','/software/ahrefs/','/tools/crm-seat-audit/'];

test('enumerates every emitted HTML page as a deterministic, sorted private preview path',()=>{
 const original=[...files];
 assert.deepEqual(routePathsFromBuiltHtml(files),expected);
 assert.deepEqual(routePathsFromBuiltHtml([...files].reverse()),expected);
 assert.deepEqual(files,original,'Build inventory must not mutate');
});
test('newly emitted pages are automatically included, not maintained in a manually curated test list',()=>{
 const plus=routePathsFromBuiltHtml([...files,'guides/new-guide/index.html']);
 assert.deepEqual(plus,['/','/404.html','/guides/new-guide/','/software/ahrefs/','/tools/crm-seat-audit/']);
 assert.equal(plus.length,expected.length+1);
});
test('only HTML pages are tested, but the entire build asset inventory is validated',()=>{
 assert.deepEqual(routePathsFromBuiltHtml(['index.html','scripts/app.js','font.woff2','_headers']),['/']);
 for(const invalid of [
  [],['app.js'],['index.html','index.html'],
  ['index.html','../secrets/index.html'],
  ['index.html','/root/index.html'],
  ['index.html','a//index.html'],
  ['index.html','a/./index.html'],
  ['index.html','a/../index.html'],
  ['index.html','a\\nested\\index.html'],
  ['index.html','a%2findex.html'],
  ['index.html','not allowed/index.html'],
  ['index.html',null]
 ]) assert.throws(()=>routePathsFromBuiltHtml(invalid),/invalid|missing|duplicate|inventory|route|file/i);
});
test('exact browser coverage requires every known route once, not merely representative tests',()=>{
 assert.equal(assertExactBrowserRouteCoverage(expected,[...expected].reverse()),expected.length);
 for(const visited of [
  [],['/'],expected.slice(0,-1),[...expected,expected[0]],
  [...expected,'/hidden/'],['/','/404.html','/software/ahrefs/','/wrong/']
 ]) assert.throws(()=>assertExactBrowserRouteCoverage(expected,visited),/missing|unexpected|duplicate|coverage|route/i);
 assert.throws(()=>assertExactBrowserRouteCoverage([],[]),/missing|route|coverage|empty/i);
});
test('browser QA must enumerate all emitted pages, run desktop/mobile axe, and enforce audit coverage',()=>{
 const script=readFileSync('scripts/browser-acceptance.mjs','utf8');
 assert.match(script,/routePathsFromBuiltHtml/);
 assert.match(script,/assertExactBrowserRouteCoverage/);
 assert.match(script,/readdirSync|readdir\(/);
 assert.match(script,/checkAccessibility\(page,\s*['\x60]/);
 assert.match(script,/390/);
 assert.match(script,/1440/);
 assert.match(script,/scrollWidth/);
});
