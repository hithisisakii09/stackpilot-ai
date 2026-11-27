import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function findAstroFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findAstroFiles(full));
    } else if (entry.endsWith('.astro')) {
      results.push(full);
    }
  }
  return results;
}

const astroFiles = findAstroFiles('src/pages');

const themeCss = readFileSync(new URL('../public/styles/executive-theme.css', import.meta.url), 'utf8');

test('all page templates contain semantic landmarks, skip-link, and accessible viewport', () => {
  assert.equal(astroFiles.length, 22, 'Expected exactly 22 Astro page templates');

  for (const file of astroFiles) {
    const html = readFileSync(file, 'utf8');

    // Semantic landmarks
    assert.match(html, /<header[^>]*>/i, `${file} must contain a <header> landmark`);
    assert.match(html, /<main\s+id=["']main["'][^>]*>/i, `${file} must contain a <main id="main"> landmark`);
    assert.match(html, /<footer[^>]*>/i, `${file} must contain a <footer> landmark`);
    assert.match(html, /<nav\s+aria-label=[^>]*>/i, `${file} must contain a <nav aria-label="..."> landmark`);

    // Skip-to-content navigation (WCAG 2.4.1 Level A)
    assert.match(html, /<body[^>]*>\s*<a\s+href=["']#main["']\s+class=["']skip-link["']>Skip to main content<\/a>/i,
      `${file} must have skip-link as first element in <body>`);
    const styleSource = html.includes('/styles/executive-theme.css') ? `${html}\n${themeCss}` : html;
    assert.match(styleSource, /\.skip-link\s*\{[^}]*position:\s*absolute/i, `${file} must style .skip-link positioned off-screen`);
    assert.match(styleSource, /\.skip-link:focus\s*\{[^}]*outline:/i, `${file} must style .skip-link:focus with visible outline`);

    // Viewport configuration without scale locking (WCAG 1.4.4)
    assert.match(html, /<meta\s+name=["']viewport["']\s+content=["'][^"']*width=device-width[^"']*["']/i,
      `${file} must configure responsive viewport`);
    assert.doesNotMatch(html, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?(?![0-9])/i,
      `${file} must not lock user scaling`);
  }
});

test('table scrollers have role="region", tabindex="0", and accessible labels across all routes', () => {
  const tablePages = [
    'src/pages/compare/index.astro',
    'src/pages/compare/[slug].astro',
    'src/pages/guides/crm-migration-checklist/index.astro',
    'src/pages/guides/hosting-migration-checklist/index.astro',
    'src/pages/guides/saas-total-cost-of-ownership/index.astro'
  ];

  for (const page of tablePages) {
    const html = readFileSync(page, 'utf8');
    assert.match(html, /<div[^>]*role=["']region["']/i, `${page} must declare role="region" on scroll region`);
    assert.match(html, /<div[^>]*tabindex=["']0["']/i, `${page} must declare tabindex="0" on scroll region`);
    assert.match(html, /<div[^>]*aria-label=/i, `${page} must declare aria-label on scroll region`);
  }
});

test('footer disclosures maintain consistent privacy and affiliate disclosure links', () => {
  const disclosurePage = readFileSync('src/pages/disclosure/index.astro', 'utf8');
  assert.match(disclosurePage, /<footer[^>]*>[\s\S]*href=["']\/privacy\/["'][\s\S]*<\/footer>/i,
    'disclosure page footer must link to privacy notes');

  const previewBuildPage = readFileSync('src/pages/preview-build/index.astro', 'utf8');
  assert.match(previewBuildPage, /<footer[^>]*>[\s\S]*href=["']\/privacy\/["'][\s\S]*<\/footer>/i,
    'preview build page footer must link to privacy notes');

  const uatPage = readFileSync('src/pages/tools/private-uat-worksheet/index.astro', 'utf8');
  assert.match(uatPage, /<footer[^>]*>[\s\S]*href=["']\/privacy\/["'][\s\S]*<\/footer>/i,
    'private UAT worksheet footer must link to privacy notes');

  const comparePage = readFileSync('src/pages/compare/index.astro', 'utf8');
  assert.match(comparePage, /<footer[^>]*>[\s\S]*href=["']\/disclosure\/["'][\s\S]*<\/footer>/i,
    'compare page footer must link to affiliate disclosure');
});
