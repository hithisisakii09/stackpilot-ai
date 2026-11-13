// External owner trust configuration only; this module grants no session or action authority.
import {createHash, createPublicKey} from 'node:crypto';
import {fields, id, choice, dataArray} from '../contracts/validation.mjs';
import {readPrivateSourceTextFile} from '../../lib/private-source-text-file.mjs';

const errorMessage='Invalid owner trust configuration';
const deny=()=>{throw new Error(errorMessage);};

export function parseUnambiguousJson(content) {
 const value=JSON.parse(content); // Validate full JSON grammar before scanning property names.
 const tokens=content.match(/"(?:\\[\s\S]|[^"\\])*"|[{}\[\]:]/g)??[];
 const scopes=[];
 for(let i=0;i<tokens.length;i++) {
  const token=tokens[i];
  if(token==='{') scopes.push(new Set());
  else if(token==='[') scopes.push(null);
  else if(token==='}'||token===']') scopes.pop();
  else if(token.startsWith('"')&&tokens[i+1]===':') {
   const name=JSON.parse(token), scope=scopes.at(-1);
   if(!scope||scope.has(name)) deny();
   scope.add(name);
  }
 }
 return value;
}

export function parseTrustConfiguration(value) {
 try {
  fields(value,['schemaVersion','principals']);
  if(value.schemaVersion!==1) deny();
  const entries=dataArray(value.principals,16);
  if(entries.length===0) deny();
  const keyIds=new Set(), keyFingerprints=new Set(), userRoles=new Map(), owners=new Map();
  const organizations=new Set();
  const principals=entries.map(entry=>{
   fields(entry,['keyId','userId','organizationId','role','publicKeySpkiBase64']);
   const keyId=id(entry.keyId), userId=id(entry.userId), organizationId=id(entry.organizationId);
   const role=choice(entry.role,['owner','reviewer']);
   const encoded=entry.publicKeySpkiBase64;
   // Ed25519 SPKI is exactly 44 DER bytes, encoded canonically in 60 base64 characters.
   if(typeof encoded!=='string'||encoded.length!==60||!/^[A-Za-z0-9+/]{59}=$/.test(encoded)) deny();
   const bytes=Buffer.from(encoded,'base64');
   if(bytes.length!==44||bytes.toString('base64')!==encoded) deny();
   const publicKey=createPublicKey({key:bytes,format:'der',type:'spki'});
   if(publicKey.asymmetricKeyType!=='ed25519'||!publicKey.export({format:'der',type:'spki'}).equals(bytes)) deny();
   const keyFingerprint=createHash('sha256').update(bytes).digest('hex');
   if(keyIds.has(keyId)||keyFingerprints.has(keyFingerprint)) deny();
   const userScope=JSON.stringify([organizationId,userId]);
   if(userRoles.has(userScope)&&userRoles.get(userScope)!==role) deny();
   if(role==='owner') {
    if(owners.has(organizationId)&&owners.get(organizationId)!==userId) deny();
    owners.set(organizationId,userId);
   }
   keyIds.add(keyId); keyFingerprints.add(keyFingerprint); userRoles.set(userScope,role); organizations.add(organizationId);
   return Object.freeze({keyId,userId,organizationId,role,publicKeySpkiBase64:encoded,keyFingerprint});
  });
  if([...organizations].some(organizationId=>!owners.has(organizationId))) deny();
  return Object.freeze({schemaVersion:1,principals:Object.freeze(principals)});
 } catch {deny();}
}

// Deliberately no cache: every read observes removal, role changes and key rotation.
// The caller must still authenticate possession, consume challenges and validate sessions.
export function loadTrustConfiguration(path) {
 try {
  const content=readPrivateSourceTextFile(path);
  if(Buffer.byteLength(content,'utf8')>16384) deny();
  return parseTrustConfiguration(parseUnambiguousJson(content));
 } catch {deny();}
}
