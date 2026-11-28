/**
 * Phase 19 — Autonomous YouTube Shorts Generator & Uploader
 *
 * Offline-first, fail-closed storyboard builder, Executive Slate 1080x1920
 * slide renderer, and zero-dependency YouTube Data API v3 resumable uploader.
 * Zero new npm dependencies.
 */

import { createHash } from 'node:crypto';
import { types } from 'node:util';
import { SITE_ORIGIN } from '../../lib/site-origin.mjs';
import { redactSecrets } from '../ai/router.mjs';

const ALLOWED_OAUTH_URL = 'https://oauth2.googleapis.com/token';
const ALLOWED_UPLOAD_INIT_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const ALLOWED_PRIVACY_STATUSES = new Set(['private', 'unlisted', 'public']);
const TRACKING_PARAMS = new Set(['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'aff', 'affiliate', 'partner', 'click_id']);
const FABRICATED_CLAIM_RE = /\b(guaranteed\s+roi|100%\s+free\s+forever|#1\s+best|million\s+users|verified\s+traffic|monthly\s+visitors)\b/i;

function isPlainObject(val) {
  if (val === null || typeof val !== 'object' || Array.isArray(val) || types.isProxy(val)) {
    return false;
  }
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

function assertPlainObject(val, label) {
  if (!isPlainObject(val)) {
    throw new Error(`${label} must be a plain object (no Proxy or prototype)`);
  }
}

function hasHtml(str) {
  return /[<>]/.test(str);
}

function hasEmail(str) {
  return /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/.test(str);
}

function hasTrackingParamsInText(str) {
  const urlMatches = str.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  for (const raw of urlMatches) {
    try {
      const u = new URL(raw);
      for (const key of TRACKING_PARAMS) {
        if (u.searchParams.has(key)) return true;
      }
    } catch {
      // Ignore malformed URL fragments
    }
  }
  return /[?&](?:utm_source|utm_medium|utm_campaign|ref|aff|affiliate|partner|click_id)=/i.test(str);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function trimToWordBoundary(str, maxLen) {
  if (str.length <= maxLen) return str;
  const cut = str.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
}

function stripFences(raw) {
  return String(raw)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

function scrubSecrets(message, secrets = []) {
  let out = typeof message === 'string' ? message : String(message ?? '');
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length >= 4) {
      out = out.split(secret).join('[REDACTED]');
    }
  }
  return redactSecrets(out);
}

function validateGoogleApisUrl(rawUrl, expectedHost) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`URL must use HTTPS: ${parsed.protocol}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error('URL must not contain embedded credentials');
  }
  if (parsed.hostname.toLowerCase() !== expectedHost) {
    throw new Error(`URL host not allowlisted: ${parsed.hostname}`);
  }
  return parsed.href;
}

function buildTargetList({ guides, comparisons, verifiedVendorFacts, extendedCatalog, siteOrigin = SITE_ORIGIN }) {
  const targets = [];

  for (const guide of (guides?.guides || []).slice().sort((a, b) => a.slug.localeCompare(b.slug))) {
    const facts = (guide.sections || [])
      .slice(0, 3)
      .map(s => `${s.heading}: ${trimToWordBoundary(s.body || '', 160)}`)
      .join(' | ');
    targets.push({
      targetSlug: guide.slug,
      targetType: 'guide',
      title: guide.title || guide.slug,
      canonicalUrl: `${siteOrigin}/guides/${guide.slug}/`,
      factsSummary: facts || guide.summary || guide.title || guide.slug,
      referencedOfficialUrls: (guide.citations || []).map(c => c.url).filter(Boolean),
    });
  }

  const comparisonMap = new Map();
  const factsObj = comparisons?.verifiedVendorFacts ?? verifiedVendorFacts ?? {};
  const extObj = comparisons?.extendedCatalog ?? extendedCatalog ?? null;

  if (Array.isArray(comparisons)) {
    for (const comp of comparisons) {
      if (comp?.slug && !comparisonMap.has(comp.slug)) {
        const rows = (comp.rows || []).slice(0, 3).map(r => `${r.dimension}: ${r.first?.summary || ''} vs ${r.second?.summary || ''}`).join(' | ');
        comparisonMap.set(comp.slug, {
          targetSlug: comp.slug,
          targetType: 'comparison',
          title: comp.title || comp.slug,
          canonicalUrl: `${siteOrigin}/compare/${comp.slug}/`,
          factsSummary: rows || comp.title || comp.slug,
          referencedOfficialUrls: (comp.rows || []).flatMap(r => [r.first?.sourceUrl, r.second?.sourceUrl]).filter(Boolean),
        });
      }
    }
  } else {
    for (const slug of Object.keys(factsObj)) {
      const entry = factsObj[slug];
      const rows = (entry?.rows || []).slice(0, 3).map(r => `${r.dimension}: ${r.first?.summary || ''} vs ${r.second?.summary || ''}`).join(' | ');
      comparisonMap.set(slug, {
        targetSlug: slug,
        targetType: 'comparison',
        title: slug,
        canonicalUrl: `${siteOrigin}/compare/${slug}/`,
        factsSummary: rows || slug,
        referencedOfficialUrls: (entry?.rows || []).flatMap(r => [r.first?.sourceUrl, r.second?.sourceUrl]).filter(Boolean),
      });
    }
    for (const comp of (extObj?.comparisons || [])) {
      if (comp?.slug && !comparisonMap.has(comp.slug)) {
        const rows = (comp.rows || []).slice(0, 3).map(r => `${r.dimension}: ${r.first?.summary || ''} vs ${r.second?.summary || ''}`).join(' | ');
        comparisonMap.set(comp.slug, {
          targetSlug: comp.slug,
          targetType: 'comparison',
          title: comp.title || comp.slug,
          canonicalUrl: `${siteOrigin}/compare/${comp.slug}/`,
          factsSummary: rows || comp.title || comp.slug,
          referencedOfficialUrls: (comp.rows || []).flatMap(r => [r.first?.sourceUrl, r.second?.sourceUrl]).filter(Boolean),
        });
      }
    }
  }

  for (const slug of [...comparisonMap.keys()].sort()) {
    targets.push(comparisonMap.get(slug));
  }

  return targets;
}

// ── 1. selectNextTargetForShort ─────────────────────────────────────────────

export function selectNextTargetForShort({
  guides,
  comparisons,
  verifiedVendorFacts,
  extendedCatalog,
  existingUploads,
  preferredSlug,
  siteOrigin = SITE_ORIGIN,
} = {}) {
  const uploadArray = Array.isArray(existingUploads)
    ? existingUploads
    : (existingUploads?.uploads || []);
  const uploadedSlugs = new Set(uploadArray.map(u => u.targetSlug).filter(Boolean));

  const targets = buildTargetList({
    guides,
    comparisons,
    verifiedVendorFacts,
    extendedCatalog,
    siteOrigin,
  });

  if (preferredSlug) {
    const preferred = targets.find(t => t.targetSlug === preferredSlug);
    if (preferred && !uploadedSlugs.has(preferredSlug)) {
      return preferred;
    }
    return null;
  }

  return targets.find(t => !uploadedSlugs.has(t.targetSlug)) || null;
}

// ── 2. buildShortsScriptPrompt ──────────────────────────────────────────────

export function buildShortsScriptPrompt({ target, siteOrigin = SITE_ORIGIN }) {
  const schema = '{"title":"... #Shorts","description":"...","hashtags":["#SaaS","#CRM","#Shorts"],"slides":[{"kicker":"01 / OVERVIEW","headline":"...","body":"..."},{"kicker":"02 / KEY FACT","headline":"...","body":"..."},{"kicker":"03 / KEY FACT","headline":"...","body":"..."},{"kicker":"04 / TAKEAWAY","headline":"...","body":"..."}]}';
  const parts = [
    `Create a factual 4-slide YouTube Shorts storyboard for this ${target.targetType} page.`,
    `Title: ${target.title || target.targetSlug}`,
    `Canonical URL: ${target.canonicalUrl}`,
    `Site origin: ${siteOrigin}`,
    `Verified facts only: ${target.factsSummary || target.title || target.targetSlug}`,
    'Rules: title 15-100 chars ending with #Shorts | description 80-2500 chars MUST include the exact Canonical URL | hashtags: 3-6 clean #Hashtag items | slides: exactly 4 items, each with kicker (<=40 chars), headline (<=80 chars), body (<=220 chars) | NO HTML tags, NO affiliate/UTM params, NO fabricated pricing or traffic claims.',
    `Respond ONLY with valid JSON matching: ${schema}`,
  ];
  return parts.join(' | ').replace(/[<>\x00-\x1f\x7f]+/g, ' ').trim();
}

// ── 3. validateShortsStoryboard ─────────────────────────────────────────────

export function validateShortsStoryboard(storyboard, allowedCanonicalUrl) {
  assertPlainObject(storyboard, 'storyboard');

  const errors = [];

  // Title: 15–100 chars, auto-append #Shorts if absent while staying <= 100 chars
  if (typeof storyboard.title !== 'string' || !storyboard.title.trim()) {
    errors.push('title must be a non-empty string');
  }
  let normalizedTitle = typeof storyboard.title === 'string' ? storyboard.title.trim() : '';
  if (normalizedTitle && !/#shorts\b/i.test(normalizedTitle)) {
    const base = trimToWordBoundary(normalizedTitle, 92);
    normalizedTitle = `${base} #Shorts`;
  }
  if (normalizedTitle.length < 15 || normalizedTitle.length > 100) {
    errors.push('title must be between 15 and 100 characters');
  }
  if (hasHtml(normalizedTitle)) errors.push('title contains HTML');
  if (hasTrackingParamsInText(normalizedTitle)) errors.push('title contains tracking params');
  if (FABRICATED_CLAIM_RE.test(normalizedTitle)) errors.push('title contains fabricated claim');

  // Description: 80–2500 chars, must contain allowedCanonicalUrl
  const normalizedDesc = typeof storyboard.description === 'string' ? storyboard.description.trim() : '';
  if (normalizedDesc.length < 80 || normalizedDesc.length > 2500) {
    errors.push('description must be between 80 and 2500 characters');
  }
  if (allowedCanonicalUrl && !normalizedDesc.includes(allowedCanonicalUrl)) {
    errors.push(`description must contain canonical URL: ${allowedCanonicalUrl}`);
  }
  if (hasHtml(normalizedDesc)) errors.push('description contains HTML');
  if (hasEmail(normalizedDesc)) errors.push('description contains email address');
  if (hasTrackingParamsInText(normalizedDesc)) errors.push('description contains tracking or affiliate params');
  if (FABRICATED_CLAIM_RE.test(normalizedDesc)) errors.push('description contains fabricated claim');

  // Hashtags: 3–6 clean #Hashtag items
  const rawHashtags = storyboard.hashtags;
  const normalizedHashtags = [];
  if (!Array.isArray(rawHashtags) || rawHashtags.length < 3 || rawHashtags.length > 6) {
    errors.push('hashtags must be an array of 3-6 items');
  } else {
    for (const tag of rawHashtags) {
      if (typeof tag !== 'string' || !/^#[A-Za-z0-9_]{2,40}$/.test(tag.trim())) {
        errors.push(`invalid hashtag: ${String(tag)}`);
      } else {
        normalizedHashtags.push(tag.trim());
      }
    }
  }

  // Slides: exactly 4 slides
  const rawSlides = storyboard.slides;
  const normalizedSlides = [];
  if (!Array.isArray(rawSlides) || rawSlides.length !== 4) {
    errors.push('slides must be an array of exactly 4 items');
  } else {
    for (let i = 0; i < rawSlides.length; i++) {
      const slide = rawSlides[i];
      assertPlainObject(slide, `slides[${i}]`);
      const kicker = typeof slide.kicker === 'string' ? slide.kicker.trim() : '';
      const headline = typeof slide.headline === 'string' ? slide.headline.trim() : '';
      const body = typeof slide.body === 'string' ? slide.body.trim() : '';

      if (!kicker || kicker.length > 50) errors.push(`slides[${i}].kicker must be 1-50 chars`);
      if (!headline || headline.length > 80) errors.push(`slides[${i}].headline must be 1-80 chars`);
      if (!body || body.length > 220) errors.push(`slides[${i}].body must be 1-220 chars`);

      for (const [field, val] of [['kicker', kicker], ['headline', headline], ['body', body]]) {
        if (hasHtml(val)) errors.push(`slides[${i}].${field} contains HTML`);
        if (hasEmail(val)) errors.push(`slides[${i}].${field} contains email`);
        if (hasTrackingParamsInText(val)) errors.push(`slides[${i}].${field} contains tracking params`);
        if (FABRICATED_CLAIM_RE.test(val)) errors.push(`slides[${i}].${field} contains fabricated claim`);
      }

      normalizedSlides.push({ kicker, headline, body });
    }
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join('; ') };
  }

  return {
    ok: true,
    storyboard: {
      title: normalizedTitle,
      description: normalizedDesc,
      hashtags: normalizedHashtags,
      slides: normalizedSlides,
    },
  };
}

// ── 4. renderSlideHtml ──────────────────────────────────────────────────────

export function renderSlideHtml({
  slide,
  slideIndex = 0,
  totalSlides = 4,
  brandName = 'StackPilot AI',
  siteHost = new URL(SITE_ORIGIN).hostname,
}) {
  const safeKicker = escapeHtml(slide?.kicker || `0${slideIndex + 1} / BRIEF`);
  const safeHeadline = escapeHtml(slide?.headline || '');
  const safeBody = escapeHtml(slide?.body || '');
  const safeBrand = escapeHtml(brandName);
  const safeHost = escapeHtml(siteHost);
  const progressPct = Math.round(((slideIndex + 1) / Math.max(totalSlides, 1)) * 100);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1080px;
    height: 1920px;
    background: #0F172A;
    color: #FFFFFF;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    overflow: hidden;
  }
  .frame {
    width: 1080px;
    height: 1920px;
    padding: 120px 88px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: linear-gradient(165deg, #0F172A 0%, #1E293B 100%);
  }
  .top-bar {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  .brand-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 28px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #94A3B8;
  }
  .brand-name {
    color: #34D399;
    font-weight: 700;
  }
  .progress-track {
    width: 100%;
    height: 10px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    overflow: hidden;
  }
  .progress-fill {
    width: ${progressPct}%;
    height: 100%;
    background: #34D399;
  }
  .content {
    display: flex;
    flex-direction: column;
    gap: 44px;
    border-left: 6px solid #34D399;
    padding-left: 44px;
  }
  .kicker {
    font-size: 32px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #34D399;
  }
  .headline {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 84px;
    line-height: 1.12;
    font-weight: 700;
    color: #FFFFFF;
  }
  .body {
    font-size: 46px;
    line-height: 1.45;
    color: #E2E8F0;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 36px;
    border-top: 2px solid rgba(52, 211, 153, 0.35);
    font-size: 28px;
    color: #94A3B8;
  }
  .cta {
    color: #34D399;
    font-weight: 600;
  }
</style>
</head>
<body>
  <main class="frame">
    <header class="top-bar">
      <div class="brand-row">
        <span class="brand-name">${safeBrand}</span>
        <span>${slideIndex + 1} / ${totalSlides}</span>
      </div>
      <div class="progress-track"><div class="progress-fill"></div></div>
    </header>
    <section class="content">
      <div class="kicker">${safeKicker}</div>
      <h1 class="headline">${safeHeadline}</h1>
      <p class="body">${safeBody}</p>
    </section>
    <footer class="footer">
      <span>Official Vendor Docs Only</span>
      <span class="cta">${safeHost}</span>
    </footer>
  </main>
</body>
</html>`;
}

// ── 5. exchangeYouTubeRefreshToken ──────────────────────────────────────────

export async function exchangeYouTubeRefreshToken({
  clientId,
  clientSecret,
  refreshToken,
  fetchImpl = globalThis.fetch,
  timeoutMs = 15000,
}) {
  if (typeof clientId !== 'string' || !clientId.trim()) throw new Error('Missing YOUTUBE_CLIENT_ID');
  if (typeof clientSecret !== 'string' || !clientSecret.trim()) throw new Error('Missing YOUTUBE_CLIENT_SECRET');
  if (typeof refreshToken !== 'string' || !refreshToken.trim()) throw new Error('Missing YOUTUBE_REFRESH_TOKEN');
  if (typeof fetchImpl !== 'function') throw new Error('fetchImpl must be a function');

  const tokenUrl = validateGoogleApisUrl(ALLOWED_OAUTH_URL, 'oauth2.googleapis.com');
  const secrets = [clientId, clientSecret, refreshToken];

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }).toString();

  let res;
  try {
    res = await fetchImpl(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new Error(`YouTube OAuth token request failed: ${scrubSecrets(err.message, secrets)}`);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`YouTube OAuth token error (${res.status}): ${scrubSecrets(text, secrets)}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('YouTube OAuth response was not valid JSON');
  }

  if (typeof parsed.access_token !== 'string' || !parsed.access_token) {
    throw new Error('YouTube OAuth response missing access_token');
  }

  return {
    accessToken: parsed.access_token,
    expiresIn: Number(parsed.expires_in) || 3600,
  };
}

// ── 6. uploadYouTubeShort ───────────────────────────────────────────────────

export async function uploadYouTubeShort({
  accessToken,
  videoBuffer,
  metadata,
  privacyStatus = 'private',
  fetchImpl = globalThis.fetch,
  timeoutMs = 60000,
}) {
  if (typeof accessToken !== 'string' || !accessToken.trim()) throw new Error('Missing accessToken');
  if (!videoBuffer || !Number.isFinite(videoBuffer.byteLength) || videoBuffer.byteLength <= 0) {
    throw new Error('videoBuffer must be a non-empty Buffer or Uint8Array');
  }
  if (!ALLOWED_PRIVACY_STATUSES.has(privacyStatus)) {
    throw new Error(`Invalid privacyStatus: ${privacyStatus}`);
  }
  if (typeof fetchImpl !== 'function') throw new Error('fetchImpl must be a function');

  const initUrl = validateGoogleApisUrl(ALLOWED_UPLOAD_INIT_URL, 'www.googleapis.com');
  const secrets = [accessToken];

  const tags = Array.isArray(metadata?.hashtags)
    ? metadata.hashtags.map(h => String(h).replace(/^#/, '')).filter(Boolean)
    : ['Shorts'];

  const initPayload = {
    snippet: {
      title: String(metadata?.title || 'StackPilot AI #Shorts'),
      description: String(metadata?.description || ''),
      tags,
      categoryId: '28',
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  };

  let initRes;
  try {
    initRes = await fetchImpl(initUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(videoBuffer.byteLength),
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: JSON.stringify(initPayload),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new Error(`YouTube upload init failed: ${scrubSecrets(err.message, secrets)}`);
  }

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`YouTube upload init error (${initRes.status}): ${scrubSecrets(errText, secrets)}`);
  }

  const rawLocation = initRes.headers.get('location') || initRes.headers.get('Location');
  if (!rawLocation) {
    throw new Error('YouTube upload init response missing Location header');
  }
  const uploadUrl = validateGoogleApisUrl(rawLocation, 'www.googleapis.com');

  let uploadRes;
  try {
    uploadRes = await fetchImpl(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(videoBuffer.byteLength),
      },
      body: videoBuffer,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new Error(`YouTube video stream upload failed: ${scrubSecrets(err.message, secrets)}`);
  }

  const uploadText = await uploadRes.text();
  if (!uploadRes.ok) {
    throw new Error(`YouTube video upload error (${uploadRes.status}): ${scrubSecrets(uploadText, secrets)}`);
  }

  let uploaded;
  try {
    uploaded = JSON.parse(uploadText);
  } catch {
    throw new Error('YouTube upload response was not valid JSON');
  }

  if (typeof uploaded.id !== 'string' || !uploaded.id) {
    throw new Error('YouTube upload response missing video id');
  }

  return {
    videoId: uploaded.id,
    shortsUrl: `https://youtube.com/shorts/${uploaded.id}`,
    privacyStatus,
  };
}

// ── 7. validateShortsUploads ────────────────────────────────────────────────

export function validateShortsUploads(data, allowedCanonicalUrls = null) {
  assertPlainObject(data, 'data');
  const violations = [];

  if (data.schemaVersion !== 1) violations.push('schemaVersion must be 1');
  if (!Array.isArray(data.uploads)) {
    violations.push('uploads must be an array');
    return { violations };
  }

  const allowedCanon = allowedCanonicalUrls ? new Set(allowedCanonicalUrls) : null;

  for (let i = 0; i < data.uploads.length; i++) {
    const item = data.uploads[i];
    assertPlainObject(item, `uploads[${i}]`);
    const prefix = `uploads[${i}] (${item.id || 'unknown'})`;

    if (typeof item.id !== 'string' || !item.id) violations.push(`${prefix}: missing id`);
    if (typeof item.targetSlug !== 'string' || !item.targetSlug) violations.push(`${prefix}: missing targetSlug`);
    if (!['guide', 'comparison'].includes(item.targetType)) violations.push(`${prefix}: invalid targetType`);

    if (typeof item.canonicalUrl !== 'string' || !item.canonicalUrl.startsWith('https://')) {
      violations.push(`${prefix}: canonicalUrl must be HTTPS`);
    } else if (hasTrackingParamsInText(item.canonicalUrl)) {
      violations.push(`${prefix}: canonicalUrl has tracking params`);
    } else if (allowedCanon && !allowedCanon.has(item.canonicalUrl)) {
      violations.push(`${prefix}: canonicalUrl not allowlisted`);
    }

    if (typeof item.title !== 'string' || item.title.length < 15 || item.title.length > 100) {
      violations.push(`${prefix}: invalid title`);
    }
    if (!Array.isArray(item.hashtags) || item.hashtags.length < 1 || item.hashtags.some(h => typeof h !== 'string' || !h.startsWith('#'))) {
      violations.push(`${prefix}: invalid hashtags`);
    }
    if (typeof item.videoId !== 'string' || !item.videoId) violations.push(`${prefix}: missing videoId`);
    if (item.shortsUrl !== `https://youtube.com/shorts/${item.videoId}`) {
      violations.push(`${prefix}: shortsUrl mismatch`);
    }
    if (!ALLOWED_PRIVACY_STATUSES.has(item.privacyStatus)) {
      violations.push(`${prefix}: invalid privacyStatus`);
    }
    if (typeof item.uploadedAt !== 'string' || isNaN(Date.parse(item.uploadedAt))) {
      violations.push(`${prefix}: invalid uploadedAt`);
    }
    if (item.estimatedCostMinor !== 0) {
      violations.push(`${prefix}: estimatedCostMinor must be 0`);
    }
  }

  return { violations };
}

// ── 8. runYouTubeShortsAgent ────────────────────────────────────────────────

export async function runYouTubeShortsAgent({
  guides,
  verifiedVendorFacts,
  extendedCatalog = null,
  existingUploads,
  siteOrigin = SITE_ORIGIN,
  preferredSlug,
  runAiPrompt,
  renderAndUpload,
  allowLiveYouTube = false,
  allowLiveAi = false,
  now = new Date(),
} = {}) {
  const uploadArray = Array.isArray(existingUploads)
    ? existingUploads
    : (existingUploads?.uploads || []);
  const uploadedSlugs = new Set(uploadArray.map(u => u.targetSlug).filter(Boolean));
  const targets = buildTargetList({ guides, verifiedVendorFacts, extendedCatalog, siteOrigin });
  const eligibleTargets = targets.map(t => t.targetSlug).filter(s => !uploadedSlugs.has(s));

  const baseResult = {
    eligibleTargets,
    eligibleCount: eligibleTargets.length,
    uploadedCount: uploadArray.length,
    nextTargetSlug: eligibleTargets[0] || null,
    estimatedCostMinor: 0,
  };

  if (!allowLiveYouTube) {
    return { ...baseResult, status: 'live_youtube_disabled' };
  }
  if (!allowLiveAi) {
    return { ...baseResult, status: 'live_ai_disabled' };
  }

  const target = selectNextTargetForShort({
    guides,
    verifiedVendorFacts,
    extendedCatalog,
    existingUploads,
    preferredSlug,
    siteOrigin,
  });

  if (!target) {
    return { ...baseResult, status: 'no_eligible_targets', nextTargetSlug: null };
  }

  const prompt = buildShortsScriptPrompt({ target, siteOrigin });
  let rawText;
  try {
    rawText = await runAiPrompt({
      taskClass: 'editorial_draft',
      prompt,
      systemPrompt: 'You draft factual 4-slide YouTube Shorts storyboards for a software comparison website. Respond ONLY with valid JSON.',
      maxOutputTokens: 1024,
      estimatedCostMinor: 0,
    });
  } catch (err) {
    return {
      ...baseResult,
      status: 'ai_error',
      error: `AI call failed: ${scrubSecrets(err.message)}`,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(stripFences(rawText));
  } catch (err) {
    return {
      ...baseResult,
      status: 'invalid_ai_response',
      error: `JSON parse error: ${err.message}`,
    };
  }

  const validation = validateShortsStoryboard(parsed, target.canonicalUrl);
  if (!validation.ok) {
    return {
      ...baseResult,
      status: 'invalid_ai_response',
      error: validation.error,
    };
  }

  if (typeof renderAndUpload !== 'function') {
    return {
      ...baseResult,
      status: 'storyboard_ready',
      nextTargetSlug: target.targetSlug,
      target,
      storyboard: validation.storyboard,
    };
  }

  const uploadResult = await renderAndUpload({
    target,
    storyboard: validation.storyboard,
  });

  const uploadedAt = now.toISOString();
  const id = 'short-' + createHash('sha256')
    .update(`${target.targetSlug}:${uploadedAt}`)
    .digest('hex')
    .slice(0, 12);

  const newUpload = {
    id,
    targetSlug: target.targetSlug,
    targetType: target.targetType,
    canonicalUrl: target.canonicalUrl,
    title: validation.storyboard.title,
    hashtags: validation.storyboard.hashtags,
    videoId: uploadResult.videoId,
    shortsUrl: uploadResult.shortsUrl,
    privacyStatus: uploadResult.privacyStatus,
    uploadedAt,
    estimatedCostMinor: 0,
  };

  return {
    ...baseResult,
    status: 'uploaded',
    nextTargetSlug: target.targetSlug,
    storyboard: validation.storyboard,
    newUpload,
  };
}

// ── 9. formatShortsReportMarkdown ───────────────────────────────────────────

export function formatShortsReportMarkdown(result) {
  const lines = [
    '## Agent 3B — YouTube Shorts Publisher Report',
    '',
    `**Status:** \`${result.status}\``,
    `**Eligible targets:** ${result.eligibleCount ?? (result.eligibleTargets || []).length}`,
    `**Uploaded Shorts:** ${result.uploadedCount ?? 0}`,
    `**Next target:** ${result.nextTargetSlug || 'none'}`,
    `**Estimated cost:** ${result.estimatedCostMinor ?? 0} minor units`,
    '',
  ];

  if (result.newUpload) {
    lines.push('### Uploaded Short', '');
    lines.push(`- **targetSlug:** \`${result.newUpload.targetSlug}\``);
    lines.push(`- **title:** ${result.newUpload.title}`);
    lines.push(`- **shortsUrl:** ${result.newUpload.shortsUrl}`);
    lines.push(`- **privacyStatus:** \`${result.newUpload.privacyStatus}\``);
    lines.push(`- **hashtags:** ${(result.newUpload.hashtags || []).join(' ')}`);
    lines.push(`- **uploadedAt:** ${result.newUpload.uploadedAt}`);
    lines.push('');
  }

  if (result.error) {
    lines.push(`**Error:** ${result.error}`);
  }

  return lines.join('\n');
}
