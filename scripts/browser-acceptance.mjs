import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4321';
const output = 'artifacts/browser-qa';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ready() {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {}
    await delay(500);
  }
  throw new Error('Astro preview did not become ready');
}

const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4321', '--strictPort'], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});
let browser;
const errors = [];
try {
  await ready();
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().startsWith(base) && response.status() >= 400 &&
        !response.url().endsWith('/favicon.ico')) errors.push('HTTP ' + response.status() + ': ' + response.url());
  });

  await page.goto(base + '/', { waitUntil: 'networkidle' });
  assert.match(await page.title(), /StackPilot AI/);
  assert.ok((await page.locator('h1').innerText()).includes('Find the right tools'));
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  await page.screenshot({ path: output + '/home-desktop.png', fullPage: true });

  const scenarios = [
    { goal: 'sales', expected: ['HubSpot', 'Pipedrive'] },
    { goal: 'seo', expected: ['Ahrefs', 'Semrush'] },
    { goal: 'hosting', expected: ['Cloudways', 'Kinsta'] }
  ];
  for (const item of scenarios) {
    await page.locator('#goal').selectOption(item.goal);
    await page.locator('#team').selectOption('2–20');
    await page.locator('#budget').selectOption('Moderate');
    await page.locator('#recommend').click();
    const names = (await page.locator('#result h4').allTextContents()).sort();
    assert.deepEqual(names, item.expected, 'Unexpected recommendations for ' + item.goal);
    const result = await page.locator('#result').innerText();
    assert.match(result, /Team-size suitability has not been verified/);
    assert.match(result, /Current pricing and budget suitability are not verified/);
    assert.match(result, /No affiliate links are active/);
    for (const link of await page.locator('#result a').all()) {
      const href = await link.getAttribute('href');
      assert.ok(href?.startsWith('https://'), 'Outbound link must be HTTPS');
      assert.ok(!/[?&](ref|aff|utm_)/i.test(href), 'Unexpected tracking parameter');
      assert.equal(await link.getAttribute('target'), '_blank');
      assert.match(await link.getAttribute('rel'), /noopener noreferrer/);
    }
  }

  await page.goto(base + '/compare/', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('table').count(), 3, 'Compare should show one table per category');
  for (const name of ['HubSpot', 'Pipedrive', 'Semrush', 'Ahrefs', 'Kinsta', 'Cloudways']) {
    assert.ok((await page.locator('main').innerText()).includes(name), 'Comparison missing ' + name);
  }
  await page.screenshot({ path: output + '/compare-desktop.png', fullPage: true });

  for (const slug of ['hubspot', 'pipedrive', 'semrush', 'ahrefs', 'kinsta', 'cloudways']) {
    const resp = await page.goto(base + '/software/' + slug + '/', { waitUntil: 'domcontentloaded' });
    assert.equal(resp?.status(), 200, 'Missing profile ' + slug);
    assert.match(await page.locator('main').innerText(), /pricing.*not verified|pricing.*current plans/i);
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  }
  for (const route of ['/methodology/', '/disclosure/', '/privacy/']) {
    const resp = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    assert.equal(resp?.status(), 200);
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  assert.ok(await page.locator('#recommend').isVisible(), 'Advisor button hidden on mobile');
  await page.locator('#goal').selectOption('sales');
  await page.locator('#recommend').click();
  assert.equal(await page.locator('#result h4').count(), 2);
  await page.screenshot({ path: output + '/home-mobile.png', fullPage: true });
  const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(bodyWidth <= 395, 'Homepage mobile overflow: ' + bodyWidth);

  await page.goto(base + '/compare/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: output + '/compare-mobile.png', fullPage: true });

  assert.deepEqual(errors, [], 'Browser JavaScript or local resource failures');
  console.log('Browser QA passed: desktop/mobile, 3 advisor scenarios, 6 profiles, comparison, 3 trust pages.');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
