/**
 * Schema.org JSON-LD structured data generators.
 * Pure, deterministic functions that produce valid Schema.org vocabulary objects.
 * Sanitized against script breakouts to ensure XSS safety in HTML templates.
 */

export function buildSoftwareApplicationSchema(product) {
  if (!product || typeof product !== 'object' || typeof product.name !== 'string') {
    throw new Error('Invalid product for SoftwareApplication schema');
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: product.name,
    applicationCategory: product.category || 'BusinessApplication',
    operatingSystem: 'Cloud-based',
    description: product.description || `${product.name} software candidate profile.`,
    url: `https://stackpilot.invalid/software/${product.id}/`,
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      priceSpecification: {
        '@type': 'PriceSpecification',
        description: 'Pricing unverified — consult official provider'
      }
    }
  };
}

export function buildFAQSchema(faqs) {
  if (!Array.isArray(faqs)) {
    throw new Error('Invalid faqs input: must be an array');
  }
  if (faqs.length === 0) {
    throw new Error('Invalid faqs input: cannot be empty');
  }
  for (const faq of faqs) {
    if (!faq || typeof faq.question !== 'string' || typeof faq.answer !== 'string') {
      throw new Error('Invalid FAQ item: question and answer must be strings');
    }
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

export function buildBreadcrumbSchema(crumbs) {
  if (!Array.isArray(crumbs)) {
    throw new Error('Invalid crumbs input: must be an array');
  }
  if (crumbs.length === 0) {
    throw new Error('Invalid crumbs input: cannot be empty');
  }
  for (const crumb of crumbs) {
    if (!crumb || typeof crumb.name !== 'string' || typeof crumb.url !== 'string') {
      throw new Error('Invalid crumb item: name and url must be strings');
    }
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `https://stackpilot.invalid${crumb.url.startsWith('/') ? crumb.url : '/' + crumb.url}`
    }))
  };
}

export function serializeJsonLd(schema) {
  if (!schema || typeof schema !== 'object') {
    throw new Error('Invalid schema object for JSON-LD serialization');
  }
  // Standard JSON serialization with HTML character escaping to prevent <script> breakout
  const json = JSON.stringify(schema, null, 2);
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
