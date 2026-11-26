import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCanonicalSnapshot,
  verifyCanonicalSnapshot,
  verifyMigrationIntegrity,
  buildRecoveryDrillReport
} from '../src/platform/recovery/drills.mjs';
import { isReviewedLocalControlSource, reviewedLocalControlSources } from './local-control-plane-source.mjs';
import { auditLocalControlPlaneExport } from '../src/lib/local-control-plane-export.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationsDir = join(root, 'src', 'platform', 'persistence', 'migrations');

const MIGRATION_MANIFESTS = [
  [1, '0001_platform_foundation.sql', 'manifest.json'],
  [2, '0002_local_identity_approvals.sql', 'control-manifest.json'],
  [3, '0003_independent_approvals.sql', 'approval-manifest.json'],
  [4, '0004_synthetic_runner.sql', 'runner-manifest.json'],
  [5, '0005_local_scheduler.sql', 'scheduler-manifest.json'],
  [6, '0006_market_observations.sql', 'market-manifest.json'],
  [7, '0007_candidate_reconciliation.sql', 'reconciliation-manifest.json'],
  [8, '0008_product_candidates.sql', 'product-manifest.json'],
  [9, '0009_claim_lifecycle.sql', 'lifecycle-manifest.json'],
  [10, '0010_pricing_observations.sql', 'pricing-manifest.json'],
  [11, '0011_partnerships_revenue_ledger.sql', 'partnerships-revenue-manifest.json']
];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() ? [full] : [];
  });
}

const drills = [];

// 1. Migrations LF + SHA-256 verification
try {
  const entries = MIGRATION_MANIFESTS.map(([version, file, manifestFile]) => {
    const manifest = JSON.parse(readFileSync(join(migrationsDir, manifestFile), 'utf8'));
    return {
      version,
      file,
      bytes: readFileSync(join(migrationsDir, file)),
      expectedSha256: manifest.sha256
    };
  });
  const res = verifyMigrationIntegrity(entries);
  drills.push({ id: 'migrations-lf-checksums', status: 'pass', detail: `${res.verifiedCount} LF-only migrations verified` });
} catch (error) {
  drills.push({ id: 'migrations-lf-checksums', status: 'fail', detail: error instanceof Error ? error.message : 'Migration verification failed' });
}

// 2. Control-plane source pins
try {
  for (const relPath of Object.keys(reviewedLocalControlSources)) {
    const bytes = readFileSync(join(root, relPath));
    if (!isReviewedLocalControlSource(relPath, bytes)) {
      throw new Error('Control-plane source pin mismatch: ' + relPath);
    }
  }
  drills.push({ id: 'control-plane-source-pins', status: 'pass', detail: `${Object.keys(reviewedLocalControlSources).length} control-plane files verified` });
} catch (error) {
  drills.push({ id: 'control-plane-source-pins', status: 'fail', detail: error instanceof Error ? error.message : 'Control-plane pin check failed' });
}

// 3. Zero-budget policy & dist boundary check
try {
  const policy = JSON.parse(readFileSync(join(root, 'config', 'operating-policy.json'), 'utf8'));
  if (policy.monthlyBudgetINR !== 0 || policy.delegatedSpendINR !== 0) {
    throw new Error('Operating policy budget invariant violated');
  }
  const distDir = join(root, 'dist');
  if (existsSync(distDir)) {
    const files = walk(distDir).map(full => {
      const rel = relative(distDir, full).split('\\').join('/');
      return {
        path: rel,
        content: /\.(?:html?|[cm]?js|json|css|txt|xml|svg|map|md|csv)$/i.test(rel) ? readFileSync(full, 'utf8') : null
      };
    });
    const audit = auditLocalControlPlaneExport(files);
    if (audit.violations.length > 0) throw new Error(audit.violations[0]);
    drills.push({ id: 'dist-leakage-boundary', status: 'pass', detail: `${audit.checkedFiles} built files verified clean` });
  } else {
    drills.push({ id: 'dist-leakage-boundary', status: null, detail: 'dist directory not present yet' });
  }
} catch (error) {
  drills.push({ id: 'dist-leakage-boundary', status: 'fail', detail: error instanceof Error ? error.message : 'Boundary check failed' });
}

// 4. Synthetic tenant snapshot export / verify / tamper-rejection drill
try {
  const now = new Date().toISOString();
  const snapshot = buildCanonicalSnapshot({
    organizationId: 'org-drill',
    capturedAt: now,
    monthlyBudgetInr: 0,
    delegatedSpendInr: 0,
    publicAffiliateUrl: null,
    partnerships: [{ id: 'partner-drill', state: 'discovered', step: 1 }],
    forecastTotalsByCurrency: { INR: 10000 },
    actualTotalsByCurrency: { USD: 5000 },
    unknownMetricsCount: null,
    now
  });
  verifyCanonicalSnapshot(snapshot);
  let tamperRejected = false;
  try {
    verifyCanonicalSnapshot({
      ...snapshot,
      payload: { ...snapshot.payload, actualTotalsByCurrency: { USD: 9999 } }
    });
  } catch {
    tamperRejected = true;
  }
  if (!tamperRejected) throw new Error('Tamper drill did not reject corrupted snapshot');
  drills.push({ id: 'snapshot-tamper-drill', status: 'pass', detail: 'Snapshot verified and tamper rejected' });
} catch (error) {
  drills.push({ id: 'snapshot-tamper-drill', status: 'fail', detail: error instanceof Error ? error.message : 'Snapshot drill failed' });
}

const report = buildRecoveryDrillReport({
  executedAt: new Date().toISOString(),
  drills
});

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  console.log(`Recovery Drill: ${report.overallStatus.toUpperCase()} (${report.drills.length} checks)`);
}

if (report.overallStatus !== 'pass') {
  process.exitCode = 1;
}
