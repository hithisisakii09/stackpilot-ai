import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const cssPath = new URL('../public/styles/executive-theme.css', import.meta.url);

test('public/styles/executive-theme.css exists, is CSP-clean, and enforces prefers-reduced-motion', () => {
  assert.equal(existsSync(cssPath), true);
  const css = readFileSync(cssPath, 'utf8');

  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@keyframes\s+fadeUp\b/);
  assert.match(css, /@keyframes\s+mastheadShimmer\b/);
  assert.match(css, /#0f172a/i);
  assert.match(css, /#047857/i);

  assert.doesNotMatch(css, /@import/i);
  assert.doesNotMatch(css, /https?:\/\//i);
  assert.doesNotMatch(css, /url\(\s*['"]?\s*(?:https?:)?\/\//i);
});

test('all built HTML routes link executive-theme.css without legacy dark-mode overrides', () => {
  const distDir = new URL('../dist/', import.meta.url);
  if (!existsSync(distDir)) return;

  const htmlFiles = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) htmlFiles.push(full);
    }
  }
  walk(distDir.pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  assert.equal(htmlFiles.length, 28);

  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    assert.match(html, /href="\/styles\/executive-theme\.css"/, `Missing executive-theme.css link in ${file}`);
    assert.doesNotMatch(html, /#0b1220|#9ab0cf|#edc777/i, `Legacy dark-mode color remained in ${file}`);
  }
});
