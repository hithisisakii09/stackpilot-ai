/**
 * Deterministic, explainable recommendation logic.
 * Product category is shown alphabetically, never weighted or scored.
 * Affiliate status is deliberately excluded from ranking.
 */
export const TEAM_SIZES = Object.freeze(['Solo', '2–20', '21+']);
export const BUDGETS = Object.freeze(['Minimal', 'Moderate', 'Premium']);
export const GOALS = Object.freeze(['sales', 'seo', 'hosting']);

export function recommend(products, options = {}) {
  if (!options || typeof options !== 'object') {
    throw new Error('Invalid recommendation inputs');
  }
  const { goal, team, budget } = options;
  if (!GOALS.includes(goal) || !TEAM_SIZES.includes(team) || !BUDGETS.includes(budget)) {
    throw new Error('Invalid recommendation inputs');
  }
  if (!Array.isArray(products)) {
    return [];
  }
  return products
    .filter((p) => p && Array.isArray(p.bestFor) && p.bestFor.includes(goal))
    .map((product) => {
      const reasons = ['Matches your selected software priority.'];
      const cautions = [];
      if (product.verified === true && Array.isArray(product.supportedTeams) && product.supportedTeams.length) {
        if (product.supportedTeams.includes(team)) {
          reasons.push('Listed as suitable for your team size.');
        } else {
          cautions.push('Team-size compatibility has not been established for your selection.');
        }
      } else {
        cautions.push('Team-size suitability has not been verified.');
      }
      if (product.verified === true && Array.isArray(product.budgetTiers) && product.budgetTiers.length) {
        if (product.budgetTiers.includes(budget)) {
          reasons.push('Listed as compatible with your selected budget tier.');
        } else {
          cautions.push('Selected budget tier is not supported by available evidence.');
        }
      } else {
        cautions.push('Current pricing and budget suitability are not verified.');
      }
      if (product.verified !== true) {
        cautions.push('Product claims have not completed editorial verification.');
      }
      return { product, reasons, cautions };
    })
    .sort((a, b) => 
      (a.product?.name ?? '').localeCompare(b.product?.name ?? '', 'en') || 
      (a.product?.id ?? '').localeCompare(b.product?.id ?? '', 'en')
    );
}
