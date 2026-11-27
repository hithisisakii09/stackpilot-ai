import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import products from '../data/products.json' with { type: 'json' };
import { canonicalUrl } from './site-origin.mjs';
import { validateAgentBuyerGuides } from './agent-buyer-guides.mjs';
import rawGuidesData from '../data/agent-buyer-guides.json' with { type: 'json' };
import rawVerifiedFacts from '../data/verified-vendor-facts.json' with { type: 'json' };

export const BASE_PUBLIC_ROUTES = Object.freeze([
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
]);

export function buildSitemapXml(guidesData = rawGuidesData) {
  const validated = validateAgentBuyerGuides(guidesData, rawVerifiedFacts, { today: '9999-12-31' });
  const guideRoutes = validated.guides.map(g => `/guides/${g.slug}/`);
  const allRoutes = [...BASE_PUBLIC_ROUTES, ...guideRoutes];
  const urlLines = allRoutes.map(route => `  <url><loc>${canonicalUrl(route)}</loc></url>`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlLines,
    '</urlset>',
    ''
  ].join('\n');
}

export function syncPublicSitemap(rootDir) {
  const guidesPath = join(rootDir, 'src', 'data', 'agent-buyer-guides.json');
  const guidesData = JSON.parse(readFileSync(guidesPath, 'utf8'));
  const xml = buildSitemapXml(guidesData);
  const sitemapPath = join(rootDir, 'public', 'sitemap.xml');
  writeFileSync(sitemapPath, xml, 'utf8');
  return sitemapPath;
}
