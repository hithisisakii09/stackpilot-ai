import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, createHash} from 'node:crypto';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseTrustConfiguration, loadTrustConfiguration} from '../src/platform/identity/trust.mjs';

// Synthetic public keys only. Private fixture keys remain in memory and are discarded.
const publicKey = () => generateKeyPairSync('ed25519').publicKey.export({format:'der',type:'spki'}).toString('base64');
const ownerKey = publicKey();
const reviewerKey = publicKey();
const owner = () => ({keyId:'owner-key',userId:'owner-user',organizationId:'example-org',role:'owner',publicKeySpkiBase64:ownerKey});
const reviewer = () => ({keyId:'reviewer-key',userId:'reviewer-user',organizationId:'example-org',role:'reviewer',publicKeySpkiBase64:reviewerKey});
const config = () => ({schemaVersion:1,principals:[owner(),reviewer()]});
const denied = operation => assert.throws(operation, error => error.message === 'Invalid owner trust configuration' && !error.cause);

test('owner trust parser accepts pinned Ed25519 public keys and returns immutable canonical metadata',()=>{
 const parsed = parseTrustConfiguration(config());
 assert.equal(parsed.schemaVersion,1);
 assert.equal(parsed.principals.length,2);
 assert.equal(parsed.principals[0].userId,'owner-user');
 assert.equal(parsed.principals[0].keyFingerprint,createHash('sha256').update(Buffer.from(ownerKey,'base64')).digest('hex'));
 assert.equal(parsed.principals[0].publicKeySpkiBase64,ownerKey);
 assert.ok(Object.isFrozen(parsed));
 assert.ok(Object.isFrozen(parsed.principals));
 assert.ok(parsed.principals.every(Object.isFrozen));
 assert.throws(()=>{parsed.principals[0].role='reviewer';},TypeError);
 assert.equal(Object.hasOwn(parsed,'authenticated'),false);
 assert.equal(Object.hasOwn(parsed,'session'),false);
});

test('trust rejects ambiguous, unsupported and over-bounded identity configuration',()=>{
 for (const value of [null,{}, {schemaVersion:2,principals:[owner()]}, {...config(),authenticated:true}, {schemaVersion:1,principals:[]}, {schemaVersion:1,principals:Array.from({length:17},owner)}]) denied(()=>parseTrustConfiguration(value));
 for (const patch of [{role:'admin'}, {role:'system'}, {userId:'../../owner'}, {organizationId:'Other Org'}, {keyId:''}, {publicKeySpkiBase64:''}, {privateKey:'synthetic-not-a-key'}, {enabled:true}]) {
  denied(()=>parseTrustConfiguration({schemaVersion:1,principals:[{...owner(),...patch}]}));
 }
 const sparse=[]; sparse.length=1;
 denied(()=>parseTrustConfiguration({schemaVersion:1,principals:sparse}));
});

test('trust rejects duplicate key IDs, reused public keys, conflicting roles and competing owners',()=>{
 for (const principals of [
  [owner(),{...reviewer(),keyId:'owner-key'}],
  [owner(),{...reviewer(),publicKeySpkiBase64:ownerKey}],
  [owner(),{...reviewer(),userId:'owner-user'}],
  [owner(),{...reviewer(),role:'owner'}],
  [reviewer()],
  [owner(),{...reviewer(),organizationId:'unowned-org'}]
 ]) denied(()=>parseTrustConfiguration({schemaVersion:1,principals}));
 // Multiple distinct owner keys support rotation, pinned to the same owner identity.
 assert.equal(parseTrustConfiguration({schemaVersion:1,principals:[owner(),{...reviewer(),userId:'owner-user',role:'owner'}]}).principals.length,2);
});

test('trust rejects private keys, other algorithms, malformed and noncanonical DER/base64',()=>{
 const ec=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const ed=generateKeyPairSync('ed25519');
 const invalidKeys=[
  ec.publicKey.export({format:'der',type:'spki'}).toString('base64'),
  ed.privateKey.export({format:'der',type:'pkcs8'}).toString('base64'),
  ownerKey+'\n',ownerKey.replace(/=$/,''),'not-base64',
  Buffer.concat([Buffer.from(ownerKey,'base64'),Buffer.from([0])]).toString('base64')
 ];
 for (const key of invalidKeys) denied(()=>parseTrustConfiguration({schemaVersion:1,principals:[{...owner(),publicKeySpkiBase64:key}]}));
});

test('trust never executes hostile object accessors or proxy traps',()=>{
 let calls=0;
 const accessor=Object.defineProperty({},'schemaVersion',{get(){calls++;throw new Error('untrusted');},enumerable:true});
 const proxy=new Proxy(config(),{ownKeys(){calls++;throw new Error('untrusted');}});
 const arrayProxy=new Proxy([owner()],{get(){calls++;throw new Error('untrusted');}});
 const entryProxy=new Proxy(owner(),{get(){calls++;throw new Error('untrusted');}});
 for (const value of [accessor,proxy,{schemaVersion:1,principals:arrayProxy},{schemaVersion:1,principals:[entryProxy]},Object.assign(Object.create({role:'owner'}),config())]) denied(()=>parseTrustConfiguration(value));
 assert.equal(calls,0);
});

test('external trust loader fails closed and reloads removal, role change and key rotation without caching',()=>{
 const root=mkdtempSync(join(tmpdir(),'stackpilot-trust-test-'));
 const path=join(root,'trust.json');
 try {
  denied(()=>loadTrustConfiguration(path));
  writeFileSync(path,JSON.stringify(config()));
  const original=loadTrustConfiguration(path);
  writeFileSync(path,JSON.stringify({schemaVersion:1,principals:[owner()]}));
  assert.equal(loadTrustConfiguration(path).principals.length,1);
  writeFileSync(path,JSON.stringify({schemaVersion:1,principals:[{...owner(),publicKeySpkiBase64:reviewerKey}]}));
  assert.notEqual(loadTrustConfiguration(path).principals[0].keyFingerprint,original.principals[0].keyFingerprint);
  writeFileSync(path,JSON.stringify({schemaVersion:1,principals:[{...owner(),role:'reviewer'},{...reviewer(),role:'owner'}]}));
  assert.equal(loadTrustConfiguration(path).principals[0].role,'reviewer');
  for (const content of ['{',' '.repeat(40),JSON.stringify({...config(),session:'synthetic-private-marker'}),'x'.repeat(16385)]) {
   writeFileSync(path,content); denied(()=>loadTrustConfiguration(path));
  }
  rmSync(path); denied(()=>loadTrustConfiguration(path));
 } finally {rmSync(root,{recursive:true,force:true});}
});

test('external trust loader rejects repository files and unselected paths with sanitized errors',()=>{
 const repositoryFile=fileURLToPath(new URL('../package.json',import.meta.url));
 for (const path of [repositoryFile,'relative-trust.json','',null,undefined]) denied(()=>loadTrustConfiguration(path));
});

test('external trust file rejects duplicate JSON fields including escaped spellings',()=>{
 const root=mkdtempSync(join(tmpdir(),'stackpilot-trust-test-'));
 const path=join(root,'trust.json');
 try {
  for (const raw of [
   JSON.stringify({schemaVersion:1,principals:[owner()]}).replace('"schemaVersion":1','"schemaVersion":2,"schemaVersion":1'),
   JSON.stringify({schemaVersion:1,principals:[owner()]}).replace('"role":"owner"','"role":"reviewer","role":"owner"'),
   JSON.stringify({schemaVersion:1,principals:[owner()]}).replace('"role":"owner"','"role":"reviewer","\\u0072ole":"owner"')
  ]) {writeFileSync(path,raw);denied(()=>loadTrustConfiguration(path));}
 } finally {rmSync(root,{recursive:true,force:true});}
});
