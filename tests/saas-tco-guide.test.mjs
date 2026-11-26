import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {compareSubscriptionCosts,formatMinorUnits} from '../src/lib/cost-comparison.mjs';

const page='src/pages/guides/saas-total-cost-of-ownership/index.astro';
const text=()=>readFileSync(page,'utf8');
const optionA={flatMonthly:'20.00',seatMonthly:'10.00',seats:'5',extrasMonthly:'5.00',oneTimeFee:'100.00'};
const optionB={flatMonthly:'55.00',seatMonthly:'3.00',seats:'5',extrasMonthly:'8.00',oneTimeFee:'0.00'};

test('TCO guide exists as its own prelaunch Astro route',()=>{
 assert.ok(existsSync(page),'Missing SaaS TCO guide route');
 assert.match(text(),/<meta name="robots" content="index, follow"/);
 assert.match(text(),/<h1[^>]*>SaaS total cost of ownership/);
 assert.match(text(),/<title>[^<]*SaaS[^<]*total cost/i);
});
test('worked cost example is explicitly hypothetical and uses existing exact calculator',()=>{
 const c=compareSubscriptionCosts({currency:'USD',months:12,optionA,optionB});
 assert.equal(c.optionA.totalMinor,100000);
 assert.equal(c.optionB.totalMinor,93600);
 assert.equal(c.differenceMinor,6400);
 assert.equal(c.lowerCost,'B');
 assert.equal(formatMinorUnits(c.optionA.totalMinor,'USD'),'USD 1000.00');
 const content=text();
 assert.match(content,/import \{\s*compareSubscriptionCosts\s*,\s*formatMinorUnits\s*\}/);
 assert.match(content,/hypothetical/i);
 assert.match(content,/example\.optionA\.totalMinor/);
 assert.match(content,/example\.optionB\.totalMinor/);
 assert.match(content,/example\.differenceMinor/);
 assert.match(content,/not a quote/i);
});
test('guide covers buyer intent and cost pitfalls rather than unverified vendor claims',()=>{
 const content=text();
 for(const term of ['seats','add-ons','migration','overage','taxes','renewal','billing period','cancellation','storage','currency']){
  assert.match(content,new RegExp(term,'i'),'Missing practical buyer term '+term);
 }
 assert.match(content,/lower cost does not mean better fit/i);
 assert.doesNotMatch(content,/hubspot|pipedrive|semrush|ahrefs|kinsta|cloudways|affiliateUrl|commission|tracking pixel/i);
});
test('guide is connected to user tools and contains no remote scripts or form submission',()=>{
 const content=text();
 assert.match(content,/href="\/tools\/software-cost-calculator\/"/);
 assert.match(content,/href="\/tools\/requirements-checklist\/"/);
 assert.match(content,/href="\/methodology\/"/);
 assert.doesNotMatch(content,/<script|<form|https?:\/\//i);
 const homepage=readFileSync('src/pages/index.astro','utf8');
 const calculator=readFileSync('src/pages/tools/software-cost-calculator/index.astro','utf8');
 assert.match(homepage,/\/guides\/saas-total-cost-of-ownership\//);
 assert.match(calculator,/\/guides\/saas-total-cost-of-ownership\//);
});
