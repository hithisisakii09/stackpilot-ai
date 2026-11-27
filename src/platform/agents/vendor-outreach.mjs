import { types } from 'node:util';
import { SITE_ORIGIN } from '../../lib/site-origin.mjs';
import { validateVerifiedVendorFacts } from '../../lib/verified-vendor-facts.mjs';

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const SPAM_SUBJECT_PATTERN = /\b(?:free money|guaranteed|urgent|act now|100% commission|click here|limited time)\b/i;
const TRACKING_PARAM_PATTERN = /^(?:ref|aff|affiliate|utm_[a-z0-9_]+|partner_id|click_id|subid|tag)$/i;
const SECRET_PATTERNS = [
  /(?:sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,})/i,
  /\bBearer\s+[A-Za-z0-9._-]{10,}/i,
  /-----BEGIN\s+(?:[A-Z0-9]+\s+)?PRIVATE KEY-----/i
];

const VENDOR_COMPARE_MAP = Object.freeze({
  hubspot: 'hubspot-vs-pipedrive',
  pipedrive: 'hubspot-vs-pipedrive',
  semrush: 'semrush-vs-ahrefs',
  ahrefs: 'semrush-vs-ahrefs',
  kinsta: 'kinsta-vs-cloudways',
  cloudways: 'kinsta-vs-cloudways'
});

function fail(message = 'Invalid vendor outreach drafts payload') {
  throw new Error(message);
}

function assertPlainObject(value, message = 'Invalid vendor outreach drafts payload') {
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

function assertSafePlainText(value, minLen, maxLen, label) {
  if (typeof value !== 'string') fail(`Invalid ${label}: expected string`);
  const trimmed = value.trim();
  if (trimmed.length < minLen || trimmed.length > maxLen) {
    fail(`Invalid ${label}: length out of bounds`);
  }
  if (/[<>]/.test(trimmed)) {
    fail(`Unsafe HTML characters not permitted in ${label}`);
  }
  if (EMAIL_PATTERN.test(trimmed)) {
    fail(`Fabricated email addresses not permitted in ${label}`);
  }
  if (SECRET_PATTERNS.some(p => p.test(trimmed))) {
    fail(`Secret-like material not permitted in ${label}`);
  }
  return trimmed;
}

function assertIsoDateNotFuture(value, today) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value + 'T00:00:00.000Z').toISOString().slice(0, 10) !== value
  ) {
    fail('Invalid draftedAt ISO date');
  }
  if (value > today) {
    fail('draftedAt date cannot be in the future');
  }
  return value;
}

function assertSafeHttpsUrl(rawUrl, allowedSet, label) {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0 || rawUrl.length > 2048) {
    fail(`Invalid ${label}: expected HTTPS URL`);
  }
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    fail(`Invalid ${label}: malformed URL`);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    fail(`Invalid ${label}: must be clean HTTPS URL`);
  }
  for (const key of parsed.searchParams.keys()) {
    if (TRACKING_PARAM_PATTERN.test(key)) {
      fail(`Tracking parameters not permitted in ${label}`);
    }
  }
  if (allowedSet && !allowedSet.has(rawUrl)) {
    fail(`URL not in allowlist for ${label}: ${rawUrl}`);
  }
  return rawUrl;
}

/**
 * Collects all verified official URLs for a set of vendor candidates and verified vendor facts.
 */
export function collectAllowedOfficialUrls(candidates, verifiedVendorFacts) {
  const allowed = new Set();
  if (Array.isArray(candidates)) {
    for (const c of candidates) {
      if (typeof c?.programUrl === 'string' && c.programUrl.startsWith('https://')) {
        allowed.add(c.programUrl);
      }
    }
  }
  const validated = validateVerifiedVendorFacts(verifiedVendorFacts, { today: '9999-12-31' });
  for (const pair of Object.values(validated)) {
    for (const row of pair.rows) {
      allowed.add(row.first.sourceUrl);
      allowed.add(row.second.sourceUrl);
    }
  }
  return allowed;
}

/**
 * Validates and deeply freezes vendor outreach drafts with strict fail-closed anti-spam and grounding checks.
 */
export function validateOutreachDrafts(data, allowedVendorSlugs, allowedOfficialUrls, options = {}) {
  const opts = assertPlainObject(options, 'Invalid options');
  const today = opts.today !== undefined
    ? assertIsoDateNotFuture(opts.today, '9999-12-31')
    : new Date().toISOString().slice(0, 10);
  const siteOrigin = typeof opts.siteOrigin === 'string' && opts.siteOrigin.startsWith('https://')
    ? opts.siteOrigin.replace(/\/+$/, '')
    : SITE_ORIGIN;

  const root = assertPlainObject(data, 'Invalid outreach drafts root');
  assertAllowedKeys(root, ['schemaVersion', 'drafts'], 'Invalid root fields in agent-vendor-outreach-drafts');
  if (root.schemaVersion !== 1 || !Array.isArray(root.drafts)) {
    fail('Invalid schemaVersion or drafts array');
  }

  const slugSet = new Set(allowedVendorSlugs);
  const urlSet = new Set(allowedOfficialUrls);
  const seenIds = new Set();
  const normalizedDrafts = [];

  for (const rawDraft of root.drafts) {
    const draft = assertPlainObject(rawDraft, 'Invalid outreach draft entry');
    assertAllowedKeys(draft, [
      'id',
      'vendorSlug',
      'outreachType',
      'status',
      'draftedAt',
      'recipientTarget',
      'subject',
      'body',
      'referencedOfficialUrls',
      'liveSiteUrls',
      'ownerApprovalRequired'
    ], 'Invalid or undeclared outreach draft fields');

    if (typeof draft.id !== 'string' || draft.id.length < 3 || draft.id.length > 80 || !ID_PATTERN.test(draft.id)) {
      fail('Invalid outreach draft id');
    }
    if (seenIds.has(draft.id)) {
      fail(`Duplicate outreach draft id: ${draft.id}`);
    }
    seenIds.add(draft.id);

    if (typeof draft.vendorSlug !== 'string' || !slugSet.has(draft.vendorSlug)) {
      fail(`Unknown vendorSlug: ${String(draft.vendorSlug)}`);
    }

    if (!['partner_program_inquiry', 'documentation_verification'].includes(draft.outreachType)) {
      fail(`Invalid outreachType: ${String(draft.outreachType)}`);
    }

    if (draft.status !== 'pending_owner_review') {
      fail(`Outreach draft status must be pending_owner_review, got: ${String(draft.status)}`);
    }

    if (draft.ownerApprovalRequired !== true) {
      fail('ownerApprovalRequired must be strictly true');
    }

    const draftedAt = assertIsoDateNotFuture(draft.draftedAt, today);
    const recipientTarget = assertSafePlainText(draft.recipientTarget, 5, 140, 'recipientTarget');
    const subject = assertSafePlainText(draft.subject, 10, 140, 'subject');
    if (SPAM_SUBJECT_PATTERN.test(subject)) {
      fail('Spammy or clickbait phrasing not permitted in subject');
    }

    const body = assertSafePlainText(draft.body, 120, 2500, 'body');
    if (!body.includes(siteOrigin)) {
      fail(`Outreach body must cite live site URL (${siteOrigin})`);
    }

    if (!Array.isArray(draft.referencedOfficialUrls) || draft.referencedOfficialUrls.length === 0) {
      fail('referencedOfficialUrls must be a non-empty array');
    }
    const referencedOfficialUrls = Object.freeze(
      [...new Set(draft.referencedOfficialUrls.map(u => assertSafeHttpsUrl(u, urlSet, 'referencedOfficialUrls')))]
    );

    if (!Array.isArray(draft.liveSiteUrls) || draft.liveSiteUrls.length === 0) {
      fail('liveSiteUrls must be a non-empty array');
    }
    const compareSlug = VENDOR_COMPARE_MAP[draft.vendorSlug];
    const allowedLiveUrls = new Set([
      `${siteOrigin}/`,
      `${siteOrigin}/software/${draft.vendorSlug}/`,
      ...(compareSlug ? [`${siteOrigin}/compare/${compareSlug}/`] : [])
    ]);
    const liveSiteUrls = Object.freeze(
      [...new Set(draft.liveSiteUrls.map(u => assertSafeHttpsUrl(u, allowedLiveUrls, 'liveSiteUrls')))]
    );

    normalizedDrafts.push(Object.freeze({
      id: draft.id,
      vendorSlug: draft.vendorSlug,
      outreachType: draft.outreachType,
      status: 'pending_owner_review',
      draftedAt,
      recipientTarget,
      subject,
      body,
      referencedOfficialUrls,
      liveSiteUrls,
      ownerApprovalRequired: true
    }));
  }

  return Object.freeze({
    schemaVersion: 1,
    drafts: Object.freeze(normalizedDrafts)
  });
}

/**
 * Selects the next vendor without a pending_owner_review draft in deterministic alphabetical order.
 */
export function selectNextVendorForOutreach({ candidates = [], existingDrafts = { drafts: [] }, preferredVendor = null } = {}) {
  const list = Array.isArray(candidates) ? [...candidates] : [];
  list.sort((a, b) => String(a?.productId ?? '').localeCompare(String(b?.productId ?? ''), 'en'));

  const pendingVendors = new Set(
    (existingDrafts?.drafts ?? [])
      .filter(d => d && d.status === 'pending_owner_review')
      .map(d => d.vendorSlug)
  );

  if (typeof preferredVendor === 'string' && preferredVendor.trim()) {
    const target = preferredVendor.trim().toLowerCase();
    const match = list.find(c => c?.productId === target);
    if (match && !pendingVendors.has(match.productId)) {
      return match;
    }
    return null;
  }

  return list.find(c => c?.productId && !pendingVendors.has(c.productId)) ?? null;
}

/**
 * Extracts verified facts rows for a given vendorSlug from verified-vendor-facts.json.
 */
export function extractVendorFactsRows(vendorSlug, verifiedVendorFacts) {
  const validated = validateVerifiedVendorFacts(verifiedVendorFacts, { today: '9999-12-31' });
  const compareSlug = VENDOR_COMPARE_MAP[vendorSlug];
  if (!compareSlug || !Object.hasOwn(validated, compareSlug)) {
    return [];
  }
  const pair = validated[compareSlug];
  const isFirst = compareSlug.startsWith(`${vendorSlug}-vs-`);
  return pair.rows.map(row => {
    const side = isFirst ? row.first : row.second;
    return {
      dimension: row.dimension,
      summary: side.summary,
      sourceLabel: side.sourceLabel,
      sourceUrl: side.sourceUrl
    };
  });
}

/**
 * Builds a strictly grounded single-line prompt for drafting a truthful vendor outreach email.
 */
export function buildVendorOutreachPrompt({ vendor, verifiedFactsRows = [], siteOrigin = SITE_ORIGIN } = {}) {
  const slug = vendor.productId;
  const compareSlug = VENDOR_COMPARE_MAP[slug];
  const liveSiteUrls = [
    `${siteOrigin}/software/${slug}/`,
    ...(compareSlug ? [`${siteOrigin}/compare/${compareSlug}/`] : [])
  ];
  const officialUrls = [
    ...(vendor.programUrl ? [vendor.programUrl] : []),
    ...verifiedFactsRows.map(r => r.sourceUrl)
  ];

  return [
    `Draft a truthful, concise vendor outreach email for SaaS vendor "${slug}".`,
    `Outreach goal: ${vendor.programUrl ? 'partner_program_inquiry (ask about official partner/affiliate terms and confirm documentation accuracy)' : 'documentation_verification (confirm documentation accuracy and ask if an official partner program exists)'}.`,
    `Live ToolChoice Lab pages to cite: ${liveSiteUrls.join(', ')} (root: ${siteOrigin}/).`,
    `Allowed official vendor URLs: ${[...new Set(officialUrls)].join(', ')}.`,
    `Verified vendor facts: ${JSON.stringify(verifiedFactsRows)}.`,
    'STRICT HONESTY RULES:',
    '1. Do NOT invent any personal email address or use any @ email address.',
    '2. Do NOT fabricate traffic numbers, visitor counts, or revenue figures.',
    '3. Do NOT claim any existing partnership, approval, or active affiliate tracking.',
    '4. Cite ONLY the live ToolChoice Lab URLs and exact Allowed official vendor URLs above.',
    '5. No HTML tags (angle brackets) and no spammy phrasing.',
    'Return STRICT JSON ONLY matching this schema: {"subject":"10-140 char plain text","body":"120-2500 char plain text citing ToolChoice Lab URL","recipientTarget":"Official Partner Program Portal / Vendor Partnerships Team","referencedOfficialUrls":["https://..."]}.'
  ].join(' | ').replace(/[<>\x00-\x1f\x7f]+/g, ' ').trim();
}

/**
 * Parses AI JSON (normalizing minor field aliases) and validates strictly via validateOutreachDrafts.
 */
export function parseAndValidateOutreachResponse(rawText, {
  vendor,
  verifiedFactsRows = [],
  allowedVendorSlugs,
  allowedOfficialUrls,
  siteOrigin = SITE_ORIGIN,
  todayIso
} = {}) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('AI returned empty outreach draft payload');
  }
  const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned);

  const slug = vendor.productId;
  const compareSlug = VENDOR_COMPARE_MAP[slug];
  const liveSiteUrls = [
    `${siteOrigin}/software/${slug}/`,
    ...(compareSlug ? [`${siteOrigin}/compare/${compareSlug}/`] : [])
  ];

  const subject = parsed.subject ?? parsed.emailSubject ?? parsed.title;
  const body = parsed.body ?? parsed.emailBody ?? parsed.content;
  const recipientTarget = typeof (parsed.recipientTarget ?? parsed.recipient) === 'string' && (parsed.recipientTarget ?? parsed.recipient).trim()
    ? (parsed.recipientTarget ?? parsed.recipient).trim()
    : 'Official Partner Program Portal / Vendor Partnerships Team';

  let rawUrls = parsed.referencedOfficialUrls ?? parsed.urls ?? parsed.officialUrls;
  if (!Array.isArray(rawUrls) || rawUrls.length === 0) {
    rawUrls = vendor.programUrl
      ? [vendor.programUrl]
      : verifiedFactsRows.slice(0, 1).map(r => r.sourceUrl);
  }
  const referencedOfficialUrls = rawUrls.map(u => (typeof u === 'string' ? u.trim() : u));

  const candidateDraft = {
    id: `outreach-${slug}-${todayIso}`,
    vendorSlug: slug,
    outreachType: vendor.programUrl ? 'partner_program_inquiry' : 'documentation_verification',
    status: 'pending_owner_review',
    draftedAt: todayIso,
    recipientTarget,
    subject,
    body,
    referencedOfficialUrls,
    liveSiteUrls,
    ownerApprovalRequired: true
  };

  const validated = validateOutreachDrafts(
    { schemaVersion: 1, drafts: [candidateDraft] },
    allowedVendorSlugs,
    allowedOfficialUrls,
    { today: todayIso, siteOrigin }
  );
  return validated.drafts[0];
}

/**
 * Runs Agent 4 (Vendor Partnerships & Outreach Drafts) fail-closed with drafts-only output.
 */
export async function runVendorOutreachAgent({
  candidates,
  existingDrafts,
  verifiedVendorFacts,
  siteOrigin = SITE_ORIGIN,
  preferredVendor = null,
  runAiPrompt = null,
  allowLiveOutreach = false,
  allowLiveAi = false,
  now = new Date().toISOString()
} = {}) {
  const todayIso = typeof now === 'string' && /^\d{4}-\d{2}-\d{2}/.test(now)
    ? now.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  if (allowLiveOutreach !== true) {
    return Object.freeze({
      ok: false,
      reason: 'live_outreach_disabled',
      status: 'blocked',
      generatedDraft: null,
      updatedDrafts: existingDrafts,
      estimatedCostMinor: 0,
      executedAt: now
    });
  }

  const vendor = selectNextVendorForOutreach({ candidates, existingDrafts, preferredVendor });
  if (!vendor) {
    return Object.freeze({
      ok: true,
      reason: null,
      status: 'all_vendors_drafted',
      generatedDraft: null,
      updatedDrafts: existingDrafts,
      estimatedCostMinor: 0,
      executedAt: now
    });
  }

  if (allowLiveAi !== true || typeof runAiPrompt !== 'function') {
    return Object.freeze({
      ok: false,
      reason: 'live_ai_disabled',
      status: 'blocked',
      generatedDraft: null,
      updatedDrafts: existingDrafts,
      estimatedCostMinor: 0,
      executedAt: now
    });
  }

  const allowedVendorSlugs = candidates.map(c => c.productId);
  const allowedOfficialUrls = collectAllowedOfficialUrls(candidates, verifiedVendorFacts);
  const verifiedFactsRows = extractVendorFactsRows(vendor.productId, verifiedVendorFacts);
  const prompt = buildVendorOutreachPrompt({ vendor, verifiedFactsRows, siteOrigin });

  const aiResult = await runAiPrompt({
    taskClass: 'editorial_draft',
    prompt,
    systemPrompt: 'You are an objective B2B directory publisher drafting truthful vendor partnership outreach. Output strict JSON only.',
    requestedTokens: 2048,
    maxOutputTokens: 1536
  });

  if (!aiResult?.ok) {
    return Object.freeze({
      ok: false,
      reason: aiResult?.reason ?? 'ai_generation_failed',
      status: 'failed',
      generatedDraft: null,
      updatedDrafts: existingDrafts,
      estimatedCostMinor: 0,
      executedAt: now
    });
  }

  const newDraft = parseAndValidateOutreachResponse(aiResult.text, {
    vendor,
    verifiedFactsRows,
    allowedVendorSlugs,
    allowedOfficialUrls,
    siteOrigin,
    todayIso
  });

  const priorDrafts = Array.isArray(existingDrafts?.drafts) ? existingDrafts.drafts : [];
  const nextDrafts = validateOutreachDrafts(
    { schemaVersion: 1, drafts: [...priorDrafts, newDraft] },
    allowedVendorSlugs,
    allowedOfficialUrls,
    { today: todayIso, siteOrigin }
  );

  return Object.freeze({
    ok: true,
    reason: null,
    status: 'draft_created',
    provider: aiResult.provider ?? null,
    selectedModel: aiResult.selectedModel ?? null,
    generatedDraft: newDraft,
    updatedDrafts: nextDrafts,
    estimatedCostMinor: 0,
    executedAt: now
  });
}

/**
 * Formats a ready-to-copy Markdown report for GitHub Actions Summary & PR review.
 */
export function formatOutreachReportMarkdown(result) {
  const lines = [
    '# Agent 4 — Vendor Partnerships & Outreach Drafts',
    '',
    `- **Executed at:** ${result.executedAt ?? 'unknown'}`,
    `- **Status:** ${result.status}`,
    `- **estimatedCostMinor:** ${result.estimatedCostMinor ?? 0}`,
    ''
  ];

  if (result.generatedDraft) {
    const d = result.generatedDraft;
    lines.push(
      '## Pending Owner Review Draft',
      '',
      `- **Draft ID:** \`${d.id}\``,
      `- **Vendor:** \`${d.vendorSlug}\``,
      `- **Status:** \`${d.status}\` (ownerApprovalRequired: \`${d.ownerApprovalRequired}\`)`,
      `- **Outreach Type:** \`${d.outreachType}\``,
      `- **Provider / Model:** ${result.provider ?? 'unknown'} / ${result.selectedModel ?? 'unknown'}`,
      `- **Recipient Target:** ${d.recipientTarget}`,
      `- **Subject:** ${d.subject}`,
      `- **Official URLs:** ${d.referencedOfficialUrls.join(', ')}`,
      `- **Live Site URLs:** ${d.liveSiteUrls.join(', ')}`,
      '',
      '### Copy-Paste Email Body',
      '',
      '```text',
      d.body,
      '```',
      ''
    );
  } else if (result.reason) {
    lines.push(`- **Reason:** \`${result.reason}\``, '');
  }

  return lines.join('\n');
}
