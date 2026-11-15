import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeTaxonomy, resolveCategory} from '../src/platform/products/taxonomy.mjs';
import {canonicalCandidateUrl, prepareProductIntake} from '../src/platform/products/discovery.mjs';
import {proposeProductDuplicates} from '../src/platform/products/dedup.mjs';
import * as migrations from '../src/platform/persistence/migrate.mjs';
import {auditLocalControlPlaneExport} from '../src/lib/local-control-plane-export.mjs';

const category = () => ({id:'category-tools', slug:'tools', name:'Tools', aliases:['Utilities']});
const product = (patch = {}) => ({id:'tool-alpha', categoryId:'category-tools', vendorId:'vendor-alpha', slug:'tool-alpha', name:'Tool Alpha', website:'https://example.com/alpha', aliases:['alpha-tool'], ...patch});
const intake = () => ({idempotencyKey:'intake-alpha', manualReference:'synthetic-fixture', categories:[category()], vendors:[{id:'vendor-alpha', name:'Vendor Alpha', website:'https://EXAMPLE.com'}], products:[product()], sources:[{id:'source-alpha', productId:'tool-alpha', sourceUrl:'https://example.com/docs', collectedAt:'2026-01-01T00:00:00.000Z', sourceDigest:'a'.repeat(64)}]});

test('taxonomy preserves independent identity and resolves normalized aliases', () => {
  const taxonomy = normalizeTaxonomy([category()]);
  assert.equal(resolveCategory(taxonomy, 'UTILITIES'), 'category-tools');
  assert.equal(resolveCategory(taxonomy, 'tools'), 'category-tools');
  assert.equal(resolveCategory(taxonomy, 'category-tools'), 'category-tools');
  assert.throws(() => resolveCategory(taxonomy, 'unknown'));
  assert.equal(Object.isFrozen(taxonomy[0].aliases), true);
});

test('taxonomy rejects alias shadowing, repeated aliases and unknown authority fields', () => {
  for (const values of [[category(), {...category(), id:'category-other', slug:'other', aliases:['tools']}], [{...category(), aliases:['tools']}], [{...category(), aliases:['Utilities','utilities']}], [{...category(), approved:true}], [{...category(), aliases:['bad alias']}]]) {
    assert.throws(() => normalizeTaxonomy(values));
  }
});

test('manual URL canonicalization normalizes host and root while preserving meaningful paths', () => {
  assert.equal(canonicalCandidateUrl('https://EXAMPLE.com'), 'https://example.com/');
  assert.equal(canonicalCandidateUrl('https://example.com/Case/'), 'https://example.com/Case/');
  assert.notEqual(canonicalCandidateUrl('https://www.example.com/'), canonicalCandidateUrl('https://example.com/'));
});

test('manual candidate URLs reject credentials, private literals and ambiguous spellings', () => {
  for (const url of ['http://example.com/', 'https://user:fixture@example.com/', 'https://127.0.0.1/', 'https://2130706433/', 'https://[::1]/', 'https://localhost/', 'https://service.local/', 'https://example.com:443/', 'https://example.com/?token=fixture', 'https://example.com/#fragment', 'https://example.com/a/../b', 'https://example.com/%2fprivate', 'https://example.com\\path', ' https://example.com/', 'https://example.com./']) {
    assert.throws(() => canonicalCandidateUrl(url));
  }
});

test('manual intake is connection-free, deterministic, immutable and always unreviewed', () => {
  const input = intake(), result = prepareProductIntake(input);
  assert.equal(result.dryRun, true);
  assert.equal(result.products[0].id, 'tool-alpha');
  assert.equal(result.products[0].affiliateUrl, null);
  assert.equal(result.products[0].status, 'candidate');
  assert.equal(result.reviewState, 'unreviewed');
  assert.equal(result.vendors[0].website, 'https://example.com/');
  input.products[0].name = 'Mutated';
  assert.equal(result.products[0].name, 'Tool Alpha');
  assert.equal(result.sourceDigest, prepareProductIntake(intake()).sourceDigest);
  assert.equal(Object.isFrozen(result.sources[0]), true);
});

test('intake rejects authority/commercial injection, missing provenance and hostile data objects', () => {
  for (const patch of [{approved:true}, {manualReference:''}, {products:[{...product(), affiliateUrl:'https://example.com/track'}]}, {products:[{...product(), verified:true}]}]) {
    assert.throws(() => prepareProductIntake({...intake(), ...patch}));
  }
  const hostile = intake();
  Object.defineProperty(hostile, 'manualReference', {enumerable:true, get() {throw new Error('getter executed');}});
  assert.throws(() => prepareProductIntake(hostile), /Invalid platform contract/);
  assert.throws(() => prepareProductIntake(new Proxy(intake(), {})));
});

test('candidate sources reject future, impossible and noncanonical dates and invalid digests', () => {
  for (const patch of [{collectedAt:'2099-01-01T00:00:00.000Z'}, {collectedAt:'2026-02-30T00:00:00.000Z'}, {collectedAt:'2026-01-01'}, {sourceDigest:'invalid'}]) {
    const input = intake(); input.sources[0] = {...input.sources[0], ...patch};
    assert.throws(() => prepareProductIntake(input, {nowMs:Date.UTC(2026,1,1)}));
  }
});

test('batches bound counts and reject duplicate identities and aliases', () => {
  const input = intake();
  assert.throws(() => prepareProductIntake({...input, products:Array(11).fill(product())}));
  assert.throws(() => prepareProductIntake({...input, products:[product(), product()]}));
  assert.throws(() => prepareProductIntake({...input, products:[product(), product({id:'tool-beta', slug:'tool-beta'})]}));
  assert.throws(() => prepareProductIntake({...input, products:[product({aliases:['tool-alpha']})]}));
  assert.throws(() => prepareProductIntake({...input, products:[], categories:[], vendors:[], sources:[]}));
});

test('intake digest is independent of record/alias order and binds manual provenance', () => {
  const input = intake(); input.products.push(product({id:'tool-beta', slug:'tool-beta', aliases:['beta-tool']}));
  const result = prepareProductIntake(input);
  assert.equal(result.sourceDigest, prepareProductIntake({...input, products:[...input.products].reverse()}).sourceDigest);
  assert.notEqual(result.sourceDigest, prepareProductIntake({...input, manualReference:'another-fixture'}).sourceDigest);
});

test('duplicate proposals are stable, unreviewed and based on canonical vendor URLs', () => {
  const rows = [{id:'tool-beta', vendorUrl:'https://example.com/'}, {id:'tool-alpha', vendorUrl:'https://EXAMPLE.com'}, {id:'tool-gamma', vendorUrl:'https://other.example.com/'}];
  const proposals = proposeProductDuplicates(rows);
  assert.equal(proposals.length, 1);
  assert.deepEqual(proposals[0], {...proposals[0], leftProductId:'tool-alpha', rightProductId:'tool-beta', vendorUrl:'https://example.com/', reviewState:'unreviewed', reason:'same-canonical-vendor-url'});
  assert.deepEqual(proposals, proposeProductDuplicates([...rows].reverse()));
  assert.throws(() => proposeProductDuplicates([...rows, rows[0]]));
});

test('duplicate generation fails closed on excessive fanout', () => {
  assert.throws(() => proposeProductDuplicates(Array.from({length:16}, (_, index) => ({id:'tool-'+String(index).padStart(3,'0'), vendorUrl:'https://example.com/'}))), /limit/i);
});

test('duplicate pair ordering follows database byte ordering and supports bounded dense groups', () => {
  const pair = proposeProductDuplicates([{id:'tool0', vendorUrl:'https://example.com/'}, {id:'tool-a', vendorUrl:'https://example.com/'}])[0];
  assert.equal(pair.leftProductId, 'tool-a');
  assert.equal(pair.rightProductId, 'tool0');
  const rows = Array.from({length:14}, (_, index) => ({id:'tool-'+String(index).padStart(3,'0'), vendorUrl:'https://example.com/'}));
  assert.equal(proposeProductDuplicates(rows).length, 91);
});

test('migration eight verifies canonical source, checksum and tampering', () => {
  assert.equal(typeof migrations.verifyProductMigration, 'function');
  const bytes = readFileSync(new URL('../src/platform/persistence/migrations/0008_product_candidates.sql', import.meta.url));
  const manifest = JSON.parse(readFileSync(new URL('../src/platform/persistence/migrations/product-manifest.json', import.meta.url)));
  assert.equal(migrations.verifyProductMigration(bytes, manifest), true);
  assert.throws(() => migrations.verifyProductMigration(Buffer.concat([bytes, Buffer.from('-- drift')]), manifest));
  assert.throws(() => migrations.verifyProductMigration(bytes, {...manifest, version:7}));
});

test('candidate intake and duplicate review material is rejected from static assets', () => {
  for (const file of [{path:'platform/products/discovery.mjs', content:''}, {path:'category_aliases.json', content:''}, {path:'product_duplicate_proposals.json', content:''}, {path:'assets/app.js', content:'openProductCandidateStore prepareProductIntake proposeProductDuplicates'}]) {
    assert.equal(auditLocalControlPlaneExport([file]).violations.length, 1);
  }
});
