import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {applyMigrations,verifyControlMigration} from '../src/platform/persistence/migrate.mjs';
import {buildControlMigrationSql} from '../src/platform/persistence/control-schema.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url));

test('control migration pins canonical SQL and preserves foundation migration bytes',()=>{
 const original=read('../src/platform/persistence/migrations/0001_platform_foundation.sql');
 assert.equal(createHash('sha256').update(original.toString().replace(/\r\n/g,'\n')).digest('hex'),'5ceb6615e0f98bf6ede5104e64623500749e185f96a7cd06b150cae821dfd93d');
 const bytes=read('../src/platform/persistence/migrations/0002_local_identity_approvals.sql');
 const manifest=JSON.parse(read('../src/platform/persistence/migrations/control-manifest.json'));
 assert.equal(verifyControlMigration(bytes,manifest),true);
 assert.equal(bytes.toString().replace(/\r\n/g,'\n'),buildControlMigrationSql());
 assert.equal(verifyControlMigration(Buffer.from(bytes.toString().replace(/\r?\n/g,'\r\n')),manifest),true);
 for(const changed of [Buffer.concat([bytes,Buffer.from('-- changed')]),Buffer.from(bytes.toString().replace('NOLOGIN','LOGIN'))]) assert.throws(()=>verifyControlMigration(changed,manifest),/migration/i);
 assert.throws(()=>verifyControlMigration(bytes,{...manifest,version:1}),/migration/i);
 assert.throws(()=>verifyControlMigration(bytes,{...manifest,sha256:'0'.repeat(64)}),/migration/i);
});

test('migration targets and options fail before any database connection when malformed',async()=>{
 let calls=0;
 const pool={connect:async()=>{calls++;throw new Error('Database must not be contacted');}};
 for(const options of [null,[],{targetVersion:0},{targetVersion:9},{targetVersion:'2'},{targetVersion:null},{targetVersion:undefined},{targetVersion:NaN},{targetVersion:2,force:true},Object.defineProperty({},'targetVersion',{get(){throw new Error('No getter');},enumerable:true})]) {
  await assert.rejects(applyMigrations(pool,options));
 }
 assert.equal(calls,0);
});

test('migration CLI requires explicit owned configuration and accepts no ambiguous target arguments',()=>{
 const script=fileURLToPath(new URL('../scripts/platform-db-migrate.mjs',import.meta.url));
 for(const args of [['--apply','--target-version','2'],['--apply','--target-version','3'],['--apply','--target-version','02'],['--target-version','2'],['--apply','--target-version','2','--force']]) {
  const result=spawnSync(process.execPath,[script,...args],{encoding:'utf8',env:{...process.env,STACKPILOT_LOCAL_DATABASE:''}});
  assert.equal(result.status,1);
  assert.equal(result.stdout,'');
  assert.match(result.stderr,/Migration failed/);
 }
});
