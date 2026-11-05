import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,symlinkSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readPrivateSourceTextFile} from '../src/lib/private-source-text-file.mjs';

const sample='PRIVATE SYNTHETIC TEXT: source content for testing local UTF-8 copy matching, never a live vendor claim.\n';
const temp=fn=>{
 const dir=mkdtempSync(join(tmpdir(),'stackpilot-snapshot-'));
 try{return fn(dir)}finally{rmSync(dir,{recursive:true,force:true})}
};

test('read-only snapshot file input reads a real private UTF-8 file outside repository',()=>{
 temp(dir=>{
  const file=join(dir,'snapshot.txt');
  writeFileSync(file,sample,'utf8');
  assert.equal(readPrivateSourceTextFile(file),sample);
 });
});

test('private file input rejects relative paths, directories, invalid names and repo files',()=>{
 temp(dir=>{
  const file=join(dir,'snapshot.txt');
  writeFileSync(file,sample);
  const repoFile=fileURLToPath(new URL('../package.json',import.meta.url));
  for(const path of [
   'snapshot.txt','../snapshot.txt',dir,repoFile,
   fileURLToPath(new URL('../src/data/research-claims.json',import.meta.url)),
   '',null,42,dir+'\n/'+ 'snapshot.txt'
  ]){
   assert.throws(()=>readPrivateSourceTextFile(path),/private source (?:text )?file|path|snapshot/i);
  }
 });
});

test('private file input rejects symlinks, including symbolic ancestor folders',()=>{
 temp(dir=>{
  const file=join(dir,'real.txt'),link=join(dir,'symbolic.txt');
  writeFileSync(file,sample);
  symlinkSync(file,link);
  assert.throws(()=>readPrivateSourceTextFile(link),/private|symlink|snapshot/i);
  const alias=join(dir,'alias-dir');
  const child=join(dir,'actual-dir');
  const nested=join(child,'text.txt');
  mkdirSync(child);
  writeFileSync(nested,sample);
  symlinkSync(child,alias);
  assert.throws(()=>readPrivateSourceTextFile(join(alias,'text.txt')),/private|symlink|snapshot/i);
 });
});
test('private snapshot source rejects malformed or unsafe UTF-8, empty and oversized input',()=>{
 temp(dir=>{
  const cases=[
   ['empty.txt',''],
   ['short.txt','short'],
   ['nul.txt',sample+'\0'],
   ['invalid-utf8.txt',Buffer.from([0xff,0xfe,0xfd,0x41])],
   ['too-large.txt','a'.repeat(262145)]
  ];
  for(const [name,data] of cases){
   const path=join(dir,name);writeFileSync(path,data);
   assert.throws(()=>readPrivateSourceTextFile(path),/private|snapshot|text/i,name);
  }
 });
});

test('local snapshot file mode is offline, strict and never echoes private text',()=>{
 temp(dir=>{
  const file=join(dir,'document.txt');writeFileSync(file,sample);
  const cli=fileURLToPath(new URL('../scripts/offline-snapshot-consistency.mjs',import.meta.url));
  const metadata={
   capture:{captureId:'excerpt-capture-0001'},
   snapshot:{sourceUrl:'https://knowledge.hubspot.com/import-and-export/export-records',snapshotOn:'2026-11-05'}
  };
  const run=(args,value)=>spawnSync(process.execPath,[cli,...args],{
   input:JSON.stringify(value),encoding:'utf8'
  });
  // No source proposal is recorded, so even a valid local file cannot pass.
  const denied=run(['--text-file',file],metadata);
  assert.notEqual(denied.status,0);
  assert.equal(denied.stdout.includes(sample),false);
  assert.equal(denied.stderr.includes(sample),false);
  assert.equal(denied.stderr.includes(file),false);
  for(const [args,value] of [
   [['--text-file',file,'--approve'],metadata],
   [['--text-file',file],{...metadata,approved:true}],
   [['--text-file',file],{...metadata,snapshot:{...metadata.snapshot,text:sample}}],
   [['--text-file','relative.txt'],metadata],
   [['--text-file',fileURLToPath(new URL('../package.json',import.meta.url))],metadata]
  ]){
   const res=run(args,value);
   assert.notEqual(res.status,0);
   assert.equal(res.stdout.includes(sample),false);
   assert.equal(res.stderr.includes(sample),false);
  }
 });
});