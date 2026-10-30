const DAY = 24 * 60 * 60 * 1000;
const parsedDay = (day) => {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const result = new Date(day + 'T00:00:00.000Z');
  return Number.isNaN(result.valueOf()) || result.toISOString().slice(0, 10) !== day ? null : result;
};

/**
 * Creates an offline editorial research queue. No network calls, LLM prompts,
 * affiliate changes, data mutations, or publishing actions occur here.
 */
export function buildResearchQueue(products, { today = new Date().toISOString().slice(0, 10), staleAfterDays = 90 } = {}) {
  const now = parsedDay(today);
  if (!now || !Number.isInteger(staleAfterDays) || staleAfterDays < 1) throw new Error('Invalid research queue options');
  return products.map((product) => {
    const sources = Array.isArray(product.sources) ? product.sources : [];
    const validDates = sources.map(s => parsedDay(s.checkedAt)).filter(Boolean);
    const newest = validDates.length ? validDates.reduce((a, b) => a > b ? a : b) : null;
    const ageDays = newest ? Math.floor((now - newest) / DAY) : null;
    const blockers = [];
    if (product.verified !== true) blockers.push('editorial-review-pending');
    if (sources.length === 0) blockers.push('no-source-evidence');
    if (ageDays === null || ageDays > staleAfterDays) blockers.push('source-refresh-required');
    if (!Array.isArray(product.supportedTeams) || product.supportedTeams.length === 0) blockers.push('team-fit-unknown');
    if (!Array.isArray(product.budgetTiers) || product.budgetTiers.length === 0) blockers.push('budget-fit-unknown');
    if (product.pricing?.status !== 'verified') blockers.push('pricing-unverified');
    return {
      id: product.id,
      name: product.name,
      researchStatus: product.researchStatus,
      sourceCount: sources.length,
      latestSourceDate: newest ? newest.toISOString().slice(0, 10) : null,
      ageDays,
      blockers
    };
  }).sort((a, b) => b.blockers.length - a.blockers.length || a.name.localeCompare(b.name));
}
