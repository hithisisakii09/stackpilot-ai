import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateKeyPairSync, createHash, sign } from 'node:crypto';
import { CANONICAL_VENDORS, canonicalLaunchPayload } from '../src/platform/launch/gates.mjs';
import { auditLocalControlPlaneExport } from '../src/lib/local-control-plane-export.mjs';

const cliPath = fileURLToPath(new URL('../scripts/platform-launch-gate.mjs', import.meta.url));

test('platform-launch-gate CLI fails closed (exit 1) by default and exits 0 with --allow-blocked', () => {
  const strictRes = spawnSync(process.execPath, [cliPath, '--json'], { encoding: 'utf8', windowsHide: true });
  assert.equal(strictRes.status, 1);
  const strictJson = JSON.parse(strictRes.stdout);
  assert.equal(strictJson.decision, 'blocked');
  assert.ok(strictJson.blockingReasons.includes('owner_key_ceremony_missing'));

  const allowRes = spawnSync(process.execPath, [cliPath, '--json', '--allow-blocked'], { encoding: 'utf8', windowsHide: true });
  assert.equal(allowRes.status, 0);
  const allowJson = JSON.parse(allowRes.stdout);
  assert.equal(allowJson.decision, 'blocked');
  assert.doesNotMatch(allowRes.stdout, /-----BEGIN|PRIVATE KEY/);
});

test('platform-launch-gate CLI exits 0 with decision ready when valid offline fixture is provided', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stackpilot-launch-cli-'));
  try {
    const attestedAt = new Date(Date.now() - 60000).toISOString();
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const fingerprintSha256 = createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' })).digest('hex');
    const payload = canonicalLaunchPayload({
      organizationId: 'org-alpha',
      approvedVendors: [...CANONICAL_VENDORS],
      monthlyBudgetInr: 0,
      delegatedSpendInr: 0,
      attestedAt
    });
    const signatureBase64Url = sign(null, Buffer.from(JSON.stringify(payload)), privateKey).toString('base64url');
    const fixturePath = join(dir, 'attestation.json');
    writeFileSync(fixturePath, JSON.stringify({
      organizationId: 'org-alpha',
      ceremony: {
        organizationId: 'org-alpha',
        ceremonyMode: 'offline_owner',
        publicKeyPem,
        fingerprintSha256,
        attestedAt,
        signatureBase64Url
      },
      vendorClaims: CANONICAL_VENDORS.map(vendorId => ({
        vendorId,
        claimId: 'claim-' + vendorId,
        status: 'approved',
        actorRole: 'owner',
        actorId: 'owner-1',
        requesterId: 'agent-1',
        approvedAt: attestedAt
      })),
      highOrCriticalVulnerabilities: 0
    }));

    const res = spawnSync(process.execPath, [cliPath, '--json', '--input', fixturePath], { encoding: 'utf8', windowsHide: true });
    assert.equal(res.status, 0, res.stderr);
    const out = JSON.parse(res.stdout);
    assert.equal(out.decision, 'ready');
    assert.deepEqual(out.blockingReasons, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('auditLocalControlPlaneExport blocks Phase 10 launch-gate paths and markers in dist', () => {
  for (const marker of ['verifyOwnerKeyCeremony', 'evaluateLaunchGates', 'stackpilot-launch-attestation-v1']) {
    assert.equal(auditLocalControlPlaneExport([{ path: 'assets/app.js', content: marker }]).violations.length, 1);
  }
  for (const path of ['platform/launch/gates.mjs', 'platform-launch-gate.json']) {
    assert.equal(auditLocalControlPlaneExport([{ path, content: 'ok' }]).violations.length, 1);
  }
});
