import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('owned PostgreSQL shutdown allows its bounded checkpoint window',()=>{
  const source=readFileSync(new URL('../scripts/platform-db-test.mjs',import.meta.url),'utf8');
  assert.match(source,/run\('pg_ctl',\['-D',dataDirectory,'-m','fast','-w','stop'\],300000\)/);
});
