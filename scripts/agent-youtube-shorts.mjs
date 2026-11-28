#!/usr/bin/env node
/**
 * scripts/agent-youtube-shorts.mjs
 *
 * Phase 19 — Autonomous YouTube Shorts Generator & Uploader CLI
 *
 * Usage:
 *   node scripts/agent-youtube-shorts.mjs --dry-run
 *   node scripts/agent-youtube-shorts.mjs --live --write [--slug <slug>] [--report-out <path>]
 *
 * Zero new npm dependencies. Uses Node 26 built-in fetch, Playwright Chromium, and ffmpeg.
 * Fail-closed: requires STACKPILOT_ALLOW_LIVE_YOUTUBE=true and STACKPILOT_ALLOW_LIVE_AI=true.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ── Flags ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isLive = args.includes('--live');
const isWrite = args.includes('--write');

const slugIdx = args.indexOf('--slug');
const preferredSlug = slugIdx !== -1 && args[slugIdx + 1] ? args[slugIdx + 1] : undefined;

const reportOutIdx = args.indexOf('--report-out');
const reportOutPath = reportOutIdx !== -1 && args[reportOutIdx + 1] ? args[reportOutIdx + 1] : undefined;

const allowLiveYouTube = process.env.STACKPILOT_ALLOW_LIVE_YOUTUBE === 'true';
const allowLiveAi = process.env.STACKPILOT_ALLOW_LIVE_AI === 'true';

const rawPrivacy = process.env.YOUTUBE_PRIVACY_STATUS || 'private';
const privacyStatus = ['private', 'unlisted', 'public'].includes(rawPrivacy) ? rawPrivacy : 'private';

// ── Load data ──────────────────────────────────────────────────────────────

const guides = JSON.parse(readFileSync(join(root, 'src/data/agent-buyer-guides.json'), 'utf8'));
const verifiedVendorFacts = JSON.parse(readFileSync(join(root, 'src/data/verified-vendor-facts.json'), 'utf8'));
const extendedCatalog = JSON.parse(readFileSync(join(root, 'src/data/extended-catalog.json'), 'utf8'));
const existingUploads = JSON.parse(readFileSync(join(root, 'src/data/agent-youtube-shorts.json'), 'utf8'));

// ── Imports ────────────────────────────────────────────────────────────────

const {
  selectNextTargetForShort,
  renderSlideHtml,
  exchangeYouTubeRefreshToken,
  uploadYouTubeShort,
  runYouTubeShortsAgent,
  formatShortsReportMarkdown,
} = await import('../src/platform/agents/youtube-shorts.mjs');

const { routeAiRequest, redactSecrets } = await import('../src/platform/ai/router.mjs');
const {
  createFreeTierModelRegistry,
  createGeminiFreeAdapter,
  createOpenAIFallbackAdapter,
} = await import('../src/platform/ai/live-adapters.mjs');
const { executeLiveRoutedPrompt } = await import('../src/platform/ai/live-runner.mjs');
const { SITE_ORIGIN } = await import('../src/lib/site-origin.mjs');

// ── Dry-run mode ───────────────────────────────────────────────────────────

if (isDryRun || !isLive) {
  const uploadedSlugs = new Set((existingUploads.uploads || []).map(u => u.targetSlug));
  const guideTargets = (guides.guides || []).map(g => g.slug);
  const extTargets = (extendedCatalog.comparisons || []).map(c => c.slug).filter(Boolean);
  const comparisonTargets = [...new Set([...Object.keys(verifiedVendorFacts), ...extTargets])];
  const eligibleTargets = [
    ...guideTargets.filter(s => !uploadedSlugs.has(s)),
    ...comparisonTargets.filter(s => !uploadedSlugs.has(s)),
  ];

  const nextTarget = selectNextTargetForShort({
    guides,
    verifiedVendorFacts,
    extendedCatalog,
    existingUploads,
    preferredSlug,
    siteOrigin: SITE_ORIGIN,
  });

  const report = {
    status: 'dry_run',
    youtubeCredentialsConfigured: Boolean(
      process.env.YOUTUBE_CLIENT_ID &&
      process.env.YOUTUBE_CLIENT_SECRET &&
      process.env.YOUTUBE_REFRESH_TOKEN
    ),
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    eligibleCount: eligibleTargets.length,
    uploadedCount: (existingUploads.uploads || []).length,
    nextTargetSlug: nextTarget?.targetSlug || null,
    estimatedCostMinor: 0,
    _note: 'No live AI, ffmpeg, or YouTube API calls. Pass --live --write with STACKPILOT_ALLOW_LIVE_YOUTUBE=true and STACKPILOT_ALLOW_LIVE_AI=true.',
  };

  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exit(0);
}

// ── Live mode ──────────────────────────────────────────────────────────────

const now = new Date();
const adapters = {
  gemini: createGeminiFreeAdapter({ apiKey: process.env.GEMINI_API_KEY ?? '' }),
  openai: createOpenAIFallbackAdapter({ apiKey: process.env.OPENAI_API_KEY ?? '' }),
};
const registry = createFreeTierModelRegistry();

async function runAiPrompt(request) {
  const res = await executeLiveRoutedPrompt({
    router: { routeAiRequest },
    adapters,
    registry,
    request: {
      taskClass: request.taskClass || 'editorial_draft',
      prompt: request.prompt,
      systemPrompt: request.systemPrompt,
      requestedTokens: request.requestedTokens || Math.ceil(((request.prompt?.length || 0) + (request.systemPrompt?.length || 0)) / 4) + 1024,
      maxOutputTokens: Math.max(Number(request.maxOutputTokens) || 0, 1024),
    },
    allowLiveNetwork: allowLiveAi,
    env: process.env,
    now: now.toISOString(),
  });
  if (!res.ok) {
    throw new Error(res.reason || 'live_ai_failed');
  }
  return res.text;
}

async function renderAndUpload({ storyboard }) {
  const workDir = join(tmpdir(), 'stackpilot-short');
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });

  const siteHost = new URL(SITE_ORIGIN).hostname;
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
    const page = await context.newPage();

    for (let i = 0; i < storyboard.slides.length; i++) {
      const html = renderSlideHtml({
        slide: storyboard.slides[i],
        slideIndex: i,
        totalSlides: storyboard.slides.length,
        brandName: 'StackPilot AI',
        siteHost,
      });
      await page.setContent(html, { waitUntil: 'load' });
      const slidePath = join(workDir, `slide-${i + 1}.png`);
      await page.screenshot({ path: slidePath, type: 'png' });
    }
  } finally {
    await browser.close();
  }

  const mp4Path = join(workDir, 'short.mp4');
  const ffmpegArgs = [
    '-y',
    '-loop', '1', '-t', '4', '-i', join(workDir, 'slide-1.png'),
    '-loop', '1', '-t', '4', '-i', join(workDir, 'slide-2.png'),
    '-loop', '1', '-t', '4', '-i', join(workDir, 'slide-3.png'),
    '-loop', '1', '-t', '4', '-i', join(workDir, 'slide-4.png'),
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-filter_complex', '[0:v][1:v][2:v][3:v]concat=n=4:v=1:a=0,scale=1080:1920,format=yuv420p[v]',
    '-map', '[v]',
    '-map', '4:a',
    '-c:v', 'libx264',
    '-r', '30',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-shortest',
    '-movflags', '+faststart',
    mp4Path,
  ];
  execFileSync('ffmpeg', ffmpegArgs, { stdio: 'pipe' });

  const videoBuffer = readFileSync(mp4Path);
  const { accessToken } = await exchangeYouTubeRefreshToken({
    clientId: process.env.YOUTUBE_CLIENT_ID ?? '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET ?? '',
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN ?? '',
  });

  return uploadYouTubeShort({
    accessToken,
    videoBuffer,
    metadata: {
      title: storyboard.title,
      description: storyboard.description,
      hashtags: storyboard.hashtags,
    },
    privacyStatus,
  });
}

let result;
try {
  result = await runYouTubeShortsAgent({
    guides,
    existingUploads,
    verifiedVendorFacts,
    extendedCatalog,
    siteOrigin: SITE_ORIGIN,
    preferredSlug,
    runAiPrompt,
    renderAndUpload,
    allowLiveYouTube,
    allowLiveAi,
    now,
  });
} catch (err) {
  const safeErr = redactSecrets(err.message || String(err));
  process.stderr.write(`[agent-youtube-shorts] Error: ${safeErr}\n`);
  process.exit(1);
}

const markdown = formatShortsReportMarkdown(result);
process.stdout.write(markdown + '\n');
if (reportOutPath) {
  writeFileSync(reportOutPath, markdown + '\n', 'utf8');
}

if (result.status === 'live_youtube_disabled' || result.status === 'live_ai_disabled') {
  process.stderr.write(`[agent-youtube-shorts] Failed closed: ${result.status}\n`);
  process.exit(1);
}

if (result.status === 'no_eligible_targets') {
  process.stderr.write(`[agent-youtube-shorts] Status: ${result.status}\n`);
  process.exit(0);
}

if (result.status === 'ai_error' || result.status === 'invalid_ai_response') {
  process.stderr.write(`[agent-youtube-shorts] ${result.status}: ${result.error || ''}\n`);
  process.exit(1);
}

if (result.status === 'uploaded' && result.newUpload && isWrite) {
  existingUploads.uploads.push(result.newUpload);
  writeFileSync(
    join(root, 'src/data/agent-youtube-shorts.json'),
    JSON.stringify(existingUploads, null, 2) + '\n',
    'utf8',
  );
  process.stderr.write(`[agent-youtube-shorts] Uploaded Short for: ${result.newUpload.targetSlug}\n`);
}

process.exit(0);
