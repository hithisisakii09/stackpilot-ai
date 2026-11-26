import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateLaunchGates } from '../src/platform/launch/gates.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const allowBlocked = process.argv.includes('--allow-blocked');
const jsonMode = process.argv.includes('--json');

let inputPath = null;
const inputFlagIdx = process.argv.indexOf('--input');
if (inputFlagIdx >= 0 && process.argv[inputFlagIdx + 1]) {
  inputPath = process.argv[inputFlagIdx + 1];
}

let fixture = { organizationId: 'org-stackpilot', ceremony: null, vendorClaims: [], highOrCriticalVulnerabilities: null };
if (inputPath) {
  fixture = JSON.parse(readFileSync(inputPath, 'utf8'));
}

const policy = JSON.parse(readFileSync(join(root, 'config', 'operating-policy.json'), 'utf8'));
const drillProc = spawnSync(process.execPath, [join(root, 'scripts', 'platform-recovery-drill.mjs'), '--json'], {
  encoding: 'utf8',
  windowsHide: true
});

let drillReport = null;
try {
  drillReport = JSON.parse(drillProc.stdout || 'null');
} catch {}

let preflightViolations = null;
if (existsSync(join(root, 'dist'))) {
  const preProc = spawnSync(process.execPath, [join(root, 'scripts', 'release-preflight.mjs'), '--json'], {
    encoding: 'utf8',
    windowsHide: true
  });
  try {
    const pre = JSON.parse(preProc.stdout || 'null');
    if (Array.isArray(pre?.violations)) preflightViolations = pre.violations.length;
  } catch {}
}

const migrationsOk = drillReport?.drills?.find(d => d.id === 'migrations-lf-checksums')?.status === 'pass';

const report = evaluateLaunchGates({
  organizationId: fixture.organizationId ?? 'org-stackpilot',
  ceremony: fixture.ceremony ?? null,
  vendorClaims: fixture.vendorClaims ?? [],
  signals: {
    monthlyBudgetInr: policy.monthlyBudgetINR,
    delegatedSpendInr: policy.delegatedSpendINR,
    migrationCrlf: migrationsOk ? 0 : 1,
    migrationsVerified: migrationsOk,
    recoveryDrillStatus: drillReport?.overallStatus ?? null,
    preflightViolations,
    highOrCriticalVulnerabilities: fixture.highOrCriticalVulnerabilities ?? null
  }
});

if (jsonMode) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  console.log(`Launch Gate Decision: ${report.decision.toUpperCase()} | Passed: ${report.passedGates.length} | Blockers: ${report.blockingReasons.join(', ') || 'none'}`);
}

if (report.decision !== 'ready' && !allowBlocked) {
  process.exitCode = 1;
}
