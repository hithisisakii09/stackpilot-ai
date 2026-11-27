/**
 * Single source of truth for the public static site origin.
 * Updating to a custom domain later requires changing only SITE_ORIGIN here.
 */
export const SITE_ORIGIN = 'https://inspiring-chaja-cfb85f.netlify.app';

export function canonicalUrl(route = '/') {
  const normalized = route.startsWith('/') ? route : '/' + route;
  return `${SITE_ORIGIN}${normalized}`;
}
