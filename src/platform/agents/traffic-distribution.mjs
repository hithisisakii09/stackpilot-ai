/**
 * Phase 15 — Traffic, Distribution & GSC Feedback Agent
 *
 * Offline-first, fail-closed distribution drafting agent.
 * All generated packs require owner approval before posting.
 * Never auto-posts to any social platform.
 * Zero new npm dependencies.
 */

import { createHash } from 'node:crypto';

// ── Constants ─────────────────────────────────────────────────────────────

const GSC_IMPRESSION_THRESHOLD = 20;
const MAX_XTHREAD_CHARS = 280;
const MIN_LINKEDIN_CHARS = 120;
const MAX_LINKEDIN_CHARS = 1500;
const MIN_NEWSLETTER_CHARS = 80;
const MAX_NEWSLETTER_CHARS = 600;

// ── Utility helpers ─────────────────────────────────────────────────────────

function isPlainObject(val) {
  if (val === null || typeof val !== 'object') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

function assertPlainObject(val, label) {
  if (!isPlainObject(val)) throw new Error(`${label} must be a plain object (no Proxy or prototype)`);
}

function hasTrackingParams(url) {
  try {
    const u = new URL(url);
    const tracking = ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'aff', 'affiliate', 'partner', 'click_id'];
    for (const key of tracking) {
      if (u.searchParams.has(key)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function hasHtml(str) {
  return /[<>]/.test(str);
}

function hasEmail(str) {
  return /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/.test(str);
}

function trimToWordBoundary(str, maxLen) {
  if (str.length <= maxLen) return str;
  const cut = str.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
}

function stripFences(raw) {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

function generateId(slug, draftedAt) {
  return 'dist-' + createHash('sha256')
    .update(`${slug}:${draftedAt}`)
    .digest('hex')
    .slice(0, 12);
}

// ── validateDistributionPacks ───────────────────────────────────────────────

/**
 * Validates an agent-distribution-drafts.json data object.
 * Returns { violations: string[] }.
 * Throws if any pack is a Proxy or non-plain object.
 */
export function validateDistributionPacks(data, allowedCanonicalUrls, allowedOfficialUrls, options = {}) {
  assertPlainObject(data, 'data');
  if (!Array.isArray(data.packs)) return { violations: ['data.packs must be an array'] };

  const violations = [];
  const allowedCanon = new Set(allowedCanonicalUrls);
  const allowedOfficial = new Set(allowedOfficialUrls);

  for (let i = 0; i < data.packs.length; i++) {
    const pack = data.packs[i];
    assertPlainObject(pack, `packs[${i}]`);

    const prefix = `packs[${i}] (${pack.id || 'unknown'})`;

    // Required fields
    if (typeof pack.id !== 'string' || !pack.id) violations.push(`${prefix}: missing id`);
    if (typeof pack.targetSlug !== 'string' || !pack.targetSlug) violations.push(`${prefix}: missing targetSlug`);
    if (!['guide', 'comparison'].includes(pack.targetType)) violations.push(`${prefix}: invalid targetType`);

    // canonicalUrl must be allowlisted (without tracking params)
    if (typeof pack.canonicalUrl !== 'string') {
      violations.push(`${prefix}: missing canonicalUrl`);
    } else if (hasTrackingParams(pack.canonicalUrl)) {
      violations.push(`${prefix}: canonicalUrl has tracking params`);
    } else if (!allowedCanon.has(pack.canonicalUrl)) {
      violations.push(`${prefix}: canonicalUrl not allowlisted: ${pack.canonicalUrl}`);
    }

    // Status must be pending_owner_review only
    if (pack.status !== 'pending_owner_review') {
      violations.push(`${prefix}: status must be pending_owner_review, got: ${pack.status}`);
    }

    // ownerApprovalRequired must be true
    if (pack.ownerApprovalRequired !== true) {
      violations.push(`${prefix}: ownerApprovalRequired must be true`);
    }

    // draftedAt must be a valid ISO date string
    if (typeof pack.draftedAt !== 'string' || !pack.draftedAt || isNaN(Date.parse(pack.draftedAt))) {
      violations.push(`${prefix}: invalid draftedAt`);
    }

    // referencedOfficialUrls must all be in allowedOfficialUrls
    if (!Array.isArray(pack.referencedOfficialUrls)) {
      violations.push(`${prefix}: referencedOfficialUrls must be array`);
    } else {
      for (const u of pack.referencedOfficialUrls) {
        if (hasTrackingParams(u)) {
          violations.push(`${prefix}: referencedOfficialUrl has tracking params: ${u}`);
        } else if (!allowedOfficial.has(u)) {
          violations.push(`${prefix}: referencedOfficialUrl not allowlisted: ${u}`);
        }
      }
    }

    // channels
    assertPlainObject(pack.channels, `${prefix}.channels`);
    const ch = pack.channels;

    // linkedin
    if (typeof ch.linkedin !== 'string') {
      violations.push(`${prefix}: channels.linkedin must be string`);
    } else {
      if (hasHtml(ch.linkedin)) violations.push(`${prefix}: channels.linkedin contains HTML`);
      if (hasEmail(ch.linkedin)) violations.push(`${prefix}: channels.linkedin contains email address`);
      if (ch.linkedin.length < MIN_LINKEDIN_CHARS) violations.push(`${prefix}: channels.linkedin too short (<${MIN_LINKEDIN_CHARS})`);
      if (ch.linkedin.length > MAX_LINKEDIN_CHARS) violations.push(`${prefix}: channels.linkedin too long (>${MAX_LINKEDIN_CHARS})`);
    }

    // xThread
    if (!Array.isArray(ch.xThread) || ch.xThread.length < 2) {
      violations.push(`${prefix}: channels.xThread must be array of >= 2 items`);
    } else {
      for (let j = 0; j < ch.xThread.length; j++) {
        const tweet = ch.xThread[j];
        if (typeof tweet !== 'string') {
          violations.push(`${prefix}: channels.xThread[${j}] must be string`);
        } else {
          if (tweet.length > MAX_XTHREAD_CHARS) violations.push(`${prefix}: channels.xThread[${j}] exceeds ${MAX_XTHREAD_CHARS} chars`);
          if (hasHtml(tweet)) violations.push(`${prefix}: channels.xThread[${j}] contains HTML`);
          if (hasEmail(tweet)) violations.push(`${prefix}: channels.xThread[${j}] contains email address`);
        }
      }
    }

    // reddit
    assertPlainObject(ch.reddit, `${prefix}.channels.reddit`);
    if (typeof ch.reddit.title !== 'string' || !ch.reddit.title) violations.push(`${prefix}: channels.reddit.title missing`);
    if (typeof ch.reddit.body !== 'string' || !ch.reddit.body) violations.push(`${prefix}: channels.reddit.body missing`);
    if (hasHtml(ch.reddit?.title || '')) violations.push(`${prefix}: channels.reddit.title contains HTML`);
    if (hasHtml(ch.reddit?.body || '')) violations.push(`${prefix}: channels.reddit.body contains HTML`);

    // newsletterBlurb
    if (typeof ch.newsletterBlurb !== 'string') {
      violations.push(`${prefix}: channels.newsletterBlurb must be string`);
    } else {
      if (hasHtml(ch.newsletterBlurb)) violations.push(`${prefix}: channels.newsletterBlurb contains HTML`);
      if (ch.newsletterBlurb.length < MIN_NEWSLETTER_CHARS) violations.push(`${prefix}: channels.newsletterBlurb too short (<${MIN_NEWSLETTER_CHARS})`);
      if (ch.newsletterBlurb.length > MAX_NEWSLETTER_CHARS) violations.push(`${prefix}: channels.newsletterBlurb too long (>${MAX_NEWSLETTER_CHARS})`);
    }
  }

  return { violations };
}

// ── selectNextContentForDistribution ───────────────────────────────────────

/**
 * Deterministically selects the next content target to draft a distribution pack for.
 * Prioritizes buyer guides first, then comparison pages, alphabetically.
 * Returns null if all targets already have a pending/drafted pack.
 */
export function selectNextContentForDistribution({ guides, verifiedVendorFacts, existingPacks, preferredSlug } = {}) {
  const draftedSlugs = new Set(
    (existingPacks?.packs || []).map(p => p.targetSlug),
  );

  // Build ordered list: guides first, then comparisons, alphabetical within each group
  const targets = [];

  // Buyer guides
  for (const guide of (guides?.guides || []).slice().sort((a, b) => a.slug.localeCompare(b.slug))) {
    targets.push({
      targetSlug: guide.slug,
      targetType: 'guide',
      title: guide.title || guide.slug,
      canonicalUrl: `https://inspiring-chaja-cfb85f.netlify.app/guides/${guide.slug}/`,
      referencedOfficialUrls: (guide.citations || []).map(c => c.url).filter(Boolean),
    });
  }

  // Comparison pages (from verifiedVendorFacts keys)
  for (const slug of Object.keys(verifiedVendorFacts || {}).sort()) {
    targets.push({
      targetSlug: slug,
      targetType: 'comparison',
      title: slug,
      canonicalUrl: `https://inspiring-chaja-cfb85f.netlify.app/compare/${slug}/`,
      referencedOfficialUrls: (verifiedVendorFacts[slug]?.rows || []).flatMap(r => [r.first?.sourceUrl, r.second?.sourceUrl]).filter(Boolean),
    });
  }

  // If a preferred slug is specified, try it first
  if (preferredSlug) {
    const preferred = targets.find(t => t.targetSlug === preferredSlug);
    if (preferred && !draftedSlugs.has(preferredSlug)) return preferred;
  }

  // Otherwise pick the first not-yet-drafted target
  const next = targets.find(t => !draftedSlugs.has(t.targetSlug));
  return next || null;
}

// ── buildDistributionPrompt ─────────────────────────────────────────────────

/**
 * Builds a safe AI prompt for drafting distribution pack content.
 * No double-newlines; no < or > characters (router.mjs validation).
 */
export function buildDistributionPrompt({ target, siteOrigin }) {
  const schema = '{"linkedin":"...(120-1500 chars, no HTML, no email, cites canonicalUrl)","xThread":["tweet1","tweet2","tweet3"],"reddit":{"title":"...","body":"..."},"newsletterBlurb":"...(80-600 chars, cites canonicalUrl)"}';
  const refUrls = (target.referencedOfficialUrls || []).join(' | ');

  const parts = [
    `Draft a distribution pack for this ${target.targetType} page.`,
    `Target URL: ${target.canonicalUrl}`,
    `Title: ${target.title || target.targetSlug}`,
    refUrls ? `Referenced official vendor URLs: ${refUrls}` : null,
    `Site origin: ${siteOrigin}`,
    `Rules: linkedin 120-1500 chars NO HTML NO email cites canonicalUrl. | xThread: array of 3-4 strings each max 280 chars NO HTML cites canonicalUrl in last tweet. | reddit.title and reddit.body: factual non-promotional no affiliate links. | newsletterBlurb: 80-600 chars cites canonicalUrl NO HTML. | Only reference the given target URL and given official vendor URLs. | No tracking parameters. | No affiliate parameters.`,
    `Respond ONLY with valid JSON matching this schema: ${schema}`,
  ].filter(Boolean);

  return parts.join(' | ').replace(/[<>\x00-\x1f\x7f]+/g, ' ').trim();
}

// ── parseAndValidateDistributionResponse ────────────────────────────────────

/**
 * Parses and validates a raw AI JSON response for a distribution pack.
 * Returns { ok: true, channels } or { ok: false, error: string }.
 */
export function parseAndValidateDistributionResponse(rawText, context) {
  const { canonicalUrl, allowedCanonicalUrls = [], allowedOfficialUrls = [] } = context;

  // Strip code fences
  let text = stripFences(rawText);

  // Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { ok: false, error: `JSON parse error: ${err.message}` };
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, error: 'AI response is not a plain object' };
  }

  // Normalize aliases
  if (!parsed.xThread && parsed.twitterThread) parsed.xThread = parsed.twitterThread;
  if (!parsed.newsletterBlurb && parsed.newsletter) parsed.newsletterBlurb = parsed.newsletter;

  // Validate and auto-trim xThread items to 280 chars at word boundary
  if (Array.isArray(parsed.xThread)) {
    parsed.xThread = parsed.xThread.map(t =>
      typeof t === 'string' ? trimToWordBoundary(t, MAX_XTHREAD_CHARS) : t,
    );
  }

  // Validate required fields
  const errors = [];

  if (typeof parsed.linkedin !== 'string' || parsed.linkedin.length < MIN_LINKEDIN_CHARS) {
    errors.push(`linkedin must be string >= ${MIN_LINKEDIN_CHARS} chars`);
  } else if (hasHtml(parsed.linkedin)) {
    errors.push('linkedin contains HTML');
  } else if (parsed.linkedin.length > MAX_LINKEDIN_CHARS) {
    errors.push(`linkedin too long (>${MAX_LINKEDIN_CHARS})`);
  }

  if (!Array.isArray(parsed.xThread) || parsed.xThread.length < 2) {
    errors.push('xThread must be array of >= 2 strings');
  } else {
    for (const t of parsed.xThread) {
      if (typeof t !== 'string') errors.push('xThread item must be string');
      else if (t.length > MAX_XTHREAD_CHARS) errors.push(`xThread item still > ${MAX_XTHREAD_CHARS} after trim`);
      else if (hasHtml(t)) errors.push('xThread item contains HTML');
    }
  }

  if (!isPlainObject(parsed.reddit) || typeof parsed.reddit.title !== 'string' || typeof parsed.reddit.body !== 'string') {
    errors.push('reddit must be object with title and body strings');
  } else {
    if (hasHtml(parsed.reddit.title)) errors.push('reddit.title contains HTML');
    if (hasHtml(parsed.reddit.body)) errors.push('reddit.body contains HTML');
  }

  if (typeof parsed.newsletterBlurb !== 'string' || parsed.newsletterBlurb.length < MIN_NEWSLETTER_CHARS) {
    errors.push(`newsletterBlurb must be string >= ${MIN_NEWSLETTER_CHARS} chars`);
  } else if (hasHtml(parsed.newsletterBlurb)) {
    errors.push('newsletterBlurb contains HTML');
  } else if (parsed.newsletterBlurb.length > MAX_NEWSLETTER_CHARS) {
    errors.push(`newsletterBlurb too long (>${MAX_NEWSLETTER_CHARS})`);
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join('; ') };
  }

  return {
    ok: true,
    channels: {
      linkedin: parsed.linkedin,
      xThread: parsed.xThread,
      reddit: { title: parsed.reddit.title, body: parsed.reddit.body },
      newsletterBlurb: parsed.newsletterBlurb,
    },
  };
}

// ── extractGscTopicOpportunities ────────────────────────────────────────────

/**
 * Offline helper: filters and ranks GSC rows by impressions.
 * Deduplicates by query. Rejects malformed rows. Never mutates inputs.
 */
export function extractGscTopicOpportunities({ gscRows, backlog, guides } = {}) {
  if (!Array.isArray(gscRows)) return [];

  const existingSlugs = new Set([
    ...(backlog?.topics || []).map(t => t.slug).filter(Boolean),
    ...(guides?.guides || []).map(g => g.slug).filter(Boolean),
  ]);

  const seen = new Set();
  const results = [];

  for (const row of gscRows) {
    if (!isPlainObject(row)) continue;
    if (typeof row.query !== 'string' || !row.query.trim()) continue;
    const q = row.query.trim();
    if (seen.has(q)) continue;
    const impressions = Number(row.impressions);
    if (!Number.isFinite(impressions) || impressions < GSC_IMPRESSION_THRESHOLD) continue;
    seen.add(q);
    results.push({ query: q, impressions, clicks: Number(row.clicks) || 0, page: row.page || null });
  }

  // Sort descending by impressions
  results.sort((a, b) => b.impressions - a.impressions);

  return results;
}

// ── runTrafficDistributionAgent ─────────────────────────────────────────────

/**
 * Main agent entrypoint.
 * Fail-closed: requires both allowLiveDistribution=true and allowLiveAi=true.
 * All packs are status: 'pending_owner_review', ownerApprovalRequired: true.
 * Never auto-posts to any platform.
 *
 * @param {object} opts
 * @param {object} opts.guides - agent-buyer-guides.json data
 * @param {object} opts.existingPacks - agent-distribution-drafts.json data
 * @param {object} opts.verifiedVendorFacts - verified-vendor-facts.json data
 * @param {string} opts.siteOrigin - e.g. 'https://inspiring-chaja-cfb85f.netlify.app'
 * @param {string|null} opts.preferredSlug - optional override for target selection
 * @param {function} opts.runAiPrompt - async (request) => string
 * @param {boolean} opts.allowLiveDistribution
 * @param {boolean} opts.allowLiveAi
 * @param {Date} opts.now
 * @returns {Promise<object>} result object
 */
export async function runTrafficDistributionAgent({
  guides,
  existingPacks,
  verifiedVendorFacts,
  siteOrigin,
  preferredSlug,
  runAiPrompt,
  allowLiveDistribution = false,
  allowLiveAi = false,
  now = new Date(),
} = {}) {
  // Build eligible targets list (always computed offline)
  const draftedSlugs = new Set((existingPacks?.packs || []).map(p => p.targetSlug));

  const guideTargets = (guides?.guides || []).map(g => g.slug);
  const comparisonTargets = Object.keys(verifiedVendorFacts || {});
  const eligibleTargets = [
    ...guideTargets.filter(s => !draftedSlugs.has(s)),
    ...comparisonTargets.filter(s => !draftedSlugs.has(s)),
  ];
  const pendingPackCount = (existingPacks?.packs || []).filter(p => p.status === 'pending_owner_review').length;

  const baseResult = {
    eligibleTargets,
    pendingPackCount,
    nextTargetSlug: eligibleTargets[0] || null,
    estimatedCostMinor: 0,
  };

  // Fail-closed gates
  if (!allowLiveDistribution) {
    return { ...baseResult, status: 'live_distribution_disabled' };
  }
  if (!allowLiveAi) {
    return { ...baseResult, status: 'live_ai_disabled' };
  }

  // Select next target
  const target = selectNextContentForDistribution({
    guides,
    verifiedVendorFacts,
    existingPacks,
    preferredSlug,
  });

  if (!target) {
    return { ...baseResult, status: 'no_eligible_targets', nextTargetSlug: null };
  }

  // Build prompt
  const prompt = buildDistributionPrompt({ target, siteOrigin });

  // Call AI
  let rawText;
  try {
    rawText = await runAiPrompt({
      taskClass: 'editorial_draft',
      prompt,
      systemPrompt: 'You draft factual, grounded social media distribution content for a software comparison website. Respond ONLY with valid JSON. No affiliate links. No tracking parameters. No HTML. Only reference the given target URL and given official vendor URLs.',
      maxOutputTokens: 1536,
      estimatedCostMinor: 0,
    });
  } catch (err) {
    return {
      ...baseResult,
      status: 'ai_error',
      error: `AI call failed: ${err.message}`,
    };
  }

  // Parse and validate
  const draftedAt = now.toISOString();

  // Build allowedCanonicalUrls from all known targets
  const allCanonicalUrls = [
    ...(guides?.guides || []).map(g => `${siteOrigin}/guides/${g.slug}/`),
    ...Object.keys(verifiedVendorFacts || {}).map(slug => `${siteOrigin}/compare/${slug}/`),
  ];
  const allOfficialUrls = Object.values(verifiedVendorFacts || {}).flatMap(
    v => (v.rows || []).flatMap(r => [r.first?.sourceUrl, r.second?.sourceUrl]).filter(Boolean),
  );
  // Add citation URLs from guides
  for (const guide of (guides?.guides || [])) {
    for (const c of (guide.citations || [])) {
      if (c.url && !allOfficialUrls.includes(c.url)) allOfficialUrls.push(c.url);
    }
  }

  const parseResult = parseAndValidateDistributionResponse(rawText, {
    canonicalUrl: target.canonicalUrl,
    allowedCanonicalUrls: allCanonicalUrls,
    allowedOfficialUrls: allOfficialUrls,
  });

  if (!parseResult.ok) {
    return {
      ...baseResult,
      status: 'invalid_ai_response',
      error: parseResult.error,
    };
  }

  const newPack = {
    id: generateId(target.targetSlug, draftedAt),
    targetSlug: target.targetSlug,
    targetType: target.targetType,
    canonicalUrl: target.canonicalUrl,
    status: 'pending_owner_review',
    draftedAt,
    ownerApprovalRequired: true,
    channels: parseResult.channels,
    referencedOfficialUrls: target.referencedOfficialUrls.filter(u => allOfficialUrls.includes(u)),
  };

  return {
    ...baseResult,
    status: 'drafted',
    nextTargetSlug: target.targetSlug,
    newPack,
  };
}

// ── formatDistributionReportMarkdown ────────────────────────────────────────

/**
 * Formats a Markdown summary suitable for GitHub Actions Step Summary.
 */
export function formatDistributionReportMarkdown(result) {
  const lines = [
    '## Traffic Distribution Agent Report',
    '',
    `**Status:** \`${result.status}\``,
    `**Eligible targets:** ${(result.eligibleTargets || []).length}`,
    `**Pending packs (awaiting owner review):** ${result.pendingPackCount ?? 0}`,
    `**Next target:** ${result.nextTargetSlug || 'none'}`,
    `**Estimated cost:** ${result.estimatedCostMinor ?? 0} minor units`,
    '',
  ];

  if (result.newPack) {
    lines.push('### Drafted Pack', '');
    lines.push(`- **targetSlug:** \`${result.newPack.targetSlug}\``);
    lines.push(`- **targetType:** \`${result.newPack.targetType}\``);
    lines.push(`- **canonicalUrl:** ${result.newPack.canonicalUrl}`);
    lines.push(`- **draftedAt:** ${result.newPack.draftedAt}`);
    lines.push(`- **ownerApprovalRequired:** ${result.newPack.ownerApprovalRequired}`);
    lines.push('');
    lines.push('> Pack is pending owner review. No content has been posted.');
  }

  if (result.error) {
    lines.push(`**Error:** ${result.error}`);
  }

  if (result.eligibleTargets?.length > 0) {
    lines.push('', '### Eligible Targets', '');
    for (const slug of result.eligibleTargets) {
      lines.push(`- \`${slug}\``);
    }
  }

  return lines.join('\n');
}
