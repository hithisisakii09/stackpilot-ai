import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');

test('prelaunch homepage avoids claiming independent recommendations before review', () => {
  assert.doesNotMatch(home, /Independent SaaS recommendations/i);
  assert.doesNotMatch(home, /Grow without guesswork/i);
  assert.doesNotMatch(home, /Find my stack/i);
  assert.match(home, /unverified research candidates/i);
  assert.match(home, /alphabetical, unranked/i);
});

test('homepage discloses category-only matches before the user runs the advisor', () => {
  assert.match(home, /not personalized recommendations/i);
  assert.match(home, /Team size and budget do not change the results while suitability remains unverified/i);
});
