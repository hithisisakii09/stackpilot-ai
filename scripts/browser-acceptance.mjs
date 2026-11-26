import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { routePathsFromBuiltHtml, assertExactBrowserRouteCoverage } from '../src/lib/browser-route-coverage.mjs';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const base = 'http://127.0.0.1:4321';
const output = 'artifacts/browser-qa';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


// Only files from the current static build are eligible for the route-wide browser pass.
function emittedBuildFiles(root='dist',subdir=''){
 const files=[];
 for(const entry of readdirSync(join(root,subdir),{withFileTypes:true})){
  const relative=subdir?subdir+'/'+entry.name:entry.name;
  if(entry.isSymbolicLink())throw new Error('Symlink in built browser inventory');
  if(entry.isDirectory())files.push(...emittedBuildFiles(root,relative));
  else if(entry.isFile())files.push(relative);
  else throw new Error('Unexpected build filesystem entry');
 }
 return files;
}

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
  assert.ok((await page.locator('h1').innerText()).includes('Explore software categories'));
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /\bindex\b/);
  // A buyer should discover the privacy-first CRM seat audit without a deep link.
  const seatAuditHomeLink=page.locator('header nav a[href="/tools/crm-seat-audit/"]');
  assert.equal(await seatAuditHomeLink.count(),1,'Homepage must link to CRM seat audit');
  await seatAuditHomeLink.focus();
  assert.ok(await seatAuditHomeLink.evaluate(el=>document.activeElement===el));
  await page.keyboard.press('Enter');
  await page.waitForURL(base+'/tools/crm-seat-audit/');
  assert.match(await page.locator('h1').innerText(),/CRM paid-seat audit/);
  await page.goto(base+'/',{waitUntil:'networkidle'});

  await page.screenshot({ path: output + '/home-desktop.png', fullPage: true });
  await checkAccessibility(page, 'homepage desktop');

  const scenarios = [
    { goal: 'sales', expected: ['HubSpot', 'Pipedrive'], peerSlug: 'hubspot-vs-pipedrive', productIds: ['hubspot','pipedrive'] },
    { goal: 'seo', expected: ['Ahrefs', 'Semrush'], peerSlug: 'semrush-vs-ahrefs', productIds: ['ahrefs','semrush'] },
    { goal: 'hosting', expected: ['Cloudways', 'Kinsta'], peerSlug: 'kinsta-vs-cloudways', productIds: ['cloudways','kinsta'] }
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
    // Three public-safe categories must link to real static comparison routes
    // and profiles without exposing unreviewed vendor matrix assertions.
    const peerLinks = await page.locator('#result a').filter({hasText:'Review questions for category peer'}).all();
    assert.equal(peerLinks.length,2,'Exactly two neutral category-peer links');
    for (const peerLink of peerLinks){
      assert.equal(await peerLink.getAttribute('href'),'/compare/'+item.peerSlug+'/');
      assert.equal(await peerLink.getAttribute('target'),null,'Internal links remain first-party');
    }
    assert.equal((await page.request.get(base+'/compare/'+item.peerSlug+'/')).status(),200,
      'Canonical peer route must exist for '+item.goal);
    const profileLinks = await page.locator('#result a').filter({hasText:'View product profile'}).all();
    assert.equal(profileLinks.length,2,'Exactly two individual profile links');
    const profileHrefs = await Promise.all(profileLinks.map(link=>link.getAttribute('href')));
    assert.deepEqual(profileHrefs.sort(),item.productIds.map(id=>'/software/'+id+'/').sort());
    for (const link of await page.locator('#result a[target="_blank"]').all()) {
      const href = await link.getAttribute('href');
      assert.ok(href?.startsWith('https://'), 'Outbound link must be HTTPS');
      assert.ok(!/[?&](ref|aff|utm_)/i.test(href), 'Unexpected tracking parameter');
      assert.match(await link.getAttribute('rel'), /noopener noreferrer/);
    }
    assert.equal(await page.locator('#result a[target="_blank"]').count(),2);
  }

  // All priority/team/budget combinations must behave honestly in the rendered browser.
  for (const scenario of scenarios) {
    for (const team of ['Solo', '2–20', '21+']) {
      for (const budget of ['Minimal', 'Moderate', 'Premium']) {
        await page.locator('#goal').selectOption(scenario.goal);
        await page.locator('#team').selectOption(team);
        await page.locator('#budget').selectOption(budget);
        await page.locator('#recommend').click();
        assert.equal(await page.locator('#result h3').innerText(),
          'Category matches (alphabetical, unranked)');
        assert.deepEqual(await page.locator('#result h4').allTextContents(), scenario.expected,
          'Unranked alphabetical browser display for ' + scenario.goal + '/' + team + '/' + budget);
        const outputText = await page.locator('#result').innerText();
        assert.match(outputText, /not suitability rankings or endorsements/);
        assert.match(outputText, /Team-size suitability has not been verified/);
        assert.match(outputText, /Current pricing and budget suitability are not verified/);
      }
    }
  }

  await page.goto(base + '/compare/', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('table').count(), 3, 'Compare should show one table per category');
  for (const name of ['HubSpot', 'Pipedrive', 'Semrush', 'Ahrefs', 'Kinsta', 'Cloudways']) {
    assert.ok((await page.locator('main').innerText()).includes(name), 'Comparison missing ' + name);
  }
  // Static category tables must not disclose unapproved team fit or false editorial approval.
  const staticCandidateRows=page.locator('main section[aria-label$=" candidates"] tbody tr');
  assert.equal(await staticCandidateRows.count(),6);
  for (const row of await staticCandidateRows.all()) {
    const text=await row.innerText();
    assert.match(text,/Unverified catalog overview:/);
    assert.match(text,/Unverified/);
    assert.match(text,/Editorial review pending/);
    assert.doesNotMatch(text,/Editorial review completed/);
  }
  assert.deepEqual(await page.locator('section[aria-label="CRM candidates"] tbody th').allTextContents(),['HubSpot','Pipedrive']);
  assert.deepEqual(await page.locator('section[aria-label="SEO candidates"] tbody th').allTextContents(),['Ahrefs','Semrush']);
  assert.deepEqual(await page.locator('section[aria-label="Hosting candidates"] tbody th').allTextContents(),['Cloudways','Kinsta']);
  await page.screenshot({ path: output + '/compare-desktop.png', fullPage: true });
  await checkAccessibility(page, 'category comparison desktop');
  // External-only, local comparison picker cannot leak claims or execute URL input.
  assert.equal(await page.locator('script:not([src])').count(), 0, 'Compare page must have zero inline scripts');
  assert.equal(await page.locator('script[src="/scripts/compare-picker.js"]').count(), 1);
  assert.match(await page.locator('meta[http-equiv="Content-Security-Policy"]').count() ? await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content') : 'script-src self', /script-src/);
  assert.equal(await page.locator('#compare-category').inputValue(), 'CRM');
  const downloadQuestions = page.locator('#download-comparison-csv');
  assert.ok(await downloadQuestions.isDisabled(), 'Download disabled until a valid comparison');
  await page.locator('#compare-form button').click();
  const panel = page.locator('#comparison-result');
  assert.equal(await page.locator('#comparison-table').count(), 1);
  assert.equal(await page.locator('#comparison-table thead th').count(), 3);
  assert.match(await panel.innerText(), /HubSpot vs Pipedrive/);
  assert.match(await panel.innerText(), /Candidate.*unverified/);
  assert.ok(await downloadQuestions.isEnabled());
  const comparisonCsvPromise = page.waitForEvent('download');
  await downloadQuestions.click();
  const comparisonCsv = await comparisonCsvPromise;
  assert.equal(comparisonCsv.suggestedFilename(), 'stackpilot-candidate-comparison-crm.csv');
  const comparisonCsvStream = await comparisonCsv.createReadStream();
  const questionChunks = [];
  for await (const chunk of comparisonCsvStream) questionChunks.push(Buffer.from(chunk));
  const questionCsvText = Buffer.concat(questionChunks).toString('utf8');
  assert.match(questionCsvText, /"HubSpot"/);
  assert.match(questionCsvText, /CANDIDATE_UNVERIFIED/);
  assert.doesNotMatch(questionCsvText, /affiliate|winner|recommended/i);
  assert.match(await page.locator('#comparison-download-status').innerText(), /saved on your device/);
  await checkAccessibility(page, 'interactive CRM comparison');
  await page.locator('#compare-second').selectOption('hubspot');
  await page.locator('#compare-form button').click();
  assert.match(await page.locator('#comparison-error').innerText(), /Select two or three different tools/);
  assert.equal(await page.locator('#comparison-table').count(), 0);
  assert.ok(await downloadQuestions.isDisabled(), 'Invalid comparison must invalidate CSV');
  await page.locator('#compare-category').selectOption('SEO');
  assert.ok(await downloadQuestions.isDisabled(), 'Category change invalidates previous CSV');
  assert.deepEqual((await page.locator('#compare-first option').allTextContents()), ['Ahrefs', 'Semrush']);
  await page.locator('#compare-form button').click();
  assert.match(await panel.innerText(), /Ahrefs vs Semrush/);
  assert.ok(await downloadQuestions.isEnabled());
  await page.locator('#compare-category').selectOption('Hosting');
  assert.ok(await downloadQuestions.isDisabled(), 'Hosting change clears stale SEO CSV');
  await page.locator('#compare-form button').click();
  assert.match(await panel.innerText(), /Cloudways vs Kinsta/);
  assert.ok(await downloadQuestions.isEnabled());
  assert.ok(!(await panel.innerText()).includes('HubSpot'), 'Category change must not leak stale product comparisons');
  await page.locator('#compare-category').selectOption('CRM');
  await page.locator('#compare-third').selectOption('pipedrive');
  await page.locator('#compare-form button').click();
  assert.equal(await page.locator('#comparison-table').count(), 0, 'Duplicate third tool must not render comparison');
  assert.match(await page.locator('#comparison-error').innerText(), /Select two or three different tools/);
  await page.goto(base+'/compare/?category=CRM&tools=hubspot,pipedrive,%3Cimg%3E',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#compare-third').inputValue(),'','Unsafe URL tool id is discarded');
  await page.locator('#compare-search').fill('pipe');
  assert.deepEqual(await page.locator('#compare-first option').allTextContents(),['Pipedrive']);
  await page.locator('#compare-search').fill('');
  await page.locator('#compare-workflow').selectOption('sales');
  assert.deepEqual(await page.locator('#compare-first option').allTextContents(),['HubSpot','Pipedrive']);
  await checkAccessibility(page, 'interactive Hosting comparison');


  for (const slug of ['hubspot', 'pipedrive', 'semrush', 'ahrefs', 'kinsta', 'cloudways']) {
    const resp = await page.goto(base + '/software/' + slug + '/', { waitUntil: 'domcontentloaded' });
    assert.equal(resp?.status(), 200, 'Missing profile ' + slug);
    assert.match(await page.locator('main').innerText(), /pricing.*not verified|pricing.*current plans/i);
    if (slug === 'hubspot') await checkAccessibility(page, 'software profile');
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /\bindex\b/);
  }
  for (const route of ['/methodology/', '/disclosure/', '/privacy/', '/research/']) {
    const resp = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    assert.equal(resp?.status(), 200);
    const robotsContent = await page.locator('meta[name="robots"]').getAttribute('content');
    if (route === '/research/') {
      assert.match(robotsContent, /noindex/);
    } else {
      assert.match(robotsContent, /\bindex\b/);
    }
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
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /\bindex\b/);
  const worksheetOutbound=[];
  const captureWorksheetRequest=req=>{
    if(req.method()!=='GET' || !req.url().startsWith(base)) worksheetOutbound.push({method:req.method(),url:req.url()});
  };
  page.on('request',captureWorksheetRequest);
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
  assert.ok(exportedCsv.split(/\r\n/).length>=3,'CSV includes selected requirements');
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

  page.off('request',captureWorksheetRequest);
  assert.deepEqual(worksheetOutbound,[],'Worksheet interactions must not submit counts or contact external endpoints');

  // Pricing truth: calculate only buyer-supplied prices, never vendor claims.
  await page.goto(base + '/tools/software-cost-calculator/', { waitUntil:'networkidle' });
  assert.match(await page.title(), /StackPilot AI/);
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /\bindex\b/);
  const calculatorOutbound=[];
  const captureCalculatorRequest=req=>{
    if(req.method()!=='GET' || !req.url().startsWith(base)) calculatorOutbound.push({method:req.method(),url:req.url()});
  };
  page.on('request',captureCalculatorRequest);
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
  // Changing an entered-cost estimate must invalidate the old displayed and copyable report.
  await page.locator('#cost-a-flatMonthly').fill('11.10');
  assert.equal(await page.locator('#cost-report').inputValue(),'','Editing a cost must clear the stale estimate');
  assert.ok(await page.locator('#cost-copy').isDisabled(),'Editing a cost must disable copying the old estimate');
  assert.match(await page.locator('#cost-status').innerText(),/Inputs changed/i);
  await page.locator('#cost-calculate').click();
  assert.ok(await page.locator('#cost-copy').isEnabled());
  await page.locator('#cost-currency').selectOption('USD');
  assert.equal(await page.locator('#cost-report').inputValue(),'','Currency change must invalidate the estimate');
  assert.ok(await page.locator('#cost-copy').isDisabled());
  await page.locator('#cost-calculate').click();
  await page.locator('#cost-months').selectOption('6');
  assert.equal(await page.locator('#cost-report').inputValue(),'','Horizon change must invalidate the estimate');
  assert.ok(await page.locator('#cost-copy').isDisabled());
  await page.locator('#cost-a-flatMonthly').fill('-1');
  await page.locator('#cost-calculate').click();
  assert.match(await page.locator('#cost-status').innerText(),/Invalid .*amount/i);
  assert.equal(await page.locator('#cost-report').inputValue(),'');
  assert.ok(await page.locator('#cost-copy').isDisabled());
  await page.locator('#cost-reset').click();
  assert.equal(await page.locator('#cost-a-flatMonthly').inputValue(),'0');
  assert.equal(await page.locator('#cost-report').inputValue(),'');


  page.off('request',captureCalculatorRequest);
  assert.deepEqual(calculatorOutbound,[],'Cost calculator interactions must not submit quotes or contact external endpoints');

  // Capture requests during buyer-entered CRM seat auditing. No entered data may be submitted.
  const auditRequests=[];
  const captureAuditRequest=request=>{
    if(request.method()!=='GET' || !request.url().startsWith(base)) auditRequests.push({method:request.method(),url:request.url()});
  };
  page.on('request',captureAuditRequest);

  // CRM seat audit: strictly buyer-supplied counts and no inferred savings.
  await page.goto(base+'/tools/crm-seat-audit/',{waitUntil:'networkidle'});
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/\bindex\b/);
  await page.locator('#seat-billedSeats').fill('8');
  await page.locator('#seat-occupiedPaidSeats').fill('5');
  await page.locator('#seat-activeUsers').fill('5');
  await page.locator('#seat-deactivatedUsers').fill('1');
  await page.locator('#seat-form button[type="submit"]').click();
  assert.match(await page.locator('#seat-report').inputValue(),/62\.50%/);
  assert.match(await page.locator('#seat-report').inputValue(),/Billing impact: UNKNOWN/);
  assert.match(await page.locator('#seat-report').inputValue(),/INCOMPLETE/);
  await page.locator('#seat-accountModelConfirmed').check();
  await page.locator('#seat-roleRequirementsConfirmed').check();
  await page.locator('#seat-billingChangeDateConfirmed').check();
  assert.equal(await page.locator('#seat-report').inputValue(),'','Changed checks must invalidate stale report');
  await page.locator('#seat-form button[type="submit"]').click();
  assert.match(await page.locator('#seat-report').inputValue(),/READY_FOR_HUMAN_REVIEW/);
  assert.match(await page.locator('#seat-report').inputValue(),/refund entitlement/);
  await page.locator('#seat-occupiedPaidSeats').fill('9');
  await page.locator('#seat-form button[type="submit"]').click();
  assert.match(await page.locator('#seat-status').innerText(),/cannot exceed billed seats/);
  assert.equal(await page.locator('#seat-report').inputValue(),'');
  assert.ok(await page.locator('#seat-copy').isDisabled());
  // A form reset must not preserve a human-review status, stale report or confirmation flags.
  await page.locator('#seat-form button[type="reset"]').click();
  assert.equal(await page.locator('#seat-report').inputValue(),'');
  assert.ok(await page.locator('#seat-copy').isDisabled());
  for(const id of ['seat-accountModelConfirmed','seat-roleRequirementsConfirmed','seat-billingChangeDateConfirmed']){
    assert.ok(!(await page.locator('#'+id).isChecked()),'Reset must clear '+id);
  }
  assert.equal(await page.locator('#seat-billedSeats').inputValue(),'0');
  assert.equal(await page.locator('#seat-occupiedPaidSeats').inputValue(),'0');
  assert.match(await page.locator('#seat-status').innerText(),/Worksheet cleared/);
  await page.locator('#seat-form button[type="submit"]').click();
  assert.match(await page.locator('#seat-report').inputValue(),/INCOMPLETE/);
  assert.doesNotMatch(await page.locator('#seat-report').inputValue(),/READY_FOR_HUMAN_REVIEW/);
  await checkAccessibility(page,'CRM paid-seat audit desktop');
  await page.screenshot({path:output+'/crm-seat-audit-desktop.png',fullPage:true});
  page.off('request',captureAuditRequest);
  assert.deepEqual(auditRequests,[],'CRM audit must not submit form data or request third-party resources');

  // SEO scope tool: user-entered inventory, never a live crawl or a vendor cap claim.
  const seoOutbound=[];
  const trackSeoRequest=request=>{
    if(request.method()!=='GET' || !request.url().startsWith(base))
      seoOutbound.push({method:request.method(),url:request.url()});
  };
  page.on('request',trackSeoRequest);
  await page.goto(base+'/tools/seo-audit-scope/',{waitUntil:'networkidle'});
  assert.match(await page.title(),/SEO audit scope planner/);
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/\bindex\b/);
  await page.locator('#seo-rootPages').fill('80');
  await page.locator('#seo-folderPages').fill('20');
  await page.locator('#seo-subdomainPages').fill('40');
  await page.locator('#seo-pageCap').fill('90');
  await page.locator('#seo-form button[type="submit"]').click();
  assert.match(await page.locator('#seo-report').inputValue(),/Planned included URLs: 100/);
  assert.match(await page.locator('#seo-report').inputValue(),/Excluded inventory URLs: 40/);
  assert.match(await page.locator('#seo-report').inputValue(),/Excess above user-entered cap: 10/);
  assert.match(await page.locator('#seo-report').inputValue(),/Provider allowance: UNVERIFIED/);
  assert.ok(await page.locator('#seo-download').isEnabled(),'Valid planned scope enables CSV download');
  const seoCsvPromise=page.waitForEvent('download');
  await page.locator('#seo-download').click();
  const seoCsvDownload=await seoCsvPromise;
  assert.equal(seoCsvDownload.suggestedFilename(),'stackpilot-seo-audit-scope.csv');
  const seoStream=await seoCsvDownload.createReadStream();
  const seoChunks=[];
  for await(const chunk of seoStream)seoChunks.push(Buffer.from(chunk));
  const seoCsv=Buffer.concat(seoChunks).toString('utf8');
  assert.match(seoCsv,/^metric,value,verification_status\r\n/);
  assert.match(seoCsv,/"planned_included_urls","100","User-entered only"/);
  assert.match(seoCsv,/"excluded_inventory_urls","40","User-entered only"/);
  assert.match(seoCsv,/"excess_above_user_cap","10","Not a vendor allowance"/);
  assert.match(seoCsv,/"provider_crawl_credits","","UNKNOWN"/);
  await page.locator('#seo-includeSubdomains').check();
  assert.equal(await page.locator('#seo-report').inputValue(),'','Scope change must invalidate stale report');
  assert.ok(await page.locator('#seo-download').isDisabled(),'Scope change must disable stale CSV download');
  assert.ok(await page.locator('#seo-copy').isDisabled());
  await page.locator('#seo-form button[type="submit"]').click();
  assert.match(await page.locator('#seo-report').inputValue(),/Planned included URLs: 140/);
  assert.match(await page.locator('#seo-report').inputValue(),/Excess above user-entered cap: 50/);
  await page.locator('#seo-rootPages').fill('01');
  await page.locator('#seo-form button[type="submit"]').click();
  assert.match(await page.locator('#seo-status').innerText(),/Invalid rootPages/);
  assert.equal(await page.locator('#seo-report').inputValue(),'');
  assert.ok(await page.locator('#seo-copy').isDisabled());
  assert.ok(await page.locator('#seo-download').isDisabled(),'Invalid counts disable export');
  await page.locator('#seo-form button[type="reset"]').click();
  assert.equal(await page.locator('#seo-report').inputValue(),'');
  assert.ok(await page.locator('#seo-copy').isDisabled());
  assert.ok(await page.locator('#seo-download').isDisabled(),'Reset disables download');
  await checkAccessibility(page,'SEO audit scope planner desktop');
  await page.screenshot({path:output+'/seo-audit-scope-desktop.png',fullPage:true});
  page.off('request',trackSeoRequest);
  assert.deepEqual(seoOutbound,[],'SEO scope planner must not submit counts or request remote resources');



  // Substantial guide: exact fictional cost illustration, prelaunch indexing and links.

  await page.goto(base + '/guides/saas-total-cost-of-ownership/', {waitUntil:'networkidle'});
  assert.match(await page.title(),/SaaS total cost of ownership/);
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/\bindex\b/);
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
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /\bindex\b/);
  const migrationText = await page.locator('main').innerText();
  for (const topic of ['permissions','deduplication','rollback','staff hours','sample import']) {
    assert.match(migrationText, new RegExp(topic,'i'));
  }
  await checkAccessibility(page,'CRM migration checklist desktop');
  await page.screenshot({path:output+'/crm-migration-desktop.png',fullPage:true});

  // CRM migration readiness: demonstrate safe aggregate reconciliation and offline export.
  const crmNetwork=[];
  const trackCrmRequest=req=>{
    if(req.method()!=='GET'||!req.url().startsWith(base))
      crmNetwork.push({method:req.method(),url:req.url()});
  };
  page.on('request',trackCrmRequest);
  await page.goto(base+'/tools/crm-migration-readiness/',{waitUntil:'networkidle'});
  assert.match(await page.locator('h1').innerText(),/CRM migration readiness/i);
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/\bindex\b/);
  assert.equal(await page.locator('#crm-form select').count(),5);
  assert.ok(await page.locator('#crm-download').isDisabled());
  await page.locator('#crm-form button[type="submit"]').click();
  assert.match(await page.locator('#crm-status').innerText(),/invalid/i);
  for(const [key,value] of Object.entries({
    sourceRecordCount:'1200',targetRecordCount:'1193',
    cutoverWindowMinutes:'90',measuredRollbackMinutes:'30'
  })){
    await page.locator('#crm-'+key).fill(value);
  }
  await page.locator('#crm-form button[type="submit"]').click();
  assert.match(await page.locator('#crm-report').inputValue(),/NO_GO/);
  assert.match(await page.locator('#crm-report').inputValue(),/record discrepancy: 7/i);
  assert.ok(await page.locator('#crm-download').isEnabled());
  for(const id of ['exportPermission','mappingValidation','associationOwnership','integrationChecks','backupRestore'])
    await page.locator('#crm-'+id).selectOption('pass');
  assert.equal(await page.locator('#crm-report').inputValue(),'');
  assert.ok(await page.locator('#crm-download').isDisabled());
  await page.locator('#crm-form button[type="submit"]').click();
  assert.match(await page.locator('#crm-report').inputValue(),/NO_GO/,'Count mismatch must block even if all gates pass');
  await page.locator('#crm-targetRecordCount').fill('1200');
  assert.equal(await page.locator('#crm-report').inputValue(),'');
  await page.locator('#crm-form button[type="submit"]').click();
  assert.match(await page.locator('#crm-report').inputValue(),/READY_FOR_HUMAN_REVIEW/);
  assert.match(await page.locator('#crm-report').inputValue(),/not authorization/i);
  const crmDownloadPromise=page.waitForEvent('download');
  await page.locator('#crm-download').click();
  const crmDownload=await crmDownloadPromise;
  assert.equal(crmDownload.suggestedFilename(),'stackpilot-crm-migration-readiness.csv');
  const crmStream=await crmDownload.createReadStream();
  const crmChunks=[];
  for await(const chunk of crmStream)crmChunks.push(Buffer.from(chunk));
  const crmCsv=Buffer.concat(crmChunks).toString('utf8');
  assert.match(crmCsv,/^check,value,evidence_status\r\n/);
  assert.match(crmCsv,/"record_discrepancy","0","SELF_REPORTED"/);
  assert.match(crmCsv,/"migration_authorized","false","SELF_REPORTED"/);
  await page.locator('#crm-measuredRollbackMinutes').fill('91');
  assert.ok(await page.locator('#crm-download').isDisabled());
  await page.locator('#crm-form button[type="submit"]').click();
  assert.match(await page.locator('#crm-report').inputValue(),/rollbackExceedsWindow/);
  await page.locator('#crm-form button[type="reset"]').click();
  assert.ok(await page.locator('#crm-download').isDisabled());
  assert.equal(await page.locator('#crm-report').inputValue(),'');
  assert.deepEqual(crmNetwork,[],'CRM worksheet must never submit entered values');
  page.off('request',trackCrmRequest);
  await checkAccessibility(page,'CRM migration readiness desktop');
  await page.screenshot({path:output+'/crm-readiness-desktop.png',fullPage:true});

  // Owner-hosted UAT assistance: locally exercised self-report, NEVER a hosted account check.
  const uatOutbound=[];
  const trackUatRequest=req=>{
    if(req.method()!=='GET'||!req.url().startsWith(base))
      uatOutbound.push({method:req.method(),url:req.url()});
  };
  page.on('request',trackUatRequest);
  await page.goto(base+'/tools/private-uat-worksheet/',{waitUntil:'networkidle'});
  assert.match(await page.locator('h1').innerText(),/Private owner UAT evidence worksheet/);
  const ownerPrContext=await page.locator('#owner-uat-pr-context').innerText();
  const ownerPrLink=await page.locator('#owner-uat-github-pr').getAttribute('href');
  const ownerExpectedLabel=await page.locator('label[for="owner-uat-expectedSha"]').innerText();
  if(/identity unavailable/i.test(ownerPrContext)){
    assert.match(ownerPrContext,/BLOCKED/i,'Unknown local preview context must be visibly blocked');
    assert.match(ownerPrLink,/\/pulls$/,'Unknown build must not link a stale fixed PR');
    assert.match(ownerExpectedLabel,/current draft PR HEAD SHA/);
  }else{
    assert.match(ownerPrContext,/Netlify build metadata identifies preview PR #\d+/);
    assert.match(ownerPrLink,/\/pull\/\d+$/);
    assert.match(ownerExpectedLabel,/Expected PR #\d+ HEAD SHA/);
  }
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
  assert.equal(await page.locator('#owner-uat-form select').count(),6);
  assert.ok(await page.locator('#owner-uat-download').isDisabled());
  await page.locator('#owner-uat-form button[type="submit"]').click();
  assert.match(await page.locator('#owner-uat-status').innerText(),/Invalid.*Git commit SHA/i);
  const testShaA='0123456789abcdef0123456789abcdef01234567';
  const testShaB='0123456789abcdef0123456789abcdef01234568';
  await page.locator('#owner-uat-expectedSha').fill(testShaA);
  await page.locator('#owner-uat-observedSha').fill(testShaB);
  await page.locator('#owner-uat-form button[type="submit"]').click();
  assert.match(await page.locator('#owner-uat-report').inputValue(),/BLOCKED_UNVERIFIED/);
  assert.match(await page.locator('#owner-uat-report').inputValue(),/commitMismatch/);
  assert.ok(await page.locator('#owner-uat-download').isEnabled());
  for(const id of ['previewSha','authenticatedRoutes','anonymousDenial','liveHeaders','privateAndLocked','billingAnalytics'])
    await page.locator('#owner-uat-'+id).selectOption('pass');
  assert.equal(await page.locator('#owner-uat-report').inputValue(),'');
  assert.ok(await page.locator('#owner-uat-download').isDisabled());
  await page.locator('#owner-uat-form button[type="submit"]').click();
  assert.match(await page.locator('#owner-uat-report').inputValue(),/BLOCKED_UNVERIFIED/,'Mismatch must never become a pass');
  await page.locator('#owner-uat-observedSha').fill(testShaA);
  assert.equal(await page.locator('#owner-uat-report').inputValue(),'');
  await page.locator('#owner-uat-form button[type="submit"]').click();
  const uatReport=await page.locator('#owner-uat-report').inputValue();
  assert.match(uatReport,/OWNER_SELF_REPORTED_ONLY/);
  assert.match(uatReport,/not a public-release authorization/i);
  const ownerUatDownload=page.waitForEvent('download');
  await page.locator('#owner-uat-download').click();
  const ownerUatFile=await ownerUatDownload;
  assert.equal(ownerUatFile.suggestedFilename(),'stackpilot-owner-uat-evidence.csv');
  const ownerUatStream=await ownerUatFile.createReadStream();
  const ownerUatChunks=[];
  for await(const part of ownerUatStream)ownerUatChunks.push(Buffer.from(part));
  const ownerUatCsv=Buffer.concat(ownerUatChunks).toString('utf8');
  assert.match(ownerUatCsv,/^check,value,evidence_status\r\n/);
  assert.match(ownerUatCsv,/"public_release_authorized","false","SELF_REPORTED"/);
  assert.match(ownerUatCsv,/"hosted_uat_independently_verified","false","SELF_REPORTED"/);
  await page.locator('#owner-uat-liveHeaders').selectOption('fail');
  assert.ok(await page.locator('#owner-uat-download').isDisabled());
  assert.equal(await page.locator('#owner-uat-report').inputValue(),'');
  await page.locator('#owner-uat-form button[type="submit"]').click();
  assert.match(await page.locator('#owner-uat-report').inputValue(),/BLOCKED_UNVERIFIED/);
  await page.locator('#owner-uat-form button[type="reset"]').click();
  assert.ok(await page.locator('#owner-uat-download').isDisabled());
  assert.equal(await page.locator('#owner-uat-report').inputValue(),'');
  assert.deepEqual(uatOutbound,[],'Owner UAT worksheet must never transmit entered values');
  page.off('request',trackUatRequest);
  await checkAccessibility(page,'private owner UAT worksheet desktop');
  await page.screenshot({path:output+'/owner-uat-desktop.png',fullPage:true});

  // Hosting migration guide: category-balanced buyer education; no vendor endorsements.
  await page.goto(base + '/guides/hosting-migration-checklist/', {waitUntil:'networkidle'});
  assert.match(await page.locator('h1').innerText(), /Hosting migration checklist/);
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /\bindex\b/);
  const hostingGuideText=await page.locator('main').innerText();
  for (const topic of ['DNS','backups','restore','TLS','rollback','data retention','GO/NO-GO']) {
    assert.match(hostingGuideText,new RegExp(topic,'i'));
  }
  assert.equal(await page.locator('main section').count(),7);
  assert.equal(await page.locator('tbody tr').count(),5);
  await checkAccessibility(page,'hosting migration checklist desktop');
  await page.screenshot({path:output+'/hosting-migration-desktop.png',fullPage:true});


  // Hosting cutover assessor: never self-authorize a migration.
  const gateOutbound=[];
  const trackGateRequest=req=>{
    if(req.method()!=='GET' || !req.url().startsWith(base))
      gateOutbound.push({method:req.method(),url:req.url()});
  };
  page.on('request',trackGateRequest);
  await page.goto(base+'/tools/hosting-cutover-gates/',{waitUntil:'networkidle'});
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/\bindex\b/);
  assert.equal(await page.locator('#gate-form select').count(),5);
  assert.ok(await page.locator('#gate-download').isDisabled());
  await page.locator('#gate-form button[type="submit"]').click();
  assert.match(await page.locator('#gate-report').inputValue(),/NO_GO/);
  assert.match(await page.locator('#gate-report').inputValue(),/Not assessed: 5/);
  for(const id of ['dnsEmail','backupRestore','tlsDependencies','rollbackAuthority','retentionBilling']){
    await page.locator('#gate-'+id).selectOption('pass');
  }
  assert.equal(await page.locator('#gate-report').inputValue(),'','Changing evidence invalidates prior assessment');
  await page.locator('#gate-form button[type="submit"]').click();
  assert.match(await page.locator('#gate-report').inputValue(),/READY_FOR_HUMAN_REVIEW/);
  assert.match(await page.locator('#gate-report').inputValue(),/not authorization/);
  const hostingGateDownload=page.waitForEvent('download');
  await page.locator('#gate-download').click();
  const gateFile=await hostingGateDownload;
  assert.equal(gateFile.suggestedFilename(),'stackpilot-hosting-cutover-gates.csv');
  const gateStream=await gateFile.createReadStream();
  const gateChunks=[];
  for await(const part of gateStream)gateChunks.push(Buffer.from(part));
  const gateCsv=Buffer.concat(gateChunks).toString('utf8');
  assert.match(gateCsv,/^gate,status,evidence_status\r\n/);
  assert.match(gateCsv,/"overall_readiness","READY_FOR_HUMAN_REVIEW","UNVERIFIED"/);
  assert.match(gateCsv,/"launch_authorized","false","UNVERIFIED"/);
  await page.locator('#gate-backupRestore').selectOption('fail');
  assert.ok(await page.locator('#gate-download').isDisabled(),'Changed gate invalidates prior CSV');
  await page.locator('#gate-form button[type="submit"]').click();
  assert.match(await page.locator('#gate-report').inputValue(),/NO_GO/);
  assert.match(await page.locator('#gate-report').inputValue(),/Backup restore: fail/);
  await page.locator('#gate-form button[type="reset"]').click();
  assert.equal(await page.locator('#gate-report').inputValue(),'');
  assert.ok(await page.locator('#gate-copy').isDisabled());
  assert.ok(await page.locator('#gate-download').isDisabled());
  assert.equal(await page.locator('#gate-backupRestore').inputValue(),'not-assessed');
  await checkAccessibility(page,'hosting cutover assessor desktop');
  await page.screenshot({path:output+'/hosting-cutover-assessor-desktop.png',fullPage:true});
  page.off('request',trackGateRequest);
  assert.deepEqual(gateOutbound,[],'Hosting assessor must not submit selections or load external resources');

  // Backup restore drill: browser-only RTO/RPO planning, never cutover permission.
  const drillOutbound=[];
  const trackDrillRequest=req=>{
    if(req.method()!=='GET'||!req.url().startsWith(base))
      drillOutbound.push({method:req.method(),url:req.url()});
  };
  page.on('request',trackDrillRequest);
  await page.goto(base+'/tools/backup-restore-drill/',{waitUntil:'networkidle'});
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/\bindex\b/);
  assert.ok(await page.locator('#drill-download').isDisabled());
  await page.locator('#drill-form button[type="submit"]').click();
  assert.match(await page.locator('#drill-report').inputValue(),/NO_GO/);
  assert.match(await page.locator('#drill-report').inputValue(),/UNKNOWN/);
  await page.locator('#drill-observedRestoreMinutes').fill('75');
  await page.locator('#drill-observedRecoveryPointAgeMinutes').fill('25');
  await page.locator('#drill-restoreTested').check();
  await page.locator('#drill-dataIntegrityChecked').check();
  assert.equal(await page.locator('#drill-report').inputValue(),'','Changes invalidate previous report');
  await page.locator('#drill-form button[type="submit"]').click();
  assert.match(await page.locator('#drill-report').inputValue(),/READY_FOR_HUMAN_REVIEW/);
  assert.match(await page.locator('#drill-report').inputValue(),/not authorization/);
  assert.ok(await page.locator('#drill-download').isEnabled());
  const drillCsvPromise=page.waitForEvent('download');
  await page.locator('#drill-download').click();
  const drillCsvFile=await drillCsvPromise;
  assert.equal(drillCsvFile.suggestedFilename(),'stackpilot-backup-restore-drill.csv');
  const drillCsvStream=await drillCsvFile.createReadStream();
  const drillCsvChunks=[];
  for await(const part of drillCsvStream)drillCsvChunks.push(Buffer.from(part));
  const drillCsv=Buffer.concat(drillCsvChunks).toString('utf8');
  assert.match(drillCsv,/^metric,value,evidence_status\r\n/);
  assert.match(drillCsv,/"observed_restore_minutes","75","UNVERIFIED"/);
  assert.match(drillCsv,/"readiness","READY_FOR_HUMAN_REVIEW","UNVERIFIED"/);
  assert.match(drillCsv,/"cutover_authorized","false","UNVERIFIED"/);
  await page.locator('#drill-observedRestoreMinutes').fill('140');
  assert.ok(await page.locator('#drill-download').isDisabled(),'Editing time disables stale CSV');
  assert.equal(await page.locator('#drill-report').inputValue(),'');
  await page.locator('#drill-form button[type="submit"]').click();
  assert.match(await page.locator('#drill-report').inputValue(),/NO_GO/);
  await page.locator('#drill-form button[type="reset"]').click();
  assert.equal(await page.locator('#drill-report').inputValue(),'');
  assert.ok(await page.locator('#drill-download').isDisabled());
  assert.equal(await page.locator('#drill-observedRestoreMinutes').inputValue(),'');
  await checkAccessibility(page,'backup restore drill planner desktop');
  await page.screenshot({path:output+'/backup-restore-drill-desktop.png',fullPage:true});
  page.off('request',trackDrillRequest);
  assert.deepEqual(drillOutbound,[],'Restore drill must not submit values or load external resources');

  // Hosting hidden-cost planner: full quote decomposition and offline CSV, no submissions.
  const hostingOutbound=[];
  const trackHostingRequest=req=>{
    if(req.method()!=='GET'||!req.url().startsWith(base))
      hostingOutbound.push({method:req.method(),url:req.url()});
  };
  page.on('request',trackHostingRequest);
  await page.goto(base+'/tools/hosting-hidden-costs/',{waitUntil:'networkidle'});
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/\bindex\b/);
  assert.ok(await page.locator('#hosting-download').isDisabled());
  await page.locator('#hosting-form button[type="submit"]').click();
  assert.equal(await page.locator('#hosting-report').inputValue(),'','Empty required fields cannot create a quote');
  for(const [key,value] of Object.entries({
    overlapMonths:'2',baseMonthly:'100.10',backupMonthly:'5.25',bandwidthMonthly:'10',
    supportMonthly:'20',otherMonthly:'4.65',oldHostingMonthly:'70',
    migrationOnce:'240.50',cancellationOnce:'15.25'
  }))await page.locator('#hosting-'+key).fill(value);
  await page.locator('#hosting-form button[type="submit"]').click();
  const hostingReport=await page.locator('#hosting-report').inputValue();
  assert.match(hostingReport,/INR 2075\.75/);
  assert.match(hostingReport,/INR 874\.55/);
  assert.match(hostingReport,/not a verified provider quote/i);
  assert.ok(await page.locator('#hosting-download').isEnabled());
  const hostingDownload=page.waitForEvent('download');
  await page.locator('#hosting-download').click();
  const hostingFile=await hostingDownload;
  assert.equal(hostingFile.suggestedFilename(),'stackpilot-hosting-hidden-costs.csv');
  const hostingStream=await hostingFile.createReadStream();
  const hostingChunks=[];
  for await(const part of hostingStream)hostingChunks.push(Buffer.from(part));
  const hostingCsv=Buffer.concat(hostingChunks).toString('utf8');
  assert.match(hostingCsv,/^metric,value,evidence_status\r\n/);
  assert.match(hostingCsv,/"total","2075\.75","UNVERIFIED"/);
  assert.match(hostingCsv,/"provider_quote_verified","false","UNVERIFIED"/);
  await page.locator('#hosting-backupMonthly').fill('8');
  assert.equal(await page.locator('#hosting-report').inputValue(),'','Edit must invalidate stale report');
  assert.ok(await page.locator('#hosting-download').isDisabled());
  assert.ok(await page.locator('#hosting-copy').isDisabled());
  await page.locator('#hosting-form button[type="submit"]').click();
  assert.match(await page.locator('#hosting-report').inputValue(),/INR 2108\.75/);
  await page.locator('#hosting-baseMonthly').fill('-1');
  await page.locator('#hosting-form button[type="submit"]').click();
  assert.ok(await page.locator('#hosting-download').isDisabled(),'Invalid amount must not export');
  await page.locator('#hosting-form button[type="reset"]').click();
  assert.equal(await page.locator('#hosting-report').inputValue(),'');
  assert.equal(await page.locator('#hosting-baseMonthly').inputValue(),'');
  assert.ok(await page.locator('#hosting-download').isDisabled());
  await checkAccessibility(page,'hosting hidden-cost worksheet desktop');
  await page.screenshot({path:output+'/hosting-hidden-costs-desktop.png',fullPage:true});
  page.off('request',trackHostingRequest);
  assert.deepEqual(hostingOutbound,[],'Hosting cost tool must not transmit amounts or load outside resources');



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

  const mobileAuditRequests=[];
  const captureMobileAuditRequest=request=>{
    if(request.method()!=='GET'||!request.url().startsWith(base)) mobileAuditRequests.push({method:request.method(),url:request.url()});
  };
  page.on('request',captureMobileAuditRequest);
  await page.goto(base+'/tools/crm-seat-audit/',{waitUntil:'networkidle'});
  await page.locator('#seat-billedSeats').fill('8');
  await page.locator('#seat-occupiedPaidSeats').fill('5');
  await page.locator('#seat-form button[type="submit"]').click();
  assert.match(await page.locator('#seat-report').inputValue(),/62\.50%/);
  page.off('request',captureMobileAuditRequest);
  assert.deepEqual(mobileAuditRequests,[],'CRM paid-seat audit mobile must not submit buyer-entered counts');
  await checkAccessibility(page,'CRM paid-seat audit mobile');
  await page.screenshot({path:output+'/crm-seat-audit-mobile.png',fullPage:true});
  const seatAuditOverflow=await page.evaluate(()=>({width:document.documentElement.scrollWidth, offenders:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>window.innerWidth+4).slice(0,8).map(el=>({tag:el.tagName.toLowerCase(),id:el.id,cls:el.className,right:Math.round(el.getBoundingClientRect().right)}))}));
  assert.ok(seatAuditOverflow.width<=395,'CRM seat audit mobile overflow: '+JSON.stringify(seatAuditOverflow));

  // Mobile SEO scope plan: use the same model without hidden fields or layout overflow.
  await page.goto(base+'/tools/seo-audit-scope/',{waitUntil:'networkidle'});
  await page.locator('#seo-rootPages').fill('80');
  await page.locator('#seo-folderPages').fill('20');
  await page.locator('#seo-subdomainPages').fill('40');
  await page.locator('#seo-pageCap').fill('90');
  await page.locator('#seo-form button[type="submit"]').click();
  assert.match(await page.locator('#seo-report').inputValue(),/Planned included URLs: 100/);
  assert.ok(await page.locator('#seo-download').isEnabled());
  const mobileSeoCsvPromise=page.waitForEvent('download');
  await page.locator('#seo-download').click();
  const mobileSeoDownload=await mobileSeoCsvPromise;
  assert.equal(mobileSeoDownload.suggestedFilename(),'stackpilot-seo-audit-scope.csv');
  await page.locator('#seo-pageCap').fill('95');
  assert.ok(await page.locator('#seo-download').isDisabled(),'Editing a mobile cap must invalidate previous download');
  await checkAccessibility(page,'SEO audit scope planner mobile');
  const seoWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
  assert.ok(seoWidth<=395,'SEO scope mobile overflow: '+seoWidth);
  await page.screenshot({path:output+'/seo-audit-scope-mobile.png',fullPage:true});


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


  await page.goto(base+'/tools/backup-restore-drill/',{waitUntil:'networkidle'});
  await page.locator('#drill-observedRestoreMinutes').fill('75');
  await page.locator('#drill-observedRecoveryPointAgeMinutes').fill('25');
  await page.locator('#drill-form button[type="submit"]').click();
  assert.match(await page.locator('#drill-report').inputValue(),/NO_GO/);
  assert.ok(await page.locator('#drill-download').isEnabled(),'NO_GO reports can be saved for a human review');
  await checkAccessibility(page,'backup restore drill planner mobile');
  assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=395,'Restore planner mobile overflow');
  await page.screenshot({path:output+'/backup-restore-drill-mobile.png',fullPage:true});

  await page.goto(base+'/tools/hosting-hidden-costs/',{waitUntil:'networkidle'});
  for(const key of ['overlapMonths','backupMonthly','bandwidthMonthly','supportMonthly',
    'otherMonthly','oldHostingMonthly','migrationOnce','cancellationOnce']){
    await page.locator('#hosting-'+key).fill('0');
  }
  await page.locator('#hosting-baseMonthly').fill('10');
  await page.locator('#hosting-form button[type="submit"]').click();
  assert.match(await page.locator('#hosting-report').inputValue(),/INR 120\.00/);
  await checkAccessibility(page,'hosting hidden-cost worksheet mobile');
  assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=395,'Hosting cost mobile overflow');
  await page.screenshot({path:output+'/hosting-hidden-costs-mobile.png',fullPage:true});

  await page.goto(base+'/tools/hosting-cutover-gates/',{waitUntil:'networkidle'});
  await page.locator('#gate-form button[type="submit"]').click();
  assert.match(await page.locator('#gate-report').inputValue(),/NO_GO/);
  await checkAccessibility(page,'hosting cutover assessor mobile');
  assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=395,'Hosting assessor mobile overflow');
  await page.screenshot({path:output+'/hosting-cutover-assessor-mobile.png',fullPage:true});

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


  // Full-build browser gate: every emitted page, at BOTH canonical desktop and mobile widths.
  // This is local static preview QA only, not authenticated hosted Netlify UAT.
  const privateBuiltRoutes = new Set(['/tools/private-uat-worksheet/', '/preview-build/', '/research/']);
  const allBuiltRoutes=routePathsFromBuiltHtml(emittedBuildFiles());
  for(const viewport of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}]){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    const visited=[];
    for(const route of allBuiltRoutes){
      const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
      assert.equal(response?.status(),200,'Build route browser HTTP failure: '+route+' '+viewport.name);
      assert.equal(await page.locator('h1').count(),1,'Expected one h1 in '+route+' '+viewport.name);
      assert.ok((await page.locator('h1').innerText()).trim().length>0,'Empty h1 in '+route);
      const robotsContent=await page.locator('meta[name="robots"]').getAttribute('content');
      if(privateBuiltRoutes.has(route)) {
        assert.match(robotsContent,/noindex/,'Private page unexpectedly indexable: '+route);
      } else {
        assert.match(robotsContent,/\bindex\b/,'Public page missing index directive: '+route);
        assert.doesNotMatch(robotsContent,/noindex/,'Public page unexpectedly has noindex: '+route);
      }
      await checkAccessibility(page, 'built '+route+' '+viewport.name);
      if(viewport.name==='mobile'){
        const scrollWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
        assert.ok(scrollWidth<=395,'New mobile horizontal overflow on '+route+': '+scrollWidth);
      }
      visited.push(route);
    }
    const count=assertExactBrowserRouteCoverage(allBuiltRoutes,visited);
    console.log('Static browser accessibility sweep:',count,'of',count,'built pages',viewport.name,'PASS');
  }

  assert.deepEqual(errors, [], 'Browser JavaScript or local resource failures');
  console.log('Browser QA passed: desktop/mobile, 3 advisor scenarios, 6 profiles, interactive category comparisons, private requirements worksheet, cost calculator and SaaS TCO guide, 3 trust pages.');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
