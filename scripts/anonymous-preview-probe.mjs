/**
 * Private, read-only Netlify anonymous status sample.
 * No auth data, body content, headers, redirects, user tracking or release approval.
 * Triggered only by the existing bounded PR operations pipeline.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {probeAnonymousPreview} from '../src/lib/anonymous-preview-probe.mjs';
const report=await probeAnonymousPreview({requestedCommit:process.env.PREVIEW_SOURCE_COMMIT});
mkdirSync('artifacts/ops',{recursive:true});
writeFileSync('artifacts/ops/anonymous-preview-probe.json',JSON.stringify(report,null,2)+'\n');
