import {createPrivateKey,X509Certificate} from 'node:crypto';
import {fields} from '../platform/contracts/validation.mjs';
import {readPrivateSourceTextFile} from '../lib/private-source-text-file.mjs';
import {loadTrustConfiguration} from '../platform/identity/trust.mjs';

export function loadControlConfiguration(value) {
  fields(value,['origin','trustPath','tlsKeyPath','tlsCertPath','database']);
  if(typeof value.origin!=='string'||!/^https:\/\/127\.0\.0\.1:[1-9][0-9]{3,4}$/.test(value.origin)) throw new Error();
  const url=new URL(value.origin);
  const port=Number(url.port);
  if(port<1024||port>65535||url.origin!==value.origin) throw new Error();
  const key=readPrivateSourceTextFile(value.tlsKeyPath);
  const cert=readPrivateSourceTextFile(value.tlsCertPath);
  const leaf=new X509Certificate(cert);
  if(leaf.ca||!leaf.checkIP('127.0.0.1')||!leaf.checkPrivateKey(createPrivateKey(key))||
     Date.parse(leaf.validFrom)>Date.now()||Date.parse(leaf.validTo)<=Date.now()||
     !leaf.keyUsage?.includes('1.3.6.1.5.5.7.3.1')) throw new Error();
  loadTrustConfiguration(value.trustPath);
  return Object.freeze({origin:value.origin,authority:url.host,port,key,cert,trustPath:value.trustPath,database:value.database});
}
