import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

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
async function checkAccessibility(page, label) {
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const violations = scan.violations.map(v => ({
    id: v.id, impact: v.impact,
    nodes: v.nodes.slice(0, 5).map(n => ({ target: n.target, summary: n.failureSummary }))
  }));
  assert.deepEqual(violations, [], 'Accessibility failures in ' + label + ': ' + JSON.stringify(violations));
}
try {
  await ready();
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
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
  await checkAccessibility(page, 'homepage desktop');

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
  await checkAccessibility(page, 'category comparison desktop');
  // Interactive comparisons cannot cross categories or imply verified pricing.
  assert.equal(await page.locator('#compare-category').inputValue(), 'CRM');
  await page.locator('#compare-form button').click();
  const panel = page.locator('#comparison-result');
  assert.equal(await page.locator('#comparison-table').count(), 1);
  assert.equal(await page.locator('#comparison-table thead th').count(), 3);
  assert.match(await panel.innerText(), /HubSpot vs Pipedrive/);
  assert.match(await panel.innerText(), /Unverified/);
  assert.match(await panel.innerText(), /No affiliate links active/);
  await checkAccessibility(page, 'interactive CRM comparison');
  await page.locator('#compare-second').selectOption('hubspot');
  await page.locator('#compare-form button').click();
  assert.match(await page.locator('#comparison-error').innerText(), /Select two different products/);
  assert.equal(await page.locator('#comparison-table').count(), 0);
  await page.locator('#compare-category').selectOption('SEO');
  assert.deepEqual((await page.locator('#compare-first option').allTextContents()), ['Ahrefs', 'Semrush']);
  await page.locator('#compare-form button').click();
  assert.match(await panel.innerText(), /Ahrefs vs Semrush/);
  await page.locator('#compare-category').selectOption('Hosting');
  await page.locator('#compare-form button').click();
  assert.match(await panel.innerText(), /Cloudways vs Kinsta/);
  assert.ok(!(await panel.innerText()).includes('HubSpot'), 'Category change must not leak stale product comparisons');
  await checkAccessibility(page, 'interactive Hosting comparison');


  for (const slug of ['hubspot', 'pipedrive', 'semrush', 'ahrefs', 'kinsta', 'cloudways']) {
    const resp = await page.goto(base + '/software/' + slug + '/', { waitUntil: 'domcontentloaded' });
    assert.equal(resp?.status(), 200, 'Missing profile ' + slug);
    assert.match(await page.locator('main').innerText(), /pricing.*not verified|pricing.*current plans/i);
    if (slug === 'hubspot') await checkAccessibility(page, 'software profile');
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  }
  for (const route of ['/methodology/', '/disclosure/', '/privacy/', '/research/']) {
    const resp = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    assert.equal(resp?.status(), 200);
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  }

  await page.goto(base + '/research/', { waitUntil: 'domcontentloaded' });
  const workbench = await page.locator('main').innerText();
  for (const vendor of ['HubSpot','Pipedrive','Semrush','Ahrefs','Kinsta','Cloudways']) {
    assert.ok(workbench.includes(vendor), 'Research workbench missing ' + vendor);
  }
  assert.match(workbench, /No product claims or pricing have been editorially approved/);
  assert.match(workbench, /Source intake dates are not editorial verification dates/);
  assert.equal(await page.locator('main section').count(), 7);
  await checkAccessibility(page, 'editorial research workbench desktop');
  await page.screenshot({ path: output + '/research-desktop.png', fullPage: true });

  // Privacy-first requirements worksheet: user-entered state is browser-only.
  await page.goto(base + '/tools/requirements-checklist/', { waitUntil: 'networkidle' });
  assert.match(await page.title(), /StackPilot AI/);
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  assert.equal(await page.locator('#worksheet-criteria input[type="checkbox"]').count(), 7);
  await page.locator('#generate-worksheet').click();
  assert.match(await page.locator('#status').innerText(), /Select at least one requirement/);
  await page.locator('#worksheet-criteria input').nth(0).check();
  await page.locator('#worksheet-criteria input').nth(1).check();
  await page.locator('#generate-worksheet').click();
  const worksheetText=await page.locator('#worksheet-output').inputValue();
  assert.match(worksheetText, /Category: CRM/);
  assert.match(worksheetText, /Data import and export/);
  assert.match(worksheetText, /No paid rankings or affiliate links/);
  assert.match(await page.locator('#status').innerText(), /generated locally/);
  assert.ok(await page.locator('#download-worksheet-csv').isEnabled());
  const csvDownloadPromise=page.waitForEvent('download');
  await page.locator('#download-worksheet-csv').click();
  const csvDownload=await csvDownloadPromise;
  assert.equal(csvDownload.suggestedFilename(),'stackpilot-requirements-crm.csv');
  const csvStream=await csvDownload.createReadStream();
  const csvChunks=[];
  for await (const chunk of csvStream) csvChunks.push(Buffer.from(chunk));
  const exportedCsv=Buffer.concat(csvChunks).toString('utf8');
  assert.match(exportedCsv,/category,requirement_id,requirement,question,verification_status,vendor_answer,evidence_plan_region_date/);
  assert.match(exportedCsv,/"CRM","pipeline-stages"/);
  assert.match(exportedCsv,/"Unverified","",""/);
  assert.ok(exportedCsv.split('\\r\\n').length>=3,'CSV includes selected requirements');
  assert.match(await page.locator('#status').innerText(),/saved on your device/i);
  await checkAccessibility(page, 'private requirements worksheet desktop');
  await page.screenshot({ path: output + '/worksheet-desktop.png', fullPage: true });
  await page.locator('#worksheet-criteria input').nth(2).check();
  assert.ok(await page.locator('#download-worksheet-csv').isDisabled(),'Editing criteria invalidates generated CSV');
  assert.equal(await page.locator('#worksheet-output').inputValue(),'','Editing criteria invalidates stale worksheet');
  await page.locator('#worksheet-category').selectOption('Hosting');
  assert.equal(await page.locator('#worksheet-output').inputValue(), '');
  assert.equal(await page.locator('#worksheet-criteria input').count(), 7);
  await page.locator('#worksheet-criteria input').first().check();
  await page.locator('#generate-worksheet').click();
  assert.match(await page.locator('#worksheet-output').inputValue(), /Category: Hosting/);
  assert.doesNotMatch(await page.locator('#worksheet-output').inputValue(), /Data import and export/);
  await page.locator('#reset-worksheet').click();
  assert.equal(await page.locator('#worksheet-output').inputValue(), '');

  // Pricing truth: calculate only buyer-supplied prices, never vendor claims.
  await page.goto(base + '/tools/software-cost-calculator/', { waitUntil:'networkidle' });
  assert.match(await page.title(), /StackPilot AI/);
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  assert.equal(await page.locator('fieldset[data-option]').count(), 2);
  await page.locator('#cost-a-flatMonthly').fill('10.10');
  await page.locator('#cost-a-seatMonthly').fill('2.50');
  await page.locator('#cost-a-seats').fill('3');
  await page.locator('#cost-a-extrasMonthly').fill('4.00');
  await page.locator('#cost-a-oneTimeFee').fill('50.00');
  await page.locator('#cost-b-flatMonthly').fill('15');
  await page.locator('#cost-b-seatMonthly').fill('1');
  await page.locator('#cost-b-seats').fill('3');
  await page.locator('#cost-b-extrasMonthly').fill('5');
  await page.locator('#cost-b-oneTimeFee').fill('0');
  await page.locator('#cost-calculate').click();
  const estimate=await page.locator('#cost-report').inputValue();
  assert.match(estimate,/INR 309.20/);
  assert.match(estimate,/INR 276.00/);
  assert.match(estimate,/Option B has the lower entered-cost estimate/);
  assert.match(estimate,/not vendor-verified pricing/);
  assert.match(await page.locator('#cost-status').innerText(),/calculated locally/);
  await checkAccessibility(page,'cost calculator desktop');
  await page.screenshot({path:output+'/cost-calculator-desktop.png',fullPage:true});
  await page.locator('#cost-a-flatMonthly').fill('-1');
  await page.locator('#cost-calculate').click();
  assert.match(await page.locator('#cost-status').innerText(),/Invalid .*amount/i);
  assert.equal(await page.locator('#cost-report').inputValue(),'');
  assert.ok(await page.locator('#cost-copy').isDisabled());
  await page.locator('#cost-reset').click();
  assert.equal(await page.locator('#cost-a-flatMonthly').inputValue(),'0');
  assert.equal(await page.locator('#cost-report').inputValue(),'');

  // Substantial guide: exact fictional cost illustration, prelaunch indexing and links.
  await page.goto(base + '/guides/saas-total-cost-of-ownership/', {waitUntil:'networkidle'});
  assert.match(await page.title(),/SaaS total cost of ownership/);
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
  assert.equal(await page.locator('h1').count(),1);
  assert.match(await page.locator('main').innerText(),/USD 1000.00/);
  assert.match(await page.locator('main').innerText(),/USD 936.00/);
  assert.match(await page.locator('main').innerText(),/USD 64.00/);
  assert.match(await page.locator('main').innerText(),/hypothetical/i);
  assert.equal(await page.locator('main a[href="/tools/software-cost-calculator/"]').count()>=1,true);
  await checkAccessibility(page,'SaaS TCO educational guide desktop');
  await page.screenshot({path:output+'/saas-tco-guide-desktop.png',fullPage:true});

  // CRM migration decision guide: new static content must receive browser and axe coverage.
  await page.goto(base + '/guides/crm-migration-checklist/', {waitUntil:'networkidle'});
  assert.match(await page.locator('h1').innerText(), /CRM migration checklist/);
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  const migrationText = await page.locator('main').innerText();
  for (const topic of ['permissions','deduplication','rollback','staff hours','sample import']) {
    assert.match(migrationText, new RegExp(topic,'i'));
  }
  await checkAccessibility(page,'CRM migration checklist desktop');
  await page.screenshot({path:output+'/crm-migration-desktop.png',fullPage:true});

  // Hosting migration guide: category-balanced buyer education; no vendor endorsements.
  await page.goto(base + '/guides/hosting-migration-checklist/', {waitUntil:'networkidle'});
  assert.match(await page.locator('h1').innerText(), /Hosting migration checklist/);
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  const hostingGuideText=await page.locator('main').innerText();
  for (const topic of ['DNS','backups','restore','TLS','rollback','data retention','GO/NO-GO']) {
    assert.match(hostingGuideText,new RegExp(topic,'i'));
  }
  assert.equal(await page.locator('main section').count(),7);
  assert.equal(await page.locator('tbody tr').count(),5);
  await checkAccessibility(page,'hosting migration checklist desktop');
  await page.screenshot({path:output+'/hosting-migration-desktop.png',fullPage:true});

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  assert.ok(await page.locator('#recommend').isVisible(), 'Advisor button hidden on mobile');
  await page.locator('#goal').selectOption('sales');
  await page.locator('#recommend').click();
  assert.equal(await page.locator('#result h4').count(), 2);
  await page.screenshot({ path: output + '/home-mobile.png', fullPage: true });
  await checkAccessibility(page, 'homepage mobile results');
  const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  if (bodyWidth > 395) {
    const offenders = await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .filter(el => el.getBoundingClientRect().right > window.innerWidth + 4)
        .slice(0, 8)
        .map(el => ({ tag: el.tagName.toLowerCase(), class: el.className, right: Math.round(el.getBoundingClientRect().right) }))
    );
    throw new Error('Homepage mobile overflow: ' + bodyWidth + '; offending elements: ' + JSON.stringify(offenders));
  }

  await page.goto(base + '/research/', { waitUntil: 'networkidle' });
  await checkAccessibility(page, 'editorial research workbench mobile');
  await page.screenshot({ path: output + '/research-mobile.png', fullPage: true });
  const researchWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(researchWidth <= 395, 'Research mobile overflow: ' + researchWidth);

  await page.goto(base + '/tools/requirements-checklist/', { waitUntil: 'networkidle' });
  await page.locator('#worksheet-category').selectOption('SEO');
  await page.locator('#worksheet-criteria input').nth(1).check();
  await page.locator('#generate-worksheet').click();
  assert.match(await page.locator('#worksheet-output').inputValue(), /Category: SEO/);
  const mobileCsvDownloadPromise=page.waitForEvent('download');
  await page.locator('#download-worksheet-csv').click();
  const mobileCsvDownload=await mobileCsvDownloadPromise;
  assert.equal(mobileCsvDownload.suggestedFilename(),'stackpilot-requirements-seo.csv');
  await checkAccessibility(page, 'private requirements worksheet mobile');
  await page.screenshot({ path: output + '/worksheet-mobile.png', fullPage: true });
  const worksheetWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(worksheetWidth <= 395, 'Worksheet mobile overflow: ' + worksheetWidth);

  await page.goto(base+'/tools/software-cost-calculator/',{waitUntil:'networkidle'});
  await page.locator('#cost-a-flatMonthly').fill('2');
  await page.locator('#cost-b-flatMonthly').fill('3');
  await page.locator('#cost-calculate').click();
  assert.match(await page.locator('#cost-report').inputValue(),/INR 24.00/);
  assert.match(await page.locator('#cost-report').inputValue(),/INR 36.00/);
  await checkAccessibility(page,'cost calculator mobile');
  await page.screenshot({path:output+'/cost-calculator-mobile.png',fullPage:true});
  const calculatorWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
  assert.ok(calculatorWidth<=395,'Cost calculator mobile overflow: '+calculatorWidth);

  await page.goto(base + '/guides/saas-total-cost-of-ownership/', {waitUntil:'networkidle'});
  assert.match(await page.locator('h1').innerText(),/SaaS total cost of ownership/);
  await checkAccessibility(page,'SaaS TCO educational guide mobile');
  await page.screenshot({path:output+'/saas-tco-guide-mobile.png',fullPage:true});
  const tcoWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
  assert.ok(tcoWidth<=395,'SaaS cost guide mobile overflow: '+tcoWidth);

  await page.goto(base + '/guides/hosting-migration-checklist/', {waitUntil:'networkidle'});
  assert.match(await page.locator('h1').innerText(), /Hosting migration checklist/);
  const hostingScroller=page.locator('[role="region"][aria-label^="Hosting cutover checkpoints"]');
  assert.equal(await hostingScroller.count(),1);
  await hostingScroller.focus();
  assert.ok(await hostingScroller.evaluate(el=>document.activeElement===el),'Hosting table must be keyboard focusable');
  await checkAccessibility(page,'hosting migration checklist mobile');
  assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=395,'Hosting migration mobile overflow');
  await page.screenshot({path:output+'/hosting-migration-mobile.png',fullPage:true});

  await page.goto(base + '/guides/crm-migration-checklist/', {waitUntil:'networkidle'});
  assert.match(await page.locator('h1').innerText(), /CRM migration checklist/);
  const acceptanceScroller = page.locator('[role="region"][aria-label^="Migration acceptance table"]');
  assert.equal(await acceptanceScroller.count(), 1, 'Acceptance table needs one labeled scroll region');
  await acceptanceScroller.focus();
  assert.ok(await acceptanceScroller.evaluate(el => document.activeElement === el),
    'Keyboard focus should reach the acceptance table');
  assert.ok(await acceptanceScroller.evaluate(el => el.scrollWidth > el.clientWidth),
    'Mobile acceptance matrix should be horizontally scrollable');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  assert.ok(await acceptanceScroller.evaluate(el => el.scrollLeft > 0),
    'ArrowRight must scroll the focused acceptance table on mobile');
  const scrollAfterRight = await acceptanceScroller.evaluate(el => el.scrollLeft);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(150);
  assert.ok(await acceptanceScroller.evaluate(el => el.scrollLeft) < scrollAfterRight,
    'ArrowLeft must move the focused acceptance table back toward its start');
  await checkAccessibility(page,'CRM migration checklist mobile');
  await page.screenshot({path:output+'/crm-migration-mobile.png',fullPage:true});
  assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 395,'CRM migration mobile overflow');

  await page.goto(base + '/compare/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: output + '/compare-mobile.png', fullPage: true });
  await page.locator('#compare-category').selectOption('CRM');
  await page.locator('#compare-form button').click();
  assert.equal(await page.locator('#comparison-table').count(), 1);
  assert.match(await page.locator('#comparison-result').innerText(), /HubSpot vs Pipedrive/);
  await checkAccessibility(page, 'interactive comparison mobile');
  const compareWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(compareWidth <= 395, 'Comparison mobile overflow: ' + compareWidth);

  assert.deepEqual(errors, [], 'Browser JavaScript or local resource failures');
  console.log('Browser QA passed: desktop/mobile, 3 advisor scenarios, 6 profiles, interactive category comparisons, private requirements worksheet, cost calculator and SaaS TCO guide, 3 trust pages.');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
