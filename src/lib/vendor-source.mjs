/**
 * Pinned official vendor domains for the closed six-product research catalog.
 * URL provenance only: this does not establish editorial approval or product fit.
 */
const officialDomains = Object.freeze({
  hubspot: 'hubspot.com',
  pipedrive: 'pipedrive.com',
  ahrefs: 'ahrefs.com',
  semrush: 'semrush.com',
  kinsta: 'kinsta.com',
  cloudways: 'cloudways.com'
});

function parseCleanHttps(value) {
  if(typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if(url.protocol !== 'https:' || url.username || url.password ||
       url.port || url.search || url.hash || !url.hostname) return null;
    return url;
  } catch { return null; }
}

export function isOfficialVendorWebsite(product) {
  if(!product || typeof product.id!=='string') return false;
  const domain=officialDomains[product.id];
  const url=parseCleanHttps(product.website);
  if(!domain || !url) return false;
  return url.hostname===domain || url.hostname==='www.'+domain;
}

export function isVendorSourceUrl(product, sourceUrl) {
  if(!isOfficialVendorWebsite(product)) return false;
  const url=parseCleanHttps(sourceUrl);
  if(!url || url.pathname.length<=1) return false;
  const domain=officialDomains[product.id];
  if(url.hostname===domain || url.hostname.endsWith('.'+domain)) return true;
  // Cloudways is part of DigitalOcean. Allow only the first-party product
  // description path, not arbitrary DigitalOcean blog/pages or redirects.
  return product.id==='cloudways' &&
    (url.hostname==='www.digitalocean.com' || url.hostname==='digitalocean.com') &&
    (url.pathname==='/products/cloudways' || url.pathname.startsWith('/products/cloudways/'));
}
