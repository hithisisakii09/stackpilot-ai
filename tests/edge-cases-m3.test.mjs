import test from 'node:test';
import assert from 'node:assert/strict';
import { recommend, TEAM_SIZES, BUDGETS, GOALS } from '../src/lib/recommend.mjs';
import { compareCandidates, comparisonCategories } from '../src/lib/comparison.mjs';
import { validateCatalog } from '../src/lib/catalog-validation.mjs';
import { assessBackupRestoreDrill } from '../src/lib/backup-restore-drill.mjs';
import { assessHostingCutover } from '../src/lib/hosting-cutover-assessment.mjs';
import { planSeoAuditScope } from '../src/lib/seo-audit-scope.mjs';
import { readFileSync } from 'node:fs';

const rawProducts = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));

test('M3 edge case: recommend throws fail-closed on empty or invalid criteria', () => {
  // Empty criteria throws fail-closed
  assert.throws(() => recommend(rawProducts, {}), /Invalid recommendation inputs/);

  // Null criteria throws
  assert.throws(() => recommend(rawProducts, null), /Invalid recommendation inputs/);

  // Undefined criteria throws
  assert.throws(() => recommend(rawProducts, undefined), /Invalid recommendation inputs/);

  // Unknown category/goal throws fail-closed
  assert.throws(() => recommend(rawProducts, { goal: 'quantum-computing', team: 'Solo', budget: 'Minimal' }), /Invalid recommendation inputs/);

  // Empty product catalog returns empty array
  const recsEmptyCat = recommend([], { goal: 'sales', team: 'Solo', budget: 'Minimal' });
  assert.equal(recsEmptyCat.length, 0);
});

test('M3 edge case: recommend search constants are immutable (Object.isFrozen)', () => {
  assert.equal(Object.isFrozen(TEAM_SIZES), true);
  assert.equal(Object.isFrozen(BUDGETS), true);
  assert.equal(Object.isFrozen(GOALS), true);

  // Attempting to modify frozen arrays throws in strict mode
  assert.throws(() => {
    TEAM_SIZES.push('InvalidSize');
  }, TypeError);
});

test('M3 edge case: recommend deterministic tie-breaking by product id', () => {
  const syntheticCatalog = [
    { id: 'tool-b', name: 'Alpha Tool', category: 'CRM', bestFor: ['sales'], verified: false, affiliateUrl: null },
    { id: 'tool-a', name: 'Alpha Tool', category: 'CRM', bestFor: ['sales'], verified: false, affiliateUrl: null }
  ];
  const recs = recommend(syntheticCatalog, { goal: 'sales', team: 'Solo', budget: 'Minimal' });
  // Same name 'Alpha Tool', should tie-break alphabetically by id: 'tool-a' before 'tool-b'
  assert.equal(recs.length, 2);
  assert.equal(recs[0].product.id, 'tool-a');
  assert.equal(recs[1].product.id, 'tool-b');
});

test('M3 edge case: compareCandidates enforces valid categories and distinct products', () => {
  // Valid CRM comparison
  const validComp = compareCandidates(rawProducts, 'CRM', 'hubspot', 'pipedrive');
  assert.equal(typeof validComp, 'object');
  assert.equal(validComp.category, 'CRM');
  assert.equal(validComp.products.length, 2);
  assert.equal(validComp.products[0].id, 'hubspot');
  assert.equal(validComp.products[1].id, 'pipedrive');

  // Comparison categories list
  const cats = comparisonCategories(rawProducts);
  assert.ok(cats.includes('CRM'));
  assert.ok(cats.includes('SEO'));
  assert.ok(cats.includes('Hosting'));

  // Invalid category
  assert.throws(() => compareCandidates(rawProducts, 'Quantum', 'hubspot', 'pipedrive'), /Unknown software category/);

  // Same product comparison (self-comparison rejected)
  assert.throws(() => compareCandidates(rawProducts, 'CRM', 'hubspot', 'hubspot'), /Select two different products/);

  // Cross-category product IDs (e.g. hubspot vs kinsta in CRM category)
  assert.throws(() => compareCandidates(rawProducts, 'CRM', 'hubspot', 'kinsta'), /Select two products from the same category/);
});

test('M3 edge case: validateCatalog enforces strict schema invariants and rejects non-null affiliateUrl', () => {
  // Valid baseline returns product count (6)
  const count = validateCatalog(rawProducts);
  assert.equal(count, rawProducts.length);

  // Invalid: non-array input throws
  assert.throws(() => validateCatalog('not-an-array'), /Catalog must be a nonempty array/);
  assert.throws(() => validateCatalog(null), /Catalog must be a nonempty array/);
  assert.throws(() => validateCatalog([]), /Catalog must be a nonempty array/);

  // Invalid: product with active affiliate URL throws
  const taintedCatalog = [
    { ...rawProducts[0], affiliateUrl: 'https://affiliate.example.com?ref=secret123' }
  ];
  assert.throws(() => validateCatalog(taintedCatalog), /Affiliate URLs require approval/);

  // Invalid: duplicate product ID throws
  const duplicateCatalog = [rawProducts[0], rawProducts[0]];
  assert.throws(() => validateCatalog(duplicateCatalog), /duplicate product id/);
});

test('M3 edge case: backup restore drill evaluates bounds and negative parameters correctly', () => {
  // Valid drill meeting targets
  const passDrill = assessBackupRestoreDrill({
    targetRtoMinutes: 240,
    observedRestoreMinutes: 60,
    targetRpoMinutes: 1440,
    observedRecoveryPointAgeMinutes: 360,
    restoreTested: true,
    dataIntegrityChecked: true
  });
  assert.equal(passDrill.readiness, 'READY_FOR_HUMAN_REVIEW');
  assert.equal(passDrill.rtoWithinTarget, true);
  assert.equal(passDrill.rpoWithinTarget, true);
  assert.equal(passDrill.blockers.length, 0);

  // Failure: restore time exceeds target RTO
  const failRtoDrill = assessBackupRestoreDrill({
    targetRtoMinutes: 60,
    observedRestoreMinutes: 120, // 120m > 60m target
    targetRpoMinutes: 1440,
    observedRecoveryPointAgeMinutes: 360,
    restoreTested: true,
    dataIntegrityChecked: true
  });
  assert.equal(failRtoDrill.readiness, 'NO_GO');
  assert.equal(failRtoDrill.rtoWithinTarget, false);
  assert.ok(failRtoDrill.blockers.includes('restore-time-exceeds-target'));

  // Failure: restore not tested
  const untestedDrill = assessBackupRestoreDrill({
    targetRtoMinutes: 240,
    observedRestoreMinutes: 60,
    targetRpoMinutes: 1440,
    observedRecoveryPointAgeMinutes: 360,
    restoreTested: false,
    dataIntegrityChecked: true
  });
  assert.equal(untestedDrill.readiness, 'NO_GO');
  assert.ok(untestedDrill.blockers.includes('restoration-not-attested'));

  // Invalid: negative or zero target RTO
  assert.throws(() => assessBackupRestoreDrill({
    targetRtoMinutes: 0,
    observedRestoreMinutes: 60,
    targetRpoMinutes: 1440,
    observedRecoveryPointAgeMinutes: 360,
    restoreTested: true,
    dataIntegrityChecked: true
  }), Error);
});

test('M3 edge case: hosting cutover assessment fails closed on partial gates', () => {
  // All gates pass -> READY_FOR_HUMAN_REVIEW (never automated GO)
  const fullPass = assessHostingCutover({
    dnsEmail: 'pass',
    backupRestore: 'pass',
    tlsDependencies: 'pass',
    rollbackAuthority: 'pass',
    retentionBilling: 'pass'
  });
  assert.equal(fullPass.status, 'READY_FOR_HUMAN_REVIEW');
  assert.equal(fullPass.launchAuthorized, false);
  assert.equal(fullPass.blockers.length, 0);

  // Missing/failing gate -> NO_GO
  const partialGates = assessHostingCutover({
    dnsEmail: 'pass',
    backupRestore: 'pass',
    tlsDependencies: 'fail',
    rollbackAuthority: 'pass',
    retentionBilling: 'pass'
  });
  assert.equal(partialGates.status, 'NO_GO');
  assert.ok(partialGates.blockers.includes('tlsDependencies'));

  // Invalid gate value
  assert.throws(() => assessHostingCutover({
    dnsEmail: 'pass',
    backupRestore: 'pass',
    tlsDependencies: 'unknown-status',
    rollbackAuthority: 'pass',
    retentionBilling: 'pass'
  }), Error);
});

test('M3 edge case: SEO audit scope handles zero, negative, and extreme page limits', () => {
  // Normal inputs
  const normalScope = planSeoAuditScope({
    rootPages: 50,
    folderPages: 200,
    subdomainPages: 100,
    pageCap: 500,
    includeFolders: true,
    includeSubdomains: true
  });
  assert.equal(normalScope.includedPages, 350);
  assert.equal(normalScope.remainingPages, 150);
  assert.equal(normalScope.excessPages, 0);
  assert.equal(normalScope.status, 'WITHIN_USER_CAP');

  // Zero pages
  const zeroScope = planSeoAuditScope({
    rootPages: 0,
    folderPages: 0,
    subdomainPages: 0,
    pageCap: 100,
    includeFolders: true,
    includeSubdomains: true
  });
  assert.equal(zeroScope.includedPages, 0);
  assert.equal(zeroScope.status, 'EMPTY_SCOPE');

  // Above user cap
  const cappedScope = planSeoAuditScope({
    rootPages: 500,
    folderPages: 300,
    subdomainPages: 200,
    pageCap: 400,
    includeFolders: true,
    includeSubdomains: true
  });
  assert.equal(cappedScope.includedPages, 1000);
  assert.equal(cappedScope.excessPages, 600);
  assert.equal(cappedScope.status, 'ABOVE_USER_CAP');

  // Out of range (> 1,000,000) throws error
  assert.throws(() => planSeoAuditScope({
    rootPages: 2_000_000,
    folderPages: 0,
    subdomainPages: 0,
    pageCap: 100,
    includeFolders: false,
    includeSubdomains: false
  }), Error);
});
