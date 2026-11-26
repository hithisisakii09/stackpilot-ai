import test from 'node:test';
import assert from 'node:assert/strict';
import {renderComponentToString} from 'astro/runtime/server/render/component.js';

const renderTag = tag => renderComponentToString(
  {renderers: [], clientDirectives: new Map()}, 'DynamicTag', tag, {},
);

test('Astro removes injected slash-separated attributes from dynamic tag names', async () => {
  const html = await renderTag('img/src/onerror=alert(1)');
  assert.doesNotMatch(html, /onerror|alert\(|src/i);
  assert.equal(html, '<img/>');
});

test('Astro preserves legitimate dynamic HTML tag rendering', async () => {
  assert.equal(await renderTag('section'), '<section></section>');
  assert.equal(await renderTag('custom-element'), '<custom-element></custom-element>');
});
