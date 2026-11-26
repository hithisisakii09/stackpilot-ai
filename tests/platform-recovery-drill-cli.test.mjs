import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { auditLocalControlPlaneExport } from '../src/lib/local-control-plane-export.mjs';

const cliPath = fileURLToPath(new URL('../scripts/platform-recovery-drill.mjs', import.meta.url));

test('platform-recovery-drill CLI outputs valid JSON report and exits 0', () => {
  const res = spawnSync(process.execPath, [cliPath, '--json'], { encoding: 'utf8', windowsHide: true });
  assert.equal(res.status, 0, res.stderr);
  const report = JSON.parse(res.stdout);
  assert.equal(report.overallStatus, 'pass');
  assert.ok(Array.isArray(report.drills));
  assert.ok(report.drills.some(d => d.id === 'migrations-lf-checksums' && d.status === 'pass'));
  assert.ok(report.drills.some(d => d.id === 'control-plane-source-pins' && d.status === 'pass'));
  assert.ok(report.drills.some(d => d.id === 'snapshot-tamper-drill' && d.status === 'pass'));
  assert.doesNotMatch(res.stdout, /-----BEGIN|sk-|ghp_|AIza/);
});

test('auditLocalControlPlaneExport blocks Phase 9 recovery drill paths and markers in dist', () => {
  for (const marker of ['buildCanonicalSnapshot', 'verifyCanonicalSnapshot', 'stackpilot-recovery-snapshot-v1']) {
    assert.equal(auditLocalControlPlaneExport([{ path: 'assets/app.js', content: marker }]).violations.length, 1);
  }
  for (const path of ['platform/recovery/drills.mjs', 'platform-recovery-drill.json']) {
    assert.equal(auditLocalControlPlaneExport([{ path, content: 'ok' }]).violations.length, 1);
  }
});
