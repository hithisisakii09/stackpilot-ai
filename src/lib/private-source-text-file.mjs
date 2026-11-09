/**
 * Read an explicitly selected, private, LOCAL UTF-8 text copy.
 *
 * No network, file creation, approval, or vendor provenance is established.
 * Refuse repository files (including dist), symlink paths and non-text input.
 * This is a safety check, not a hostile operating-system process sandbox.
 */
import {
 constants,closeSync,fstatSync,lstatSync,openSync,readFileSync,realpathSync
} from 'node:fs';
import {isAbsolute,join,parse,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
const MAX_BYTES=262144;
const errorMessage='Unsafe or invalid private source text file';
const withinRepo=path=>{
 const r=relative(root,path);
 return r===''||(r!=='..'&&!r.startsWith('..'+sep)&&!isAbsolute(r));
};

export function readPrivateSourceTextFile(path){
 if(typeof path!=='string'||path.length<2||path.length>4096||
    !isAbsolute(path)||/[\x00-\x1f\x7f]/.test(path))
  throw new Error(errorMessage);
 let fd;
 try{
  const absolute=resolve(path);
  if(withinRepo(absolute))throw new Error(errorMessage);
  // A symbolic ancestor could redirect a private filename into the repo.
  let current=parse(absolute).root;
  for(const component of absolute.slice(current.length).split(sep).filter(Boolean)){
   current=join(current,component);
   if(lstatSync(current).isSymbolicLink())
    throw new Error(errorMessage);
  }
  const actual=realpathSync(absolute);
  if(withinRepo(actual))throw new Error(errorMessage);
  fd=openSync(absolute,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  const stat=fstatSync(fd);
  if(!stat.isFile()||stat.size<40||stat.size>MAX_BYTES)
   throw new Error(errorMessage);
  const bytes=readFileSync(fd);
  if(bytes.length<40||bytes.length>MAX_BYTES)
   throw new Error(errorMessage);
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(!text.trim()||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text))
   throw new Error(errorMessage);
  return text;
 }catch{
  // Never reveal the full local path or private input bytes in log output.
  throw new Error(errorMessage);
 }finally{
  if(fd!==undefined)closeSync(fd);
 }
}
