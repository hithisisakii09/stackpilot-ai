import { createHash } from 'node:crypto';
import { SITE_ORIGIN } from '../../lib/site-origin.mjs';
import { validateVerifiedVendorFacts } from '../../lib/verified-vendor-facts.mjs';

const OFFICIAL_VENDOR_DOMAINS = Object.freeze([
  'hubspot.com',
  'pipedrive.com',
  'semrush.com',
  'ahrefs.com',
  'kinsta.com',
  'cloudways.com'
]);

const TRACKING_PARAMS = new Set(['ref', 'aff', 'affiliate', 'partner', 'via']);
const USER_AGENT = `StackPilot-Research-Monitor/1.0 (+${SITE_ORIGIN}/)`;
const DEFAULT_MAX_BYTES = 1_000_000;
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_REDIRECT_HOPS = 3;

function assertAllowedVendorUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0 || rawUrl.length > 2048) {
    throw new Error('Invalid vendor documentation URL');
  }
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid vendor documentation URL');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Vendor documentation URL must use HTTPS');
  }
  if (parsed.username || parsed.password || parsed.port) {
    throw new Error('Vendor documentation URL must not embed credentials or non-standard port');
  }
  const host = parsed.hostname.toLowerCase();
  const allowed = OFFICIAL_VENDOR_DOMAINS.some(d => host === d || host.endsWith('.' + d));
  if (!allowed) {
    throw new Error(`Vendor URL domain is not allowlisted: ${host}`);
  }
  for (const key of parsed.searchParams.keys()) {
    const lower = key.toLowerCase();
    if (TRACKING_PARAMS.has(lower) || lower.startsWith('utm_')) {
      throw new Error('Vendor URL must not include tracking or referral query parameters');
    }
  }
  return parsed.href;
}

/**
 * Extracts, validates, deduplicates, and sorts all monitored official vendor URLs from verified-vendor-facts.json.
 */
export function collectMonitoredVendorUrls(verifiedFacts) {
  const validated = validateVerifiedVendorFacts(verifiedFacts, { today: '9999-12-31' });
  const byUrl = new Map();

  for (const [slug, pair] of Object.entries(validated)) {
    for (const row of pair.rows) {
      for (const vendorKey of ['first', 'second']) {
        const entry = row[vendorKey];
        const normalizedUrl = assertAllowedVendorUrl(entry.sourceUrl);
        if (!byUrl.has(normalizedUrl)) {
          byUrl.set(normalizedUrl, []);
        }
        byUrl.get(normalizedUrl).push(Object.freeze({
          slug,
          vendorKey,
          dimension: row.dimension,
          summary: entry.summary,
          sourceLabel: entry.sourceLabel
        }));
      }
    }
  }

  return Object.freeze(
    [...byUrl.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([url, references]) => Object.freeze({ url, references: Object.freeze(references) }))
  );
}

function decodeBasicEntities(text) {
  return text.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (full, dec, hex, named) => {
    if (dec) {
      const code = Number.parseInt(dec, 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ' ';
    }
    if (hex) {
      const code = Number.parseInt(hex, 16);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ' ';
    }
    const map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
    return map[String(named).toLowerCase()] ?? full;
  });
}

/**
 * Strips scripts, styles, SVGs, comments, and HTML tags to deterministic normalized plain text.
 */
export function normalizeDocumentText(html) {
  if (typeof html !== 'string') return '';
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeBasicEntities(stripped).replace(/\s+/g, ' ').trim();
}

/**
 * Computes deterministic SHA-256 hex digest and bounded excerpt for normalized document text.
 */
export function computeDocumentFingerprint(html, maxChars = 6000) {
  const normalized = normalizeDocumentText(html);
  const contentHash = createHash('sha256').update(normalized, 'utf8').digest('hex');
  const excerpt = normalized.slice(0, maxChars);
  return Object.freeze({
    contentHash,
    excerpt,
    textLength: normalized.length
  });
}

/**
 * Safely fetches an official vendor documentation page with SSRF validation, timeout, and size cap.
 */
export async function fetchVendorDocument({
  url,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBytes = DEFAULT_MAX_BYTES
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('Missing fetch implementation');
  }

  let currentUrl = assertAllowedVendorUrl(url);
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    let response;
    try {
      response = await fetchImpl(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1'
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch (err) {
      const errorCode = err && typeof err === 'object' && (err.name === 'AbortError' || err.name === 'TimeoutError')
        ? 'timeout'
        : 'network_error';
      return Object.freeze({
        ok: false,
        url,
        httpStatus: null,
        contentHash: null,
        excerpt: null,
        errorCode
      });
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers?.get?.('location');
      if (!location || hop === MAX_REDIRECT_HOPS) {
        return Object.freeze({
          ok: false,
          url,
          httpStatus: response.status,
          contentHash: null,
          excerpt: null,
          errorCode: 'redirect_blocked'
        });
      }
      try {
        const resolved = new URL(location, currentUrl).href;
        currentUrl = assertAllowedVendorUrl(resolved);
        continue;
      } catch {
        return Object.freeze({
          ok: false,
          url,
          httpStatus: response.status,
          contentHash: null,
          excerpt: null,
          errorCode: 'redirect_blocked'
        });
      }
    }

    if (!response.ok) {
      return Object.freeze({
        ok: false,
        url,
        httpStatus: Number.isInteger(response.status) ? response.status : null,
        contentHash: null,
        excerpt: null,
        errorCode: `http_${response.status}`
      });
    }

    const rawHtml = await response.text();
    if (Buffer.byteLength(rawHtml, 'utf8') > maxBytes) {
      return Object.freeze({
        ok: false,
        url,
        httpStatus: response.status,
        contentHash: null,
        excerpt: null,
        errorCode: 'response_too_large'
      });
    }

    const fp = computeDocumentFingerprint(rawHtml);
    return Object.freeze({
      ok: true,
      url,
      httpStatus: response.status,
      contentHash: fp.contentHash,
      excerpt: fp.excerpt,
      errorCode: null
    });
  }

  return Object.freeze({
    ok: false,
    url,
    httpStatus: null,
    contentHash: null,
    excerpt: null,
    errorCode: 'redirect_blocked'
  });
}

function parseAiExtraction(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return Object.freeze({
      meaningfulChange: true,
      summary: 'Content hash changed; AI extraction returned empty output.',
      affectedRows: Object.freeze([]),
      recommendedAction: 'Review vendor documentation URL manually.'
    });
  }
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(cleaned);
    return Object.freeze({
      meaningfulChange: Boolean(parsed.meaningfulChange),
      summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : 'Content changed.',
      affectedRows: Object.freeze(Array.isArray(parsed.affectedRows) ? parsed.affectedRows.map(String) : []),
      recommendedAction: typeof parsed.recommendedAction === 'string' && parsed.recommendedAction.trim()
        ? parsed.recommendedAction.trim()
        : 'Review updated documentation and refresh verified-vendor-facts.json if needed.'
    });
  } catch {
    return Object.freeze({
      meaningfulChange: true,
      summary: cleaned.slice(0, 300),
      affectedRows: Object.freeze([]),
      recommendedAction: 'Review updated documentation and refresh verified-vendor-facts.json if needed.'
    });
  }
}

/**
 * Executes the daily vendor documentation research monitor with fail-closed gates and AI drift analysis.
 */
export async function runResearchMonitor({
  verifiedFacts,
  fingerprints = { schemaVersion: 1, updatedAt: null, urls: {} },
  fetchImpl = globalThis.fetch,
  runAiPrompt = null,
  allowLiveMonitor = false,
  allowLiveAi = false,
  now = new Date().toISOString()
} = {}) {
  if (allowLiveMonitor !== true) {
    return Object.freeze({
      ok: false,
      reason: 'live_monitor_disabled',
      updatedAt: now,
      counts: Object.freeze({ total: 0, unchanged: 0, initialBaseline: 0, changed: 0, fetchError: 0 }),
      results: Object.freeze([]),
      updatedFingerprints: fingerprints,
      estimatedCostMinor: 0
    });
  }

  const monitored = collectMonitoredVendorUrls(verifiedFacts);
  const existingUrls = fingerprints?.urls && typeof fingerprints.urls === 'object' ? fingerprints.urls : {};
  const nextUrls = {};
  const results = [];
  const counts = { total: monitored.length, unchanged: 0, initialBaseline: 0, changed: 0, fetchError: 0 };

  for (const entry of monitored) {
    const prior = existingUrls[entry.url] ?? null;
    const fetched = await fetchVendorDocument({ url: entry.url, fetchImpl });

    if (!fetched.ok) {
      counts.fetchError++;
      if (prior) {
        nextUrls[entry.url] = { ...prior };
      }
      results.push(Object.freeze({
        url: entry.url,
        status: 'fetch_error',
        httpStatus: fetched.httpStatus,
        errorCode: fetched.errorCode,
        contentHash: prior?.contentHash ?? null,
        aiAnalysis: null,
        references: entry.references
      }));
      continue;
    }

    nextUrls[entry.url] = {
      contentHash: fetched.contentHash,
      lastCheckedAt: now
    };

    if (!prior || !prior.contentHash) {
      counts.initialBaseline++;
      results.push(Object.freeze({
        url: entry.url,
        status: 'initial_baseline',
        httpStatus: fetched.httpStatus,
        errorCode: null,
        contentHash: fetched.contentHash,
        aiAnalysis: null,
        references: entry.references
      }));
      continue;
    }

    if (prior.contentHash === fetched.contentHash) {
      counts.unchanged++;
      results.push(Object.freeze({
        url: entry.url,
        status: 'unchanged',
        httpStatus: fetched.httpStatus,
        errorCode: null,
        contentHash: fetched.contentHash,
        aiAnalysis: null,
        references: entry.references
      }));
      continue;
    }

    counts.changed++;
    let aiAnalysis = null;
    if (allowLiveAi === true && typeof runAiPrompt === 'function') {
      const prompt = [
        `Monitored URL: ${entry.url}`,
        'Existing verified-vendor-facts rows referencing this URL:',
        JSON.stringify(entry.references),
        'New normalized page excerpt:',
        fetched.excerpt,
        'Return strict JSON only: {"meaningfulChange": boolean, "summary": string, "affectedRows": string[], "recommendedAction": string}'
      ].join(' | ').replace(/[<>\x00-\x1f\x7f]+/g, ' ').trim();

      const aiResult = await runAiPrompt({
        taskClass: 'extraction',
        prompt,
        systemPrompt: 'You compare existing verified vendor documentation summaries against newly fetched page text. Return strict JSON only.',
        requestedTokens: 2048,
        maxOutputTokens: 400
      });

      aiAnalysis = aiResult?.ok
        ? parseAiExtraction(aiResult.text)
        : Object.freeze({
          meaningfulChange: true,
          summary: `Content hash changed; AI analysis unavailable (${aiResult?.reason ?? 'unknown'}).`,
          affectedRows: Object.freeze(entry.references.map(r => r.dimension)),
          recommendedAction: 'Review updated documentation manually.'
        });
    }

    results.push(Object.freeze({
      url: entry.url,
      status: 'changed',
      httpStatus: fetched.httpStatus,
      errorCode: null,
      contentHash: fetched.contentHash,
      aiAnalysis,
      references: entry.references
    }));
  }

  const sortedUrls = Object.fromEntries(
    Object.entries(nextUrls).sort(([a], [b]) => a.localeCompare(b, 'en'))
  );

  return Object.freeze({
    ok: true,
    reason: null,
    updatedAt: now,
    counts: Object.freeze(counts),
    results: Object.freeze(results),
    updatedFingerprints: Object.freeze({
      schemaVersion: 1,
      updatedAt: now,
      urls: sortedUrls
    }),
    estimatedCostMinor: 0
  });
}

/**
 * Formats a Markdown drift report for GitHub Step Summary and PR bodies.
 */
export function formatMonitorReportMarkdown(result) {
  const lines = [
    '# Agent 1 — Daily Vendor Documentation & Pricing Monitor',
    '',
    `- **Checked at:** ${result.updatedAt ?? 'unknown'}`,
    `- **Monitored URLs:** ${result.counts?.total ?? 0}`,
    `- **Unchanged:** ${result.counts?.unchanged ?? 0}`,
    `- **Initial baselines:** ${result.counts?.initialBaseline ?? 0}`,
    `- **Changed:** ${result.counts?.changed ?? 0}`,
    `- **Fetch warnings:** ${result.counts?.fetchError ?? 0}`,
    `- **estimatedCostMinor:** ${result.estimatedCostMinor ?? 0}`,
    ''
  ];

  const changed = (result.results ?? []).filter(r => r.status === 'changed');
  if (changed.length > 0) {
    lines.push('## Changed Documentation URLs', '');
    for (const item of changed) {
      lines.push(`### ${item.url}`);
      if (item.aiAnalysis) {
        lines.push(`- **Meaningful change:** ${item.aiAnalysis.meaningfulChange}`);
        lines.push(`- **Summary:** ${item.aiAnalysis.summary}`);
        lines.push(`- **Affected rows:** ${item.aiAnalysis.affectedRows.join(', ') || 'None specified'}`);
        lines.push(`- **Recommended action:** ${item.aiAnalysis.recommendedAction}`);
      } else {
        lines.push('- **Summary:** Content SHA-256 changed (AI analysis skipped).');
      }
      lines.push('');
    }
  }

  const errors = (result.results ?? []).filter(r => r.status === 'fetch_error');
  if (errors.length > 0) {
    lines.push('## Fetch Warnings', '');
    for (const err of errors) {
      lines.push(`- ${err.url} — \`${err.errorCode}\` (HTTP ${err.httpStatus ?? 'null'})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
