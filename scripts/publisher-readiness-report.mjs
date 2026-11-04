/**
 * Read-only publisher readiness report for the owner and scheduled operator.
 * No account or platform actions and never stores identity, tax or bank data.
 */
import {readFileSync} from 'node:fs';
import {buildPublisherReadiness} from '../src/lib/publisher-readiness.mjs';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const report=buildPublisherReadiness({
 policy:read('config/operating-policy.json'),
 products:read('src/data/products.json'),
 affiliateCandidates:read('src/data/affiliate-programs.json')
});
if(process.argv.includes('--json')) {
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
}else{
 console.log('StackPilot AI — publisher proof and affiliate preapplication readiness');
 console.log('Status:',report.status);
 console.log('Publisher owner gates pending:',report.ownerGates.length);
 console.log('Affiliate research candidates:',report.programCandidates.length);
 console.log('Applications submitted: 0; accepted: 0; active links: 0; earnings unknown');
 for(const gate of report.ownerGates)console.log('-',gate.id+':',gate.status);
 console.log('Remote hosted-release evidence:',report.remotePreviewEvidence.status);
 for(const gate of report.remotePreviewEvidence.gates)console.log('-',gate.id+':',gate.status);
 console.log('These remote/provider checks cannot be completed from GitHub CI or static repository data.');
 console.log('No authorization, contract, KYC, payment or public launch occurs here.');
}
