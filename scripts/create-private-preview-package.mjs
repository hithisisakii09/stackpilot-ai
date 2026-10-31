/**
 * Only packages a locally-built, private preview candidate. Does NOT deploy.
 * The package is stored inside private GitHub Actions with short retention.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, lstatSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { buildPrivatePreviewManifest } from '../src/lib/preview-package.mjs';

const root = join(process.cwd(), 'dist');
assert.ok(existsSync(root), 'Build dist first; do not deploy without validation');
const sha = process.env.PREVIEW_SOURCE_COMMIT || '';
const policy = JSON.parse(readFileSync('config/operating-policy.json', 'utf8'));
const products = JSON.parse(readFileSync('src/data/products.json', 'utf8'));
assert.ok(products.length === 6 && products.every(p => p.affiliateUrl === null && p.verified === false),
  'Unapproved affiliate URLs or editorial claims found');
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
      assert.match(content.toString('utf8'), /<meta[^>]*name=["']robots["'][^>]*noindex/i,
        `Missing page noindex: ${path}`);
    }
    entries.push({path,bytes:content.byteLength,
      sha256:createHash('sha256').update(content).digest('hex')});
  }
}
walk(root);
const headers = readFileSync(join(root, '_headers'), 'utf8');
assert.match(headers, /X-Robots-Tag:\s*noindex,\s*nofollow,\s*noarchive/i);
assert.match(headers, /X-Content-Type-Options:\s*nosniff/i);
assert.match(readFileSync(join(root,'robots.txt'),'utf8'), /Disallow:\s*\//);
const htmlCount = entries.filter(f => f.path.endsWith('.html')).length;
assert.equal(htmlCount, 13, 'Require exactly 13 static pages for current catalog');
const manifest=buildPrivatePreviewManifest(entries,policy,sha);
mkdirSync('artifacts/private-preview',{recursive:true});
writeFileSync('artifacts/private-preview/manifest.json', JSON.stringify(manifest,null,2)+'\n');
console.log(`Private preview package validated: ${htmlCount} pages; ${manifest.fileCount} files; ${manifest.totalBytes} bytes; no publication or spending`);
