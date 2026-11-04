import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Netlify configuration identifies the actual private development platform', () => {
  const config = readFileSync('netlify.toml', 'utf8');
  assert.match(config, /Primary private development preview: Netlify Deploy Preview/);
  assert.doesNotMatch(config, /Vercel protected preview remains the current development site/i);
  assert.match(config, /command = "npm run build"/);
  assert.match(config, /publish = "dist"/);
  assert.doesNotMatch(config, /\[\[redirects\]\]|force\s*=\s*true/);
});
