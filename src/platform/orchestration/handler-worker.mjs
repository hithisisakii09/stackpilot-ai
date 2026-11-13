// Fixed synthetic handlers only. No database, filesystem, network or caller code.
import {isMainThread,parentPort,workerData} from 'node:worker_threads';
import {setTimeout as delay} from 'node:timers/promises';
import {expectedOutput} from './dag.mjs';

if(!isMainThread){
 const {work,attempt}=workerData;
 if(work.scenario==='hang'){for(;;){/* Parent terminates this isolated CPU-bound fixture. */}}
 if(work.delayMs)await delay(work.delayMs);
 if(work.scenario==='permanent')parentPort.postMessage({code:'permanent'});
 else if(work.scenario==='transient-always'||work.scenario==='transient-first'&&attempt===1)parentPort.postMessage({code:'transient'});
 else if(work.scenario==='invalid-output')parentPort.postMessage({output:{kind:'fake-completion'}});
 else parentPort.postMessage({output:expectedOutput(work)});
}
