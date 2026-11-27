import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SITE_ORIGIN, canonicalUrl } from '../src/lib/site-origin.mjs';
import { buildSoftwareApplicationSchema, buildBreadcrumbSchema } from '../src/lib/structured-data.mjs';

const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));

const PUBLIC_ROUTES = [
  '/',
  '/compare/',
  '/compare/hubspot-vs-pipedrive/',
  '/compare/semrush-vs-ahrefs/',
  '/compare/kinsta-vs-cloudways/',
  ...products.map(p => `/software/${p.id}/`),
  '/methodology/',
  '/privacy/',
  '/disclosure/',
  '/guides/saas-total-cost-of-ownership/',
  '/guides/crm-migration-checklist/',
  '/guides/hosting-migration-checklist/',
  '/tools/requirements-checklist/',
  '/tools/software-cost-calculator/',
  '/tools/crm-seat-audit/',
  '/tools/crm-migration-readiness/',
  '/tools/hosting-cutover-gates/',
  '/tools/backup-restore-drill/',
  '/tools/hosting-hidden-costs/',
  '/tools/seo-audit-scope/'
];

const PRIVATE_ROUTES = [
  '/tools/private-uat-worksheet/',
  '/preview-build/',
  '/research/'
];

test('JSON-LD generators use live SITE_ORIGIN with zero stackpilot.invalid placeholders', () => {
  assert.equal(SITE_ORIGIN, 'https://inspiring-chaja-cfb85f.netlify.app');
  const hubspot = products.find(p => p.id === 'hubspot');
  const appSchema = buildSoftwareApplicationSchema(hubspot);
  assert.equal(appSchema.url, `${SITE_ORIGIN}/software/hubspot/`);
  assert.doesNotMatch(JSON.stringify(appSchema), /stackpilot\.invalid/i);

  const crumbs = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Compare', url: '/compare/' }
  ]);
  assert.equal(crumbs.itemListElement[0].item, `${SITE_ORIGIN}/`);
  assert.equal(crumbs.itemListElement[1].item, `${SITE_ORIGIN}/compare/`);
  assert.doesNotMatch(JSON.stringify(crumbs), /stackpilot\.invalid/i);
});

test('public/sitemap.xml lists all 25 public routes and zero private routes', () => {
  assert.equal(PUBLIC_ROUTES.length, 25);
  const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(locs.length, 25);
  for (const route of PUBLIC_ROUTES) {
    assert.ok(locs.includes(canonicalUrl(route)), `Missing public route in sitemap.xml: ${route}`);
  }
  for (const route of PRIVATE_ROUTES) {
    assert.equal(locs.includes(canonicalUrl(route)), false, `Private route leaked into sitemap.xml: ${route}`);
  }
  const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8');
  assert.match(robots, new RegExp(`^Sitemap:\\s*${SITE_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/sitemap\\.xml$`, 'm'));
});

test('all 25 built public pages have matching canonical tags and zero stackpilot.invalid', () => {
  if (!existsSync(new URL('../dist/index.html', import.meta.url))) {
    return;
  }
  for (const route of PUBLIC_ROUTES) {
    const filePath = route === '/' ? '../dist/index.html' : `../dist${route}index.html`;
    const html = readFileSync(new URL(filePath, import.meta.url), 'utf8');
    const expectedHref = canonicalUrl(route);
    assert.ok(
      html.includes(`<link rel="canonical" href="${expectedHref}"`) || html.includes(`<link rel="canonical" href=${expectedHref}`),
      `Missing canonical tag for ${route} (${expectedHref})`
    );
    assert.doesNotMatch(html, /stackpilot\.invalid/i, `Found stackpilot.invalid in ${route}`);
  }
});
