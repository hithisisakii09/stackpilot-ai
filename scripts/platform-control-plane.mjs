import {pathToFileURL} from 'node:url';
import {startLocalControlPlane} from '../src/control-plane/server.mjs';

export async function main(args,env) {
  if(args.length!==1||args[0]!=='--start') throw new Error('Local HTTPS startup failed');
  const app=await startLocalControlPlane(JSON.parse(env.STACKPILOT_CONTROL_CONFIG??'null'));
  const stop=()=>{void app.close().catch(()=>{process.exitCode=1;});};
  process.once('SIGINT',stop);
  process.once('SIGTERM',stop);
  return app;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {await main(process.argv.slice(2),process.env);console.log('Local HTTPS control plane started');}
  catch {console.error('Local HTTPS startup failed');process.exitCode=1;}
}
