/**
 * Only packages a locally-built, private preview candidate. Does NOT deploy.
 * The package is stored inside private GitHub Actions with short retention.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, lstatSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { buildPrivatePreviewManifest } from '../src/lib/preview-package.mjs';
import { buildPublisherReadiness } from '../src/lib/publisher-readiness.mjs';
import { buildPrivatePreviewUatPacket,formatPrivatePreviewUatPacketMarkdown,formatPrivatePreviewUatWorksheetCsv } from '../src/lib/preview-uat-packet.mjs';
import { SITE_ORIGIN } from '../src/lib/site-origin.mjs';

const root = join(process.cwd(), 'dist');
assert.ok(existsSync(root), 'Build dist first; do not deploy without validation');
const sha = process.env.PREVIEW_SOURCE_COMMIT || '';
const policy = JSON.parse(readFileSync('config/operating-policy.json', 'utf8'));
const products = JSON.parse(readFileSync('src/data/products.json', 'utf8'));
assert.ok(products.length === 6 && products.every(p => p.affiliateUrl === null && p.verified === false),
  'Unapproved affiliate URLs or editorial claims found');
const privateRoutes = new Set([
  'tools/private-uat-worksheet/index.html',
  'preview-build/index.html',
  'research/index.html'
]);
const entries = [];
function walk(dir) {
  for (const item of readdirSync(dir, { withFileTypes:true })) {
    const full = join(dir,item.name);
    const stat = lstatSync(full);
    assert.ok(!stat.isSymbolicLink(), 'Do not package symlinks');
    if (stat.isDirectory()) { walk(full); continue; }
    assert.ok(stat.isFile(), 'Only package regular static files');
    const content = readFileSync(full);
    const path = relative(root, full).split('\\').join('/');
    if (path.endsWith('.html')) {
      const html = content.toString('utf8');
      if (privateRoutes.has(path) || policy.productionLaunchApproved !== true) {
        assert.match(html, /<meta[^>]*name=["']robots["'][^>]*noindex/i,
          `Missing page noindex: ${path}`);
      } else {
        assert.match(html, /<meta[^>]*name=["']robots["'][^>]*\bindex\b/i,
          `Public route missing index directive: ${path}`);
        assert.doesNotMatch(html, /<meta[^>]*name=["']robots["'][^>]*noindex/i,
          `Public route unexpectedly has noindex: ${path}`);
      }
    }
    entries.push({path,bytes:content.byteLength,
      sha256:createHash('sha256').update(content).digest('hex')});
  }
}
walk(root);
const headers = readFileSync(join(root, '_headers'), 'utf8');
assert.match(headers, /X-Robots-Tag:\s*noindex,\s*nofollow,\s*noarchive/i);
assert.match(headers, /X-Content-Type-Options:\s*nosniff/i);
const robotsTxt = readFileSync(join(root, 'robots.txt'), 'utf8');
if (policy.productionLaunchApproved === true) {
  assert.match(robotsTxt, /^Allow:\s*\/$/m);
  assert.match(robotsTxt, /^Disallow:\s*\/tools\/private-uat-worksheet\/$/m);
  assert.match(robotsTxt, /^Disallow:\s*\/preview-build\/$/m);
  assert.match(robotsTxt, /^Disallow:\s*\/research\/$/m);
  const escapedOrigin = SITE_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(robotsTxt, new RegExp(`^Sitemap:\\s*${escapedOrigin}/sitemap\\.xml$`, 'm'));
} else {
  assert.match(robotsTxt, /Disallow:\s*\//);
}
const htmlCount = entries.filter(f => f.path.endsWith('.html')).length;
assert.ok(htmlCount >= 15, 'Require baseline static pages for current catalog');
assert.ok(entries.some(f => f.path === 'guides/crm-migration-checklist/index.html'),
  'Require CRM migration guide in private preview');
const manifest=buildPrivatePreviewManifest(entries,policy,sha);
mkdirSync('artifacts/private-preview',{recursive:true});
writeFileSync('artifacts/private-preview/manifest.json', JSON.stringify(manifest,null,2)+'\n');
const affiliateCandidates=JSON.parse(readFileSync('src/data/affiliate-programs.json','utf8'));
const publisher=buildPublisherReadiness({policy,products,affiliateCandidates});
const packet=buildPrivatePreviewUatPacket({manifest,policy,publisher});
// These are route questions for a human; even a successful build never marks UAT or launch approved.
assert.equal(packet.sourceCommit,manifest.sourceCommit,'UAT packet must be bound to exact build SHA');
assert.equal(packet.remoteAuthenticatedUatPassed,false,'No hosted UAT in CI');
assert.equal(packet.releaseVerdict,'NO_GO','Private artifact must remain NO-GO');
writeFileSync('artifacts/private-preview/uat-packet.json',JSON.stringify(packet,null,2)+'\n');
writeFileSync('artifacts/private-preview/uat-packet.md',formatPrivatePreviewUatPacketMarkdown(packet));
writeFileSync('artifacts/private-preview/uat-cases.csv',formatPrivatePreviewUatWorksheetCsv(packet));
console.log(`Private preview package validated: ${htmlCount} pages; ${manifest.fileCount} files; ${manifest.totalBytes} bytes; UAT gates all UNVERIFIED; no publication or spending`);
