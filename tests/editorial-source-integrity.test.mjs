import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as runtime from '../scripts/editorial-runtime-source.mjs';

const source=readFileSync(new URL('../src/pages/compare/[slug].csv.js',import.meta.url));
const lf=Buffer.from(source.toString('utf8').replace(/\r\n/g,'\n'));

test('reviewed CSV source permits LF and CRLF checkouts with the same pinned content',()=>{
 assert.equal(runtime.isReviewedStaticCsvSource(lf),true);
 assert.equal(runtime.isReviewedStaticCsvSource(Buffer.from(lf.toString().replace(/\n/g,'\r\n'))),true);
});

test('CSV source integrity rejects code, whitespace, BOM and noncanonical byte changes',()=>{
 const changed=Buffer.from(lf);
 changed[0]^=1;
 const cases=[
  changed,
  Buffer.concat([lf,Buffer.from('\n')]),
  Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),lf]),
  Buffer.from(lf.toString().replace(/\n/,'\r')),
  Buffer.concat([lf,Buffer.from([0xff])]),
  Buffer.from(lf.toString().replace(/\n/,'\r\r\n')),
  Buffer.from('export const prerender = false;\n'),
  Buffer.alloc(0),null,lf.toString()
 ];
 for(const bytes of cases)assert.equal(runtime.isReviewedStaticCsvSource(bytes),false);
});
