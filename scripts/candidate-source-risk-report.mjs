/**
 * Read-only report of unapproved vendor documentation intake age and revocation.
 * Does not crawl sources, approve content, change the site or contact vendors.
 */
import {readFileSync} from 'node:fs';
import {buildCandidateSourceRiskReport} from '../src/lib/candidate-source-risk.mjs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const report=buildCandidateSourceRiskReport({
 products:read('../src/data/products.json'),
 claims:read('../src/data/research-claims.json'),
 revocations:read('../src/data/research-source-revocations.json')
});
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else{
 console.log('Vendor documentation candidates — UNVERIFIED; never publication approval');
 console.log('Total:',report.totalSources,'| Unreviewed:',report.unreviewedSources,'| Stale:',report.staleSources,'| Revoked:',report.revokedSources);
 for(const row of report.entries)console.log(row.sourceId+' | '+row.risk+' | '+row.daysSinceRecorded+' days old');
}
