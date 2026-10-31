import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const privacy = readFileSync(new URL('../src/pages/privacy/index.astro', import.meta.url), 'utf8');

test('advisor labels unverified category-only choices as unranked', () => {
  assert.match(home, /Category matches \(alphabetical, unranked\)/);
  assert.doesNotMatch(home, /This ranking is a category-based starting point/);
});

test('privacy notes identify enabled Netlify Web Analytics at hosting layer', () => {
  assert.match(privacy, /Netlify Web Analytics is enabled/);
  assert.match(privacy, /CDN server logs/);
  assert.match(privacy, /IP addresses/);
});
