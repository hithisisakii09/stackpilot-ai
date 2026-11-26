import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyApprovalMigration} from '../src/platform/persistence/migrate.mjs';
import {buildApprovalMigrationSql} from '../src/platform/persistence/approval-schema.mjs';

test('approval migration binds canonical bytes while retaining released migration checksums',()=>{
 const files=[['0001_platform_foundation.sql','5ceb6615e0f98bf6ede5104e64623500749e185f96a7cd06b150cae821dfd93d'],['0002_local_identity_approvals.sql','b5b97a95509fbbc855612dfe23bf2a930710799966cd98ba2b63ad40eb6d0aa5']];
 for(const [file,expected] of files) {
  const bytes=readFileSync(new URL('../src/platform/persistence/migrations/'+file,import.meta.url));
  assert.equal(createHash('sha256').update(bytes.toString().replace(/\r\n/g,'\n')).digest('hex'),expected);
 }
 const bytes=readFileSync(new URL('../src/platform/persistence/migrations/0003_independent_approvals.sql',import.meta.url));
 const manifest=JSON.parse(readFileSync(new URL('../src/platform/persistence/migrations/approval-manifest.json',import.meta.url),'utf8'));
 assert.equal(verifyApprovalMigration(bytes,manifest),true);
 assert.equal(bytes.toString().replace(/\r\n/g,'\n'),buildApprovalMigrationSql());
 const changed=Buffer.from(bytes.toString().replace('SELECT ON','SELECT, UPDATE ON'));
 assert.throws(()=>verifyApprovalMigration(changed,{...manifest,sha256:createHash('sha256').update(changed).digest('hex')}),/migration/i);
 assert.throws(()=>verifyApprovalMigration(bytes,{...manifest,version:4}),/migration/i);
});
