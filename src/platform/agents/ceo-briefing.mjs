import { types } from 'node:util';

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SECRET_PATTERNS = [
  /(?:sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|gsk_[A-Za-z0-9_-]{12,})/i,
  /\bBearer\s+[A-Za-z0-9._-]{10,}/i,
  /-----BEGIN\s+(?:[A-Z0-9]+\s+)?PRIVATE KEY-----/i,
];
const FABRICATED_CLAIM_PATTERN = /\b(?:earned|generated|made|received|collected)\s+(?:\$|₹|USD|INR)\s*[1-9]/i;

function fail(message = 'Invalid CEO briefings payload') {
  throw new Error(message);
}

function assertPlainObject(value, message = 'Invalid CEO briefings payload') {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    types.isProxy(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail(message);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (
      typeof key !== 'string' ||
      key === '__proto__' ||
      key === 'prototype' ||
      key === 'constructor' ||
      !Object.hasOwn(descriptors[key], 'value') ||
      !descriptors[key].enumerable
    ) {
      fail(message);
    }
  }
  return value;
}

function assertAllowedKeys(record, expectedKeys, message = 'Invalid or undeclared fields') {
  const keys = Object.keys(record);
  if (keys.length !== expectedKeys.length || expectedKeys.some(k => !Object.hasOwn(record, k))) {
    fail(message);
  }
}

function assertNonNegativeInt(value, label) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    fail(`Invalid ${label}: expected non-negative integer`);
  }
  return value;
}

function assertNullableNonNegativeInt(value, label) {
  if (value === null) return null;
  return assertNonNegativeInt(value, label);
}

function assertIsoDateNotFuture(value, today) {
  if (
    typeof value !== 'string' ||
    !ISO_DATE_PATTERN.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value + 'T00:00:00.000Z').toISOString().slice(0, 10) !== value
  ) {
    fail('Invalid generatedAt ISO date');
  }
  if (value > today) {
    fail('generatedAt date cannot be in the future');
  }
  return value;
}

function assertSafePlainText(value, minLen, maxLen, label) {
  if (typeof value !== 'string') fail(`Invalid ${label}: expected string`);
  const trimmed = value.trim();
  if (trimmed.length < minLen || trimmed.length > maxLen) {
    fail(`Invalid ${label}: length out of bounds (${trimmed.length})`);
  }
  if (/[<>]/.test(trimmed)) {
    fail(`Unsafe HTML characters not permitted in ${label}`);
  }
  if (SECRET_PATTERNS.some(p => p.test(trimmed))) {
    fail(`Secret-like material not permitted in ${label}`);
  }
  if (FABRICATED_CLAIM_PATTERN.test(trimmed)) {
    fail(`Fabricated revenue claim not permitted in ${label}`);
  }
  return trimmed;
}

function trimToWordBoundary(text, maxLen) {
  if (typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const cut = trimmed.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
}

function stripCodeFences(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

function deepFreezeSnapshot(snapshot) {
  return Object.freeze({
    researchMonitor: Object.freeze({ ...snapshot.researchMonitor }),
    seoBuilder: Object.freeze({ ...snapshot.seoBuilder }),
    trafficDistribution: Object.freeze({ ...snapshot.trafficDistribution }),
    vendorOutreach: Object.freeze({ ...snapshot.vendorOutreach }),
    governanceAndRevenue: Object.freeze({ ...snapshot.governanceAndRevenue }),
  });
}

/**
 * Pure deterministic fleet telemetry aggregation across all 5 operational pillars.
 * Never mutates inputs and strictly preserves null for uncollected external analytics.
 */
export function collectCompanyOperationsSnapshot(inputs = {}) {
  const src = assertPlainObject(inputs, 'Invalid inputs for company operations snapshot');

  const urlsObj = isPlainRecord(src.fingerprints?.urls) ? src.fingerprints.urls : {};
  const urlEntries = Object.values(urlsObj);
  const monitoredUrlCount = Object.keys(urlsObj).length;
  const baselinedUrlCount = urlEntries.filter(
    entry => entry && typeof entry.contentHash === 'string' && entry.contentHash.length > 0,
  ).length;
  const lastUpdatedAt = typeof src.fingerprints?.updatedAt === 'string' && src.fingerprints.updatedAt.trim()
    ? src.fingerprints.updatedAt.trim()
    : null;

  const guidesList = Array.isArray(src.guides?.guides) ? src.guides.guides : [];
  const publishedGuidesCount = guidesList.length;

  const topicsList = Array.isArray(src.backlog?.topics) ? src.backlog.topics : [];
  const pendingTopicsCount = topicsList.filter(t => t && t.status === 'pending').length;

  let publicSitemapUrlCount = 0;
  if (typeof src.sitemapXml === 'string') {
    const matches = src.sitemapXml.match(/<loc>/g);
    publicSitemapUrlCount = matches ? matches.length : 0;
  } else if (Array.isArray(src.sitemapUrls)) {
    publicSitemapUrlCount = src.sitemapUrls.length;
  }

  const packsList = Array.isArray(src.distributionDrafts?.packs) ? src.distributionDrafts.packs : [];
  const pendingPacksCount = packsList.filter(p => p && p.status === 'pending_owner_review').length;
  const coveredSlugs = new Set(packsList.map(p => p?.targetSlug).filter(Boolean));

  const publishedGuideSlugs = guidesList.map(g => g?.slug).filter(Boolean);
  const comparisonSlugs = isPlainRecord(src.verifiedVendorFacts) ? Object.keys(src.verifiedVendorFacts) : [];
  const allPublishedTargets = new Set([...publishedGuideSlugs, ...comparisonSlugs]);
  let uncoveredPublishedCount = 0;
  for (const slug of allPublishedTargets) {
    if (!coveredSlugs.has(slug)) uncoveredPublishedCount++;
  }

  const productsList = Array.isArray(src.products) ? src.products : [];
  const totalCatalogVendors = productsList.length;
  const outreachList = Array.isArray(src.outreachDrafts?.drafts) ? src.outreachDrafts.drafts : [];
  const pendingDraftsCount = outreachList.filter(d => d && d.status === 'pending_owner_review').length;
  const draftedVendorSlugs = new Set(outreachList.map(d => d?.vendorSlug).filter(Boolean));
  const remainingVendorsCount = productsList.filter(p => p?.id && !draftedVendorSlugs.has(p.id)).length;
  const activeAffiliateLinksCount = productsList.filter(
    p => p && p.affiliateUrl !== null && p.affiliateUrl !== undefined && p.affiliateUrl !== '',
  ).length;

  const policy = isPlainRecord(src.operatingPolicy) ? src.operatingPolicy : {};
  const monthlyBudgetINR = typeof policy.monthlyBudgetINR === 'number' ? policy.monthlyBudgetINR : 0;
  const affiliateActivationApproved = Boolean(policy.affiliateActivationApproved);

  const externalClicksLast7d = src.externalClicksLast7d !== undefined ? src.externalClicksLast7d : null;
  const externalImpressionsLast7d = src.externalImpressionsLast7d !== undefined ? src.externalImpressionsLast7d : null;

  return deepFreezeSnapshot({
    researchMonitor: {
      monitoredUrlCount,
      baselinedUrlCount,
      lastUpdatedAt,
    },
    seoBuilder: {
      publishedGuidesCount,
      pendingTopicsCount,
      publicSitemapUrlCount,
    },
    trafficDistribution: {
      pendingPacksCount,
      uncoveredPublishedCount,
    },
    vendorOutreach: {
      totalCatalogVendors,
      pendingDraftsCount,
      remainingVendorsCount,
      activeAffiliateLinksCount,
    },
    governanceAndRevenue: {
      monthlyBudgetINR,
      affiliateActivationApproved,
      verifiedRevenueMinorUnits: 0,
      externalClicksLast7d,
      externalImpressionsLast7d,
      estimatedAiSpendMinor: 0,
    },
  });
}

function isPlainRecord(val) {
  if (val === null || typeof val !== 'object' || Array.isArray(val) || types.isProxy(val)) return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

function validateSnapshot(rawSnapshot) {
  const snap = assertPlainObject(rawSnapshot, 'Invalid snapshot');
  assertAllowedKeys(snap, [
    'researchMonitor',
    'seoBuilder',
    'trafficDistribution',
    'vendorOutreach',
    'governanceAndRevenue',
  ], 'Invalid snapshot pillar keys');

  const rm = assertPlainObject(snap.researchMonitor, 'Invalid researchMonitor');
  assertAllowedKeys(rm, ['monitoredUrlCount', 'baselinedUrlCount', 'lastUpdatedAt'], 'Invalid researchMonitor keys');
  const monitoredUrlCount = assertNonNegativeInt(rm.monitoredUrlCount, 'monitoredUrlCount');
  const baselinedUrlCount = assertNonNegativeInt(rm.baselinedUrlCount, 'baselinedUrlCount');
  if (rm.lastUpdatedAt !== null && typeof rm.lastUpdatedAt !== 'string') {
    fail('Invalid researchMonitor.lastUpdatedAt');
  }

  const seo = assertPlainObject(snap.seoBuilder, 'Invalid seoBuilder');
  assertAllowedKeys(seo, ['publishedGuidesCount', 'pendingTopicsCount', 'publicSitemapUrlCount'], 'Invalid seoBuilder keys');
  const publishedGuidesCount = assertNonNegativeInt(seo.publishedGuidesCount, 'publishedGuidesCount');
  const pendingTopicsCount = assertNonNegativeInt(seo.pendingTopicsCount, 'pendingTopicsCount');
  const publicSitemapUrlCount = assertNonNegativeInt(seo.publicSitemapUrlCount, 'publicSitemapUrlCount');

  const td = assertPlainObject(snap.trafficDistribution, 'Invalid trafficDistribution');
  assertAllowedKeys(td, ['pendingPacksCount', 'uncoveredPublishedCount'], 'Invalid trafficDistribution keys');
  const pendingPacksCount = assertNonNegativeInt(td.pendingPacksCount, 'pendingPacksCount');
  const uncoveredPublishedCount = assertNonNegativeInt(td.uncoveredPublishedCount, 'uncoveredPublishedCount');

  const vo = assertPlainObject(snap.vendorOutreach, 'Invalid vendorOutreach');
  assertAllowedKeys(
    vo,
    ['totalCatalogVendors', 'pendingDraftsCount', 'remainingVendorsCount', 'activeAffiliateLinksCount'],
    'Invalid vendorOutreach keys',
  );
  const totalCatalogVendors = assertNonNegativeInt(vo.totalCatalogVendors, 'totalCatalogVendors');
  const pendingDraftsCount = assertNonNegativeInt(vo.pendingDraftsCount, 'pendingDraftsCount');
  const remainingVendorsCount = assertNonNegativeInt(vo.remainingVendorsCount, 'remainingVendorsCount');
  const activeAffiliateLinksCount = assertNonNegativeInt(vo.activeAffiliateLinksCount, 'activeAffiliateLinksCount');

  const gov = assertPlainObject(snap.governanceAndRevenue, 'Invalid governanceAndRevenue');
  assertAllowedKeys(
    gov,
    [
      'monthlyBudgetINR',
      'affiliateActivationApproved',
      'verifiedRevenueMinorUnits',
      'externalClicksLast7d',
      'externalImpressionsLast7d',
      'estimatedAiSpendMinor',
    ],
    'Invalid governanceAndRevenue keys',
  );
  if (gov.monthlyBudgetINR !== 0) {
    fail('monthlyBudgetINR must be strictly 0 under zero-budget policy');
  }
  if (typeof gov.affiliateActivationApproved !== 'boolean') {
    fail('affiliateActivationApproved must be boolean');
  }
  const verifiedRevenueMinorUnits = assertNonNegativeInt(gov.verifiedRevenueMinorUnits, 'verifiedRevenueMinorUnits');
  const externalClicksLast7d = assertNullableNonNegativeInt(gov.externalClicksLast7d, 'externalClicksLast7d');
  const externalImpressionsLast7d = assertNullableNonNegativeInt(gov.externalImpressionsLast7d, 'externalImpressionsLast7d');
  if (gov.estimatedAiSpendMinor !== 0) {
    fail('estimatedAiSpendMinor must be strictly 0');
  }

  return deepFreezeSnapshot({
    researchMonitor: { monitoredUrlCount, baselinedUrlCount, lastUpdatedAt: rm.lastUpdatedAt },
    seoBuilder: { publishedGuidesCount, pendingTopicsCount, publicSitemapUrlCount },
    trafficDistribution: { pendingPacksCount, uncoveredPublishedCount },
    vendorOutreach: { totalCatalogVendors, pendingDraftsCount, remainingVendorsCount, activeAffiliateLinksCount },
    governanceAndRevenue: {
      monthlyBudgetINR: 0,
      affiliateActivationApproved: gov.affiliateActivationApproved,
      verifiedRevenueMinorUnits,
      externalClicksLast7d,
      externalImpressionsLast7d,
      estimatedAiSpendMinor: 0,
    },
  });
}

/**
 * Validates and deeply freezes agent-ceo-briefings.json payloads.
 */
export function validateCeoBriefings(data, options = {}) {
  const opts = assertPlainObject(options, 'Invalid options');
  const today = opts.today !== undefined
    ? assertIsoDateNotFuture(opts.today, '9999-12-31')
    : new Date().toISOString().slice(0, 10);

  const root = assertPlainObject(data, 'Invalid CEO briefings root');
  assertAllowedKeys(root, ['schemaVersion', 'briefings'], 'Invalid root fields in agent-ceo-briefings');
  if (root.schemaVersion !== 1 || !Array.isArray(root.briefings)) {
    fail('Invalid schemaVersion or briefings array');
  }

  const seenIds = new Set();
  const normalizedBriefings = [];

  for (const raw of root.briefings) {
    const entry = assertPlainObject(raw, 'Invalid CEO briefing entry');
    assertAllowedKeys(entry, [
      'id',
      'generatedAt',
      'snapshot',
      'executiveSummary',
      'topPriorities',
      'aiSynthesized',
      'estimatedCostMinor',
    ], 'Invalid or undeclared CEO briefing fields');

    if (typeof entry.id !== 'string' || entry.id.length < 3 || entry.id.length > 80 || !ID_PATTERN.test(entry.id)) {
      fail('Invalid CEO briefing id');
    }
    if (seenIds.has(entry.id)) {
      fail(`Duplicate CEO briefing id: ${entry.id}`);
    }
    seenIds.add(entry.id);

    const generatedAt = assertIsoDateNotFuture(entry.generatedAt, today);
    const snapshot = validateSnapshot(entry.snapshot);
    const executiveSummary = assertSafePlainText(entry.executiveSummary, 60, 800, 'executiveSummary');

    if (!Array.isArray(entry.topPriorities) || entry.topPriorities.length !== 3) {
      fail('topPriorities must be an array of exactly 3 items');
    }
    const topPriorities = Object.freeze(
      entry.topPriorities.map((p, idx) => assertSafePlainText(p, 20, 240, `topPriorities[${idx}]`)),
    );

    if (typeof entry.aiSynthesized !== 'boolean') {
      fail('aiSynthesized must be a boolean');
    }
    if (entry.estimatedCostMinor !== 0) {
      fail('estimatedCostMinor must be strictly 0');
    }

    normalizedBriefings.push(Object.freeze({
      id: entry.id,
      generatedAt,
      snapshot,
      executiveSummary,
      topPriorities,
      aiSynthesized: entry.aiSynthesized,
      estimatedCostMinor: 0,
    }));
  }

  return Object.freeze({
    schemaVersion: 1,
    briefings: Object.freeze(normalizedBriefings),
  });
}

/**
 * Builds a grounded prompt containing ONLY exact snapshot metrics.
 * Avoids double-newlines and < / > characters for router.mjs validation.
 */
export function buildCeoBriefingPrompt(snapshot) {
  const compactSnapshot = JSON.stringify(snapshot);
  const schema = '{"executiveSummary":"2-4 plain-text sentences (60-800 chars, no HTML)","topPriorities":["priority 1 (20-240 chars)","priority 2 (20-240 chars)","priority 3 (20-240 chars)"]}';
  const parts = [
    'Synthesize a concise Weekly CEO Briefing for StackPilot AI using ONLY the verified fleet telemetry snapshot below.',
    `Verified Snapshot: ${compactSnapshot}`,
    'Rules: executiveSummary must be 60-800 chars plain text, 2-4 sentences, no HTML, no fabricated revenue or traffic claims, explicitly keep uncollected external analytics as null/uncollected. topPriorities must be an array of exactly 3 concise owner priorities for the week (each 20-240 chars, no HTML).',
    `Respond ONLY with valid JSON matching: ${schema}`,
  ];
  return parts.join(' | ').replace(/[<>\x00-\x1f\x7f]+/g, ' ').trim();
}

function parseAiSynthesisResponse(rawText) {
  const cleaned = stripCodeFences(rawText);
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    return { ok: false, error: `JSON parse error: ${err.message}` };
  }

  if (!isPlainRecord(parsed)) {
    return { ok: false, error: 'AI response is not a plain object' };
  }

  const rawSummary = parsed.executiveSummary ?? parsed.summary;
  const rawPriorities = parsed.topPriorities ?? parsed.priorities;

  if (typeof rawSummary !== 'string') {
    return { ok: false, error: 'Missing executiveSummary string' };
  }
  if (!Array.isArray(rawPriorities) || rawPriorities.length !== 3) {
    return { ok: false, error: 'topPriorities must be an array of 3 strings' };
  }

  const executiveSummary = trimToWordBoundary(rawSummary, 800);
  const topPriorities = rawPriorities.map(p => trimToWordBoundary(String(p ?? ''), 240));

  return { ok: true, executiveSummary, topPriorities };
}

/**
 * Main Agent 5 entrypoint.
 * Fail-closed: requires allowLiveBriefing === true and allowLiveAi === true.
 */
export async function runCeoBriefingAgent({
  inputs = {},
  existingBriefings = { schemaVersion: 1, briefings: [] },
  runAiPrompt,
  allowLiveBriefing = false,
  allowLiveAi = false,
  now = new Date(),
} = {}) {
  const executedAt = now instanceof Date ? now.toISOString() : String(now);
  const today = executedAt.slice(0, 10);
  const snapshot = collectCompanyOperationsSnapshot(inputs);

  if (allowLiveBriefing !== true) {
    return Object.freeze({
      ok: false,
      status: 'live_ceo_brief_disabled',
      reason: 'live_ceo_brief_disabled',
      snapshot,
      generatedBriefing: null,
      updatedBriefings: null,
      estimatedCostMinor: 0,
      executedAt,
    });
  }

  if (allowLiveAi !== true) {
    return Object.freeze({
      ok: false,
      status: 'live_ai_disabled',
      reason: 'live_ai_disabled',
      snapshot,
      generatedBriefing: null,
      updatedBriefings: null,
      estimatedCostMinor: 0,
      executedAt,
    });
  }

  if (typeof runAiPrompt !== 'function') {
    return Object.freeze({
      ok: false,
      status: 'ai_runner_missing',
      reason: 'ai_runner_missing',
      snapshot,
      generatedBriefing: null,
      updatedBriefings: null,
      estimatedCostMinor: 0,
      executedAt,
    });
  }

  const prompt = buildCeoBriefingPrompt(snapshot);
  const systemPrompt = 'You are the executive operations analyst for StackPilot AI. Synthesize ONLY from the provided JSON snapshot. Never fabricate revenue, clicks, or affiliate approvals. Respond ONLY with valid JSON.';

  let aiResponse;
  try {
    aiResponse = await runAiPrompt({
      taskClass: 'summarization',
      prompt,
      systemPrompt,
      requestedTokens: Math.ceil((prompt.length + systemPrompt.length) / 4) + 1024,
      maxOutputTokens: 1024,
      estimatedCostMinor: 0,
    });
  } catch (err) {
    return Object.freeze({
      ok: false,
      status: 'ai_error',
      reason: err instanceof Error ? err.message : String(err),
      snapshot,
      generatedBriefing: null,
      updatedBriefings: null,
      estimatedCostMinor: 0,
      executedAt,
    });
  }

  let rawText;
  if (typeof aiResponse === 'string') {
    rawText = aiResponse;
  } else if (aiResponse && typeof aiResponse === 'object') {
    if (aiResponse.ok === false) {
      return Object.freeze({
        ok: false,
        status: 'ai_error',
        reason: aiResponse.reason || 'live_ai_failed',
        snapshot,
        generatedBriefing: null,
        updatedBriefings: null,
        estimatedCostMinor: 0,
        executedAt,
      });
    }
    rawText = aiResponse.text;
  }

  const parsed = parseAiSynthesisResponse(rawText);
  if (!parsed.ok) {
    return Object.freeze({
      ok: false,
      status: 'invalid_ai_response',
      reason: parsed.error,
      snapshot,
      generatedBriefing: null,
      updatedBriefings: null,
      estimatedCostMinor: 0,
      executedAt,
    });
  }

  const briefingId = `ceo-briefing-${today}`;
  const candidateBriefing = {
    id: briefingId,
    generatedAt: today,
    snapshot,
    executiveSummary: parsed.executiveSummary,
    topPriorities: parsed.topPriorities,
    aiSynthesized: true,
    estimatedCostMinor: 0,
  };

  const priorList = Array.isArray(existingBriefings?.briefings) ? existingBriefings.briefings : [];
  const filteredPrior = priorList.filter(b => b && b.id !== briefingId);
  const candidateRoot = {
    schemaVersion: 1,
    briefings: [...filteredPrior, candidateBriefing],
  };

  let validatedRoot;
  try {
    validatedRoot = validateCeoBriefings(candidateRoot, { today });
  } catch (err) {
    return Object.freeze({
      ok: false,
      status: 'invalid_ai_response',
      reason: err instanceof Error ? err.message : String(err),
      snapshot,
      generatedBriefing: null,
      updatedBriefings: null,
      estimatedCostMinor: 0,
      executedAt,
    });
  }

  const generatedBriefing = validatedRoot.briefings.find(b => b.id === briefingId);

  return Object.freeze({
    ok: true,
    status: 'briefing_created',
    reason: null,
    snapshot,
    generatedBriefing,
    updatedBriefings: validatedRoot,
    estimatedCostMinor: 0,
    executedAt,
  });
}

/**
 * Formats a crisp 1-page Markdown Weekly CEO Briefing.
 */
export function formatCeoBriefingMarkdown(resultOrBriefing) {
  const briefing = resultOrBriefing?.generatedBriefing ?? resultOrBriefing;
  const snapshot = briefing?.snapshot ?? resultOrBriefing?.snapshot;
  const dateLabel = briefing?.generatedAt ?? new Date().toISOString().slice(0, 10);

  const rm = snapshot?.researchMonitor ?? {};
  const seo = snapshot?.seoBuilder ?? {};
  const td = snapshot?.trafficDistribution ?? {};
  const vo = snapshot?.vendorOutreach ?? {};
  const gov = snapshot?.governanceAndRevenue ?? {};

  const clicksDisplay = gov.externalClicksLast7d === null ? 'null (uncollected)' : String(gov.externalClicksLast7d);
  const impressionsDisplay = gov.externalImpressionsLast7d === null ? 'null (uncollected)' : String(gov.externalImpressionsLast7d);

  const lines = [
    `# StackPilot AI — Weekly CEO Briefing (${dateLabel})`,
    '',
    '## Fleet Operations Status (Agents 1–4)',
    '',
    '| Pillar / Agent | Key Metrics | Status |',
    '|---|---|---|',
    `| Agent 1: Research Monitor | Monitored URLs: ${rm.monitoredUrlCount ?? 0}, Baselined: ${rm.baselinedUrlCount ?? 0}, Updated: ${rm.lastUpdatedAt ?? 'null'} | Active |`,
    `| Agent 2: SEO Builder | Published Guides: ${seo.publishedGuidesCount ?? 0}, Pending Topics: ${seo.pendingTopicsCount ?? 0}, Sitemap URLs: ${seo.publicSitemapUrlCount ?? 0} | Active |`,
    `| Agent 3: Traffic & Distribution | Pending Packs: ${td.pendingPacksCount ?? 0}, Uncovered Targets: ${td.uncoveredPublishedCount ?? 0} | Owner Review Gate |`,
    `| Agent 4: Vendor Outreach | Catalog Vendors: ${vo.totalCatalogVendors ?? 0}, Pending Drafts: ${vo.pendingDraftsCount ?? 0}, Remaining: ${vo.remainingVendorsCount ?? 0}, Active Affiliate Links: ${vo.activeAffiliateLinksCount ?? 0} | Owner Review Gate |`,
    '',
    '## Governance, Budget & Revenue Truthfulness',
    '',
    `- **Monthly Budget (INR):** ${gov.monthlyBudgetINR ?? 0}`,
    `- **Affiliate Activation Approved:** ${gov.affiliateActivationApproved ?? false}`,
    `- **Verified Revenue (Minor Units):** ${gov.verifiedRevenueMinorUnits ?? 0}`,
    `- **External Clicks (7d):** ${clicksDisplay}`,
    `- **External Impressions (7d):** ${impressionsDisplay}`,
    `- **Estimated AI Spend (Minor Units):** ${gov.estimatedAiSpendMinor ?? 0}`,
    '',
  ];

  if (briefing?.executiveSummary) {
    lines.push('## Executive Summary', '', briefing.executiveSummary, '');
  }

  if (Array.isArray(briefing?.topPriorities) && briefing.topPriorities.length > 0) {
    lines.push('## Top 3 Weekly CEO Priorities', '');
    briefing.topPriorities.forEach((p, idx) => {
      lines.push(`${idx + 1}. ${p}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}
