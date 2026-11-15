import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {openLocalPool} from '../../src/platform/persistence/connection.mjs';
import {applyMigrations} from '../../src/platform/persistence/migrate.mjs';
import {createStore, importCandidates} from '../../src/platform/persistence/repositories.mjs';
import {openProductCandidateStore} from '../../src/platform/products/store.mjs';

const config = JSON.parse(process.env.STACKPILOT_TEST_DB ?? 'null');
if (config?.database !== 'stackpilot_market_test') throw new Error('Use disposable market harness');
const alpha = 'org-products-alpha', beta = 'org-products-beta';
const admin = await openLocalPool(config);
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const candidates = {products:read('../../src/data/products.json'), evidenceLeads:read('../../src/data/evidence-leads.json'), claims:read('../../src/data/research-claims.json')};
const product = (name = 'alpha', patch = {}) => ({id:'manual-'+name, categoryId:'category-manual', vendorId:'vendor-manual', slug:'manual-'+name, name:'Manual '+name, website:'https://example.com/'+name, aliases:[name+'-alias'], ...patch});
const batch = (key = 'intake-initial', patch = {}) => ({idempotencyKey:key, manualReference:'synthetic-fixture', categories:[{id:'category-manual', slug:'manual-tools', name:'Manual tools', aliases:['utilities']}], vendors:[{id:'vendor-manual', name:'Manual Vendor', website:'https://example.com/'}], products:[product()], sources:[{id:'source-manual', productId:'manual-alpha', sourceUrl:'https://example.com/docs', collectedAt:'2026-01-01T00:00:00.000Z', sourceDigest:'a'.repeat(64)}], ...patch});
let store;
const counts = async () => (await admin.query('SELECT (SELECT count(*) FROM categories) AS categories,(SELECT count(*) FROM category_aliases) AS aliases,(SELECT count(*) FROM vendors) AS vendors,(SELECT count(*) FROM products) AS products,(SELECT count(*) FROM product_aliases) AS product_aliases,(SELECT count(*) FROM evidence_sources) AS sources,(SELECT count(*) FROM product_duplicate_proposals) AS proposals,(SELECT count(*) FROM idempotency_keys) AS keys,(SELECT count(*) FROM audit_events) AS audits,(SELECT count(*) FROM outbox_events) AS outbox')).rows[0];

test('manual product candidates through restricted PostgreSQL', async t => {
  try {
    await t.test('migration eight upgrades, fresh installs and failure rollbacks preserve canonical history', async () => {
      assert.deepEqual(await applyMigrations(admin, {targetVersion:8}), {version:8, applied:true});
      assert.deepEqual(await applyMigrations(admin, {targetVersion:8}), {version:8, applied:false});
      const fresh = await openLocalPool({...config, database:'stackpilot_products_fresh'});
      const failure = await openLocalPool({...config, database:'stackpilot_products_failure'});
      try {
        assert.equal((await applyMigrations(fresh, {targetVersion:8})).version, 8);
        await applyMigrations(failure, {targetVersion:7});
        await failure.query('CREATE TABLE category_aliases(fixture integer)');
        await assert.rejects(applyMigrations(failure, {targetVersion:8}));
        assert.equal((await failure.query('SELECT max(version) AS version FROM _platform_migrations')).rows[0].version, 7);
        assert.equal((await failure.query("SELECT to_regclass('product_duplicate_proposals') AS relation")).rows[0].relation, null);
      } finally { await fresh.end(); await failure.end(); }
      const app = await openLocalPool({...config, user:'stackpilot_app'});
      try {
        for (const organizationId of [alpha, beta]) {
          const scope = {organizationId, actorId:'fixture-owner', requestId:'fixture-request'};
          await createStore(app).transaction(scope, r => r.identity.createOrganization({name:organizationId}));
          await importCandidates(app, scope, candidates);
        }
      } finally { await app.end(); }
      store = await openProductCandidateStore(config);
    });
    await t.test('explicit apply and concurrent duplicate keys create exactly one batch', async () => {
      const scope = store.scope(alpha), input = batch();
      await assert.rejects(scope.apply(input));
      const results = await Promise.all([scope.apply(input, {apply:true}), scope.apply(input, {apply:true})]);
      assert.equal(results.filter(result => result.applied).length, 1);
      const row = (await admin.query('SELECT status,affiliate_url,metadata FROM products WHERE organization_id=$1 AND id=$2', [alpha, 'manual-alpha'])).rows[0];
      assert.equal(row.status, 'candidate'); assert.equal(row.affiliate_url, null);
      assert.equal(row.metadata.reviewState, 'unreviewed');
      await assert.rejects(scope.apply(batch('intake-initial', {manualReference:'altered-fixture'}), {apply:true}));
    });
    await t.test('distinct concurrent keys reuse immutable rows and produce one human-review pair', async () => {
      const scope = store.scope(alpha), input = batch('intake-second', {products:[product('beta')], sources:[]});
      const results = await Promise.all([scope.apply(input, {apply:true}), scope.apply({...input, idempotencyKey:'intake-third'}, {apply:true})]);
      assert.equal(results.every(result => result.applied), true);
      const pairs = await scope.duplicates('manual-alpha');
      assert.equal(pairs.length, 1);
      assert.equal(pairs[0].reviewState, 'unreviewed');
      assert.equal(pairs[0].leftProductId, 'manual-alpha');
      assert.equal(pairs[0].rightProductId, 'manual-beta');
      assert.equal((await admin.query('SELECT count(*) FROM products WHERE organization_id=$1 AND id LIKE $2', [alpha, 'manual-%'])).rows[0].count, '2');
    });
    await t.test('caller mutations are captured before asynchronous writes', async () => {
      const input = batch('intake-captured', {products:[product('captured')], sources:[]});
      const pending = store.scope(alpha).apply(input, {apply:true});
      input.products[0].name = 'Altered'; input.categories[0].aliases[0] = 'altered';
      await pending;
      assert.equal((await admin.query('SELECT name FROM products WHERE organization_id=$1 AND id=$2', [alpha, 'manual-captured'])).rows[0].name, 'Manual captured');
    });
    await t.test('category and product alias namespaces reject shadowing across separate batches', async () => {
      const before = await counts();
      const changes = [
        {categories:[{id:'category-collision', slug:'utilities', name:'Collision', aliases:[]}], vendors:[], products:[], sources:[]},
        {categories:[{id:'category-collision', slug:'collision', name:'Collision', aliases:['category-manual']}], vendors:[], products:[], sources:[]},
        {categories:[], vendors:[], products:[product('alias-collision', {aliases:['manual-alpha']})], sources:[]},
        {categories:[], vendors:[], products:[product('alias-collision', {slug:'alpha-alias', aliases:[]})], sources:[]},
      ];
      for (const [index, patch] of changes.entries()) await assert.rejects(store.scope(alpha).apply(batch('namespace-'+index, patch), {apply:true}));
      assert.deepEqual(await counts(), before);
    });
    await t.test('changed existing IDs and vendor URLs reject without partial records', async () => {
      const before = await counts();
      for (const patch of [{products:[product('alpha', {name:'Reassigned'})]}, {vendors:[{id:'vendor-other', name:'Other', website:'https://example.com/'}]}, {sources:[{...batch().sources[0], sourceDigest:'b'.repeat(64)}]}, {products:[product('alpha', {aliases:['new-alias']})]}, {categories:[{...batch().categories[0], aliases:['new-alias']}]}, {categories:[{...batch().categories[0], aliases:[]}]}]) {
        await assert.rejects(store.scope(alpha).apply(batch('immutable-conflict', patch), {apply:true}));
      }
      assert.deepEqual(await counts(), before);
    });
    await t.test('tenant scoping protects source bindings, aliases and duplicate reads', async () => {
      await assert.rejects(store.scope(beta).duplicates('manual-alpha'));
      await assert.rejects(store.scope(beta).apply(batch('foreign-source', {categories:[], vendors:[], products:[]}), {apply:true}));
      await store.scope(beta).apply(batch('beta-initial'), {apply:true});
      assert.deepEqual(await store.scope(beta).duplicates('manual-alpha'), []);
      const app = await openLocalPool({...config, user:'stackpilot_app'});
      try {
        assert.equal((await app.query('SELECT count(*) FROM category_aliases')).rows[0].count, '0');
        await app.query('BEGIN');
        await app.query("SELECT set_config('stackpilot.organization_id',$1,true)", [beta]);
        await assert.rejects(app.query("INSERT INTO category_aliases(organization_id,id,category_id,alias) VALUES ($1,'foreign-alias','category-manual','foreign-token')", [alpha]));
        await app.query('ROLLBACK');
        await assert.rejects(app.query('UPDATE product_duplicate_proposals SET review_state=review_state'));
        await assert.rejects(app.query('DELETE FROM category_aliases'));
      } finally { await app.end(); }
    });
    await t.test('database foreign keys and proposal constraints deny invalid cross-tenant or approval records', async () => {
      await assert.rejects(admin.query("INSERT INTO product_duplicate_proposals(organization_id,id,left_product_id,right_product_id,vendor_url,reason,review_state) VALUES ($1,'invalid-pair','manual-alpha','manual-beta','https://example.com/','same-canonical-vendor-url','unreviewed')", [beta]));
      await assert.rejects(admin.query("INSERT INTO product_duplicate_proposals(organization_id,id,left_product_id,right_product_id,vendor_url,reason,review_state) VALUES ($1,'invalid-pair','manual-alpha','manual-beta','https://example.com/','same-canonical-vendor-url','approved')", [alpha]));
    });
    await t.test('outbox failure rolls all intake records back and retry succeeds', async () => {
      const before = await counts();
      await admin.query("CREATE FUNCTION fixture_product_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='manual-products-imported' THEN RAISE EXCEPTION 'fixture'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_product_failure BEFORE INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION fixture_product_failure()");
      const input = batch('rollback-products', {products:[product('rollback')], sources:[]});
      try { await assert.rejects(store.scope(alpha).apply(input, {apply:true})); assert.deepEqual(await counts(), before); }
      finally { await admin.query('DROP TRIGGER fixture_product_failure ON outbox_events; DROP FUNCTION fixture_product_failure()'); }
      assert.equal((await store.scope(alpha).apply(input, {apply:true})).applied, true);
    });
    await t.test('future sources fail and legacy product identities and claims remain candidate-only', async () => {
      await assert.rejects(store.scope(alpha).apply(batch('future-products', {sources:[{...batch().sources[0], collectedAt:'2099-01-01T00:00:00.000Z'}]}), {apply:true}));
      const existing = (await admin.query('SELECT id FROM products WHERE organization_id=$1 AND id=ANY($2::text[]) ORDER BY id', [alpha, candidates.products.map(row => row.id)])).rows.map(row => row.id);
      assert.deepEqual(existing, candidates.products.map(row => row.id).sort());
      assert.equal((await admin.query("SELECT count(*) FROM product_claims WHERE approved OR status<>'candidate'")).rows[0].count, '0');
    });
    await t.test('dense duplicate groups preserve 91 proposals and excessive fanout rolls intake back', async () => {
      await store.scope(alpha).apply(batch('dense-group', {products:Array.from({length:10}, (_, index) => product('dense-'+index)), sources:[]}), {apply:true});
      assert.equal((await admin.query('SELECT count(*) FROM product_duplicate_proposals WHERE organization_id=$1', [alpha])).rows[0].count, '91');
      assert.equal((await store.scope(alpha).duplicates('manual-alpha')).length, 13);
      const before = await counts();
      await assert.rejects(store.scope(alpha).apply(batch('dense-overflow', {products:[product('overflow')], sources:[]}), {apply:true}));
      assert.deepEqual(await counts(), before);
    });
    await t.test('capacity checks reject excess categories and vendors while exact reuse remains available', async () => {
      const organizationId = 'org-products-capacity';
      await admin.query('INSERT INTO organizations(id,name) VALUES ($1,$1)', [organizationId]);
      await admin.query("INSERT INTO categories(organization_id,id,slug,name) SELECT $1,'category-'||lpad(n::text,3,'0'),'category-'||lpad(n::text,3,'0'),'Category '||n FROM generate_series(1,100) AS n", [organizationId]);
      await admin.query("INSERT INTO vendors(organization_id,id,name,website) SELECT $1,'vendor-'||lpad(n::text,3,'0'),'Vendor '||n,'https://example.com/'||n FROM generate_series(1,100) AS n", [organizationId]);
      const scope = store.scope(organizationId), before = await counts();
      await assert.rejects(scope.apply(batch('capacity-category', {categories:[{id:'category-overflow', slug:'overflow', name:'Overflow', aliases:[]}], vendors:[], products:[], sources:[]}), {apply:true}));
      await assert.rejects(scope.apply(batch('capacity-vendor', {categories:[], vendors:[{id:'vendor-overflow', name:'Overflow', website:'https://overflow.example.com/'}], products:[], sources:[]}), {apply:true}));
      assert.deepEqual(await counts(), before);
      assert.equal((await scope.apply(batch('capacity-reuse', {categories:[{id:'category-001', slug:'category-001', name:'Category 1', aliases:[]}], vendors:[{id:'vendor-001', name:'Vendor 1', website:'https://example.com/1'}], products:[], sources:[]}), {apply:true})).applied, true);
    });
    await t.test('existing migration CLI accepts explicit target eight against the owned fixture', () => {
      const cli = spawnSync(process.execPath, [fileURLToPath(new URL('../../scripts/platform-db-migrate.mjs', import.meta.url)), '--apply', '--target-version', '8'], {encoding:'utf8', windowsHide:true, env:{...process.env, STACKPILOT_LOCAL_DATABASE:JSON.stringify(config)}});
      assert.equal(cli.status, 0);
      assert.equal(JSON.parse(cli.stdout).version, 8);
    });
  } finally { if (store) await store.close(); await admin.end(); }
});
