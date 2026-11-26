import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('compare-picker.js executes safeState() without TypeError and populates tool selectors', () => {
  const html = readFileSync(new URL('../src/pages/compare/index.astro', import.meta.url), 'utf8');
  assert.match(html, /<script type="module" src="\/scripts\/compare-picker\.js"><\/script>/);

  const source = readFileSync(new URL('../public/scripts/compare-picker.js', import.meta.url), 'utf8');
  // Ensure safeId RegExp is never passed directly as an Array.prototype.filter callback.
  assert.doesNotMatch(source, /\.filter\(\s*safeId\s*\)/);

  const makeEl = (tag, initial = {}) => {
    const children = [];
    const listeners = new Map();
    const el = {
      tagName: tag.toUpperCase(),
      value: initial.value ?? '',
      disabled: Boolean(initial.disabled),
      dataset: { ...(initial.dataset ?? {}) },
      selected: false,
      textContent: '',
      children,
      options: children,
      append(...nodes) {
        for (const n of nodes) {
          children.push(n);
          if (tag === 'select' && (n.selected || children.length === 1)) {
            el.value = n.value;
          }
        }
      },
      replaceChildren(...nodes) {
        children.length = 0;
        el.value = '';
        el.append(...nodes);
      },
      addEventListener(type, fn) {
        listeners.set(type, fn);
      },
      dispatchEvent(event) {
        const fn = listeners.get(event.type);
        if (fn) fn(event);
      },
      setAttribute() {}
    };
    return el;
  };

  const catalog = JSON.stringify([
    { id: 'hubspot', name: 'HubSpot', category: 'CRM', workflowTags: ['sales'] },
    { id: 'pipedrive', name: 'Pipedrive', category: 'CRM', workflowTags: ['sales'] }
  ]);
  const elements = new Map([
    ['#compare-form', makeEl('form', { dataset: { catalog } })],
    ['#compare-search', makeEl('input', { value: '' })],
    ['#compare-category', makeEl('select', { value: 'CRM' })],
    ['#compare-workflow', makeEl('select', { value: '' })],
    ['#compare-first', makeEl('select')],
    ['#compare-second', makeEl('select')],
    ['#compare-third', makeEl('select')],
    ['#comparison-result', makeEl('div')],
    ['#comparison-error', makeEl('p')],
    ['#download-comparison-csv', makeEl('button', { disabled: true })],
    ['#comparison-download-status', makeEl('p')]
  ]);
  elements.get('#compare-category').append(Object.assign(makeEl('option', { value: 'CRM' }), { selected: true }));

  const context = {
    URLSearchParams,
    location: { pathname: '/compare/', search: '?category=CRM&tools=hubspot,pipedrive,%3Cimg%3E' },
    history: { replaceState() {} },
    document: {
      querySelector(sel) { return elements.get(sel) ?? null; },
      createElement(tag) { return makeEl(tag); }
    }
  };

  vm.runInNewContext(source, context);

  assert.equal(elements.get('#compare-first').children.length, 2);
  assert.equal(elements.get('#compare-first').value, 'hubspot');
  assert.equal(elements.get('#compare-second').value, 'pipedrive');
  assert.equal(elements.get('#compare-third').value, '');

  elements.get('#compare-form').dispatchEvent({ type: 'submit', preventDefault() {} });
  assert.equal(elements.get('#comparison-result').children.length, 3);
  assert.equal(elements.get('#download-comparison-csv').disabled, false);

  // Also verify three distinct candidates render 4 header columns (Field + 3 tools).
  const threeCatalog = JSON.stringify([
    { id: 'hubspot', name: 'HubSpot', category: 'CRM', workflowTags: ['sales'] },
    { id: 'pipedrive', name: 'Pipedrive', category: 'CRM', workflowTags: ['sales'] },
    { id: 'zoho', name: 'Zoho', category: 'CRM', workflowTags: ['sales'] }
  ]);
  elements.get('#compare-form').dataset.catalog = threeCatalog;
  const secondContext = {
    ...context,
    location: { pathname: '/compare/', search: '?category=CRM&tools=hubspot,pipedrive,zoho' }
  };
  vm.runInNewContext(source, secondContext);
  elements.get('#compare-form').dispatchEvent({ type: 'submit', preventDefault() {} });
  const table = elements.get('#comparison-result').children[2].children[0];
  assert.equal(table.children[1].children[0].children.length, 4);
});
