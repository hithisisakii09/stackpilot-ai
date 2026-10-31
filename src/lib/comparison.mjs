/**
 * Read-only candidate comparison. No scraped data, fit inference, ranking,
 * commissions, advertising status or anonymous buyer tracking are involved.
 */
function assertUniqueProducts(products) {
  if (!Array.isArray(products) || products.some(p => !p || typeof p.id !== 'string')) {
    throw new Error('Invalid product catalog');
  }
  if (products.some(p => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id))) {
    throw new Error('Invalid product id');
  }
  const ids = new Set(products.map(p => p.id));
  if (ids.size !== products.length) throw new Error('Duplicate product id');
}

export function comparisonCategories(products) {
  assertUniqueProducts(products);
  return [...new Set(products.map((product) => product.category))].sort((a, b) => a.localeCompare(b));
}

export function categoryCandidates(products, category) {
  if (!comparisonCategories(products).includes(category)) throw new Error('Unknown software category');
  return products.filter(p => p.category === category).sort((a, b) => a.name.localeCompare(b.name));
}

function info(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    editorialStatus: product.verified === true ? 'Editorial review completed' : 'Editorial review pending',
    identifiedSources: Array.isArray(product.sources) ? product.sources.length : 0,
    teamFit: product.verified === true && product.supportedTeams?.length
      ? product.supportedTeams.join(', ')
      : 'Unverified',
    budgetFit: product.verified === true && product.budgetTiers?.length
      ? product.budgetTiers.join(', ')
      : 'Unverified',
    pricing: 'Unverified — check the official provider',
    affiliateStatus: 'No affiliate links active',
    profileUrl: `/software/${product.id}/`
  };
}

export function compareCandidates(products, category, firstId, secondId) {
  const pool = categoryCandidates(products, category);
  if (firstId === secondId) throw new Error('Select two different products');
  const first = pool.find(p => p.id === firstId);
  const second = pool.find(p => p.id === secondId);
  if (!first || !second) throw new Error('Select two products from the same category');
  return {
    category,
    products: [info(first), info(second)],
    rows: [
      { label: 'Overview (unverified)', key: 'description' },
      { label: 'Editorial verification', key: 'editorialStatus' },
      { label: 'Vendor sources identified (not verified)', key: 'identifiedSources' },
      { label: 'Team suitability', key: 'teamFit' },
      { label: 'Budget suitability', key: 'budgetFit' },
      { label: 'Pricing', key: 'pricing' },
      { label: 'Affiliate status', key: 'affiliateStatus' }
    ]
  };
}
