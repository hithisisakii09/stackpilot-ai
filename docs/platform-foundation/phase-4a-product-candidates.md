# Phase 4A product candidate interfaces

`src/platform/products/` provides internal candidate preparation and disposable-database persistence. Every new product/source stays candidate, every duplicate proposal stays unreviewed, and product affiliate URLs are null.

## Preparation

`normalizeTaxonomy(categories)` accepts category records with independent `id`, `slug`, `name`, and `aliases`. `resolveCategory(categories, token)` resolves a canonical ID, slug or normalized alias. Each tenant has one category namespace across IDs, slugs and aliases. Product aliases have a separate namespace with the same collision rule.

`prepareProductIntake(input, {nowMs})` performs a connection-free dry run and returns frozen canonical records plus a source digest. The input has `idempotencyKey`, `manualReference`, `categories`, `vendors`, `products`, and `sources`. Every array is required and may be empty, with at least one record in the complete intake. Each array has at most ten records and each entity at most five aliases. Existing shared JSON byte/node bounds also apply.

```js
const input = {
  idempotencyKey: 'synthetic-intake',
  manualReference: 'synthetic-document',
  categories: [{id:'category-tools', slug:'tools', name:'Tools', aliases:['utilities']}],
  vendors: [{id:'vendor-example', name:'Example Vendor', website:'https://example.com/'}],
  products: [{id:'example-tool', categoryId:'category-tools', vendorId:'vendor-example',
    slug:'example-tool', name:'Example Tool', website:'https://example.com/tool', aliases:['tool-example']}],
  sources: [{id:'source-example', productId:'example-tool', sourceUrl:'https://example.com/docs',
    collectedAt:'2026-01-01T00:00:00.000Z', sourceDigest:'a'.repeat(64)}],
};
```

The example is synthetic. Caller-supplied URLs/digests and manual references require independent evidence review. Collected timestamps use canonical UTC and cannot exceed the application/database clock. Record order and alias order do not affect the digest. The digest binds the idempotency key and manual reference.

`canonicalCandidateUrl(url)` accepts a deliberately bounded HTTPS spelling, lowercases hosts and supplies the root slash. It preserves path case, trailing path slashes and `www` identity. Credentials, query/fragment, explicit ports, IP literals, local-name suffixes, dot segments, percent escapes, backslashes and ambiguous spellings are rejected. This manual parser performs no DNS or fetch. Future collection requires a separately reviewed network adapter.

## Disposable persistence

`openProductCandidateStore(config).scope(organizationId).apply(input, {apply:true})` requires the existing owned `stackpilot_market_test` fixture selection, marker and restricted application role. `duplicates(productId)` returns frozen proposals for a tenant-owned product. Close the store after use. This follows the local preparation boundary of Phases 2B–3D. Authenticated operator/API integration remains future work.

Migration 8 adds append-only `category_aliases` and `product_duplicate_proposals` with forced RLS, tenant foreign keys, ordered unique pairs and SELECT/INSERT application grants. Existing default migration target remains 1. Explicit target 8 is available through `applyMigrations` and the existing migration CLI. Existing migrations 1–7 retain their canonical bytes.

Transactions acquire the existing organization preparation lock and candidate-import lock. Exact repeated keys return `applied:false`, changed content under a reused key fails, and distinct keys can reuse exact immutable identities and alias sets. All record, alias, proposal, idempotency, audit and outbox writes commit together. Original product metadata stays intact on reuse. A source-only batch retains its manual reference/source IDs in the idempotency result.

The checkpoint bounds each tenant's candidate namespace to 100 categories, 100 vendors, 100 products and 500 aliases per namespace. Exact reuse remains possible at capacity. Duplicate generation is bounded to 100 proposals per snapshot. Exceeding a limit fails atomically. These are engineering limits chosen for the current fixture scope.

`proposeProductDuplicates([{id, vendorUrl}])` uses canonical vendor URL equality to create stable product-pair proposals. Shared-vendor products may be distinct offerings and require human review. No merge or approval method is exposed. Static export preflight rejects the new module paths, proposal/alias data paths and implementation markers.
