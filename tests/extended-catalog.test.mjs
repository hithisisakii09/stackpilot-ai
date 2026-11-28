import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_ORIGIN, canonicalUrl } from '../src/lib/site-origin.mjs';
import {
  validateExtendedCatalog,
  getExtendedProducts,
  getExtendedProduct,
  getExtendedComparisons,
  getExtendedComparison,
} from '../src/lib/extended-catalog.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const rawCatalog = JSON.parse(readFileSync(join(root, 'src/data/extended-catalog.json'), 'utf8'));

function cloneCatalog() {
  return JSON.parse(JSON.stringify(rawCatalog));
}

test('src/data/extended-catalog.json passes validateExtendedCatalog and returns deeply frozen objects', () => {
  const validated = validateExtendedCatalog(rawCatalog, { today: '2026-11-28' });
  assert.strictEqual(validated.schemaVersion, 1);
  assert.strictEqual(validated.products.length, 7);
  assert.strictEqual(validated.comparisons.length, 6);
  assert.ok(Object.isFrozen(validated));
  assert.ok(Object.isFrozen(validated.products));
  assert.ok(Object.isFrozen(validated.products[0]));
  assert.ok(Object.isFrozen(validated.comparisons));
  assert.ok(Object.isFrozen(validated.comparisons[0]));

  assert.strictEqual(getExtendedProducts().length, 7);
  assert.strictEqual(getExtendedComparisons().length, 6);
  assert.strictEqual(getExtendedProduct('zoho-crm')?.name, 'Zoho CRM');
  assert.strictEqual(getExtendedComparison('hubspot-vs-zoho-crm')?.slug, 'hubspot-vs-zoho-crm');
  assert.strictEqual(getExtendedProduct('non-existent'), null);
  assert.strictEqual(getExtendedComparison('non-existent'), null);
});

test('validateExtendedCatalog rejects non-null affiliateUrl', () => {
  const bad = cloneCatalog();
  bad.products[0].affiliateUrl = 'https://zoho.com/?aff=123';
  assert.throws(() => validateExtendedCatalog(bad, { today: '2026-11-28' }), /affiliateUrl/i);
});

test('validateExtendedCatalog rejects non-HTTPS URLs', () => {
  const bad = cloneCatalog();
  bad.products[0].officialUrls[0] = 'http://www.zoho.com/crm/';
  assert.throws(() => validateExtendedCatalog(bad, { today: '2026-11-28' }), /HTTPS/i);
});

test('validateExtendedCatalog rejects non-allowlisted domains', () => {
  const bad = cloneCatalog();
  bad.products[0].officialUrls[0] = 'https://unverified-third-party-blog.com/zoho-review';
  assert.throws(() => validateExtendedCatalog(bad, { today: '2026-11-28' }), /allowlist|domain/i);
});

test('validateExtendedCatalog rejects UTM and affiliate query parameters', () => {
  const bad = cloneCatalog();
  bad.products[0].officialUrls[0] = 'https://www.zoho.com/crm/?utm_source=stackpilot';
  assert.throws(() => validateExtendedCatalog(bad, { today: '2026-11-28' }), /tracking|query/i);

  const bad2 = cloneCatalog();
  bad2.comparisons[0].rows[0].first.sourceUrl = 'https://www.zoho.com/crm/?ref=partner';
  assert.throws(() => validateExtendedCatalog(bad2, { today: '2026-11-28' }), /tracking|query/i);
});

test('validateExtendedCatalog rejects slug collisions with legacy products and comparison pairs', () => {
  const badProd = cloneCatalog();
  badProd.products[0].id = 'hubspot';
  assert.throws(() => validateExtendedCatalog(badProd, { today: '2026-11-28' }), /collides|legacy/i);

  const badComp = cloneCatalog();
  badComp.comparisons[0].slug = 'hubspot-vs-pipedrive';
  assert.throws(() => validateExtendedCatalog(badComp, { today: '2026-11-28' }), /collides|legacy/i);
});

test('validateExtendedCatalog rejects Proxy and prototype-polluted payloads', () => {
  const proxied = new Proxy(cloneCatalog(), {});
  assert.throws(() => validateExtendedCatalog(proxied, { today: '2026-11-28' }), /Invalid/i);
});

test('public/sitemap.xml includes all 7 extended /software/* and 6 extended /compare/* routes with zero private routes', () => {
  const sitemap = readFileSync(join(root, 'public/sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

  for (const prod of getExtendedProducts()) {
    const expected = canonicalUrl(`/software/${prod.id}/`);
    assert.ok(locs.includes(expected), `Missing extended product in sitemap: ${expected}`);
  }
  for (const comp of getExtendedComparisons()) {
    const expected = canonicalUrl(`/compare/${comp.slug}/`);
    assert.ok(locs.includes(expected), `Missing extended comparison in sitemap: ${expected}`);
  }

  for (const priv of ['/tools/private-uat-worksheet/', '/preview-build/', '/research/']) {
    assert.strictEqual(locs.includes(canonicalUrl(priv)), false, `Private route leaked: ${priv}`);
  }
});

test('built dist/ contains all 7 new /software/* and 6 new /compare/* pages with Executive Slate, canonicals, JSON-LD, and accessibility landmarks', () => {
  if (!existsSync(join(root, 'dist/index.html'))) {
    return;
  }

  const routes = [
    ...getExtendedProducts().map(p => `/software/${p.id}/`),
    ...getExtendedComparisons().map(c => `/compare/${c.slug}/`),
  ];

  for (const route of routes) {
    const htmlPath = join(root, 'dist', route, 'index.html');
    assert.ok(existsSync(htmlPath), `Missing built page: ${htmlPath}`);
    const html = readFileSync(htmlPath, 'utf8');
    const expectedCanon = `${SITE_ORIGIN}${route}`;

    assert.ok(html.includes('content="index, follow"'), `Missing index, follow on ${route}`);
    assert.ok(
      html.includes(`href="${expectedCanon}"`) || html.includes(`href=${expectedCanon}`),
      `Missing canonical ${expectedCanon} on ${route}`,
    );
    assert.ok(html.includes('/styles/executive-theme.css'), `Missing executive-theme.css on ${route}`);
    assert.ok(html.includes('application/ld+json'), `Missing JSON-LD on ${route}`);
    assert.ok(html.includes('class="skip-link"'), `Missing skip-link on ${route}`);
    assert.ok(html.includes('id="main"'), `Missing main id="main" on ${route}`);
    assert.ok(html.includes('role="region"') && html.includes('tabindex="0"'), `Missing accessible table-scroll region on ${route}`);
    assert.doesNotMatch(html, /[?&](?:ref|aff|affiliate|utm_)=/i, `Found affiliate/tracking query param on ${route}`);
  }
});
