import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtempSync, writeFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openLocalPool, openLocalControlPool } from '../../src/platform/persistence/connection.mjs';
import { applyMigrations } from '../../src/platform/persistence/migrate.mjs';
import { createIdentityService } from '../../src/platform/identity/sessions.mjs';
import { PARTNERSHIP_STEPS, OWNER_GATED_STATES } from '../../src/platform/partnerships/lifecycle.mjs';
import { createPartnershipStore } from '../../src/platform/partnerships/store.mjs';
import { createRevenueLedgerStore } from '../../src/platform/revenue/store.mjs';

const config = JSON.parse(process.env.STACKPILOT_TEST_DB ?? 'null');
if (config?.database !== 'stackpilot_partnerships_test') {
  throw new Error('Use disposable partnerships/revenue harness');
}

const admin = await openLocalPool(config);
const root = realpathSync(mkdtempSync(join(tmpdir(), 'stackpilot-phase6-')));
const trustPath = join(root, 'trust.json');
let controlPool, appPool, identity, partnerships, revenue, ownerAlpha, reviewerAlpha, ownerBeta;

test('migration 0011, 12-step partnerships, deterministic revenue ledger, and RLS isolation', async () => {
  try {
    await applyMigrations(admin, { targetVersion: 10 });
    assert.deepEqual(await applyMigrations(admin, { targetVersion: 11 }), { version: 11, applied: true });
    assert.deepEqual(await applyMigrations(admin, { targetVersion: 11 }), { version: 11, applied: false });

    const fresh = await openLocalPool({ ...config, database: 'stackpilot_partnerships_fresh' });
    const failure = await openLocalPool({ ...config, database: 'stackpilot_partnerships_failure' });
    try {
      await applyMigrations(fresh, { targetVersion: 11 });
      await applyMigrations(failure, { targetVersion: 10 });
      await failure.query('CREATE TABLE revenue_ledger_entries(fixture integer)');
      await assert.rejects(applyMigrations(failure, { targetVersion: 11 }));
      assert.equal((await failure.query('SELECT max(version) AS version FROM _platform_migrations')).rows[0].version, 10);
    } finally {
      await fresh.end();
      await failure.end();
    }

    const keys = {
      ownerAlpha: generateKeyPairSync('ed25519'),
      reviewerAlpha: generateKeyPairSync('ed25519'),
      ownerBeta: generateKeyPairSync('ed25519')
    };
    const principals = [
      {
        keyId: 'owner-alpha-key',
        userId: 'owner-alpha',
        organizationId: 'org-alpha',
        role: 'owner',
        publicKeySpkiBase64: keys.ownerAlpha.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
      },
      {
        keyId: 'reviewer-alpha-key',
        userId: 'reviewer-alpha',
        organizationId: 'org-alpha',
        role: 'reviewer',
        publicKeySpkiBase64: keys.reviewerAlpha.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
      },
      {
        keyId: 'owner-beta-key',
        userId: 'owner-beta',
        organizationId: 'org-beta',
        role: 'owner',
        publicKeySpkiBase64: keys.ownerBeta.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
      }
    ];
    writeFileSync(trustPath, JSON.stringify({ schemaVersion: 1, principals }));

    for (const org of ['org-alpha', 'org-beta']) {
      await admin.query('INSERT INTO organizations(id, name) VALUES ($1, $1)', [org]);
      await admin.query("INSERT INTO vendors(organization_id, id, name, website) VALUES ($1, 'vendor-hubspot', 'HubSpot', 'https://www.hubspot.com/')", [org]);
      await admin.query("INSERT INTO affiliate_programmes(organization_id, id, vendor_id, source_url) VALUES ($1, 'prog-hubspot', 'vendor-hubspot', 'https://www.hubspot.com/partners')", [org]);
    }
    for (const p of principals) {
      await admin.query('INSERT INTO users(organization_id, id, display_name) VALUES ($1, $2, $2)', [p.organizationId, p.userId]);
    }

    await admin.query('ALTER ROLE stackpilot_control LOGIN');
    await admin.query('ALTER ROLE stackpilot_app LOGIN');
    controlPool = await openLocalControlPool({ ...config, user: 'stackpilot_control' });
    appPool = await openLocalPool({ ...config, user: 'stackpilot_app' });
    identity = createIdentityService({ pool: controlPool, trustPath, origin: 'https://127.0.0.1:55442' });
    partnerships = createPartnershipStore({ identity, appPool });
    revenue = createRevenueLedgerStore({ identity, appPool });

    async function login(keyId, privateKey) {
      const challenge = await identity.createChallenge({ keyId });
      const signature = sign(null, Buffer.from(challenge.message), privateKey).toString('base64url');
      const session = await identity.completeChallenge({
        keyId,
        challengeId: challenge.challengeId,
        nonce: challenge.nonce,
        signature
      });
      return identity.authenticate({ keyId, token: session.token });
    }

    ownerAlpha = await login('owner-alpha-key', keys.ownerAlpha.privateKey);
    reviewerAlpha = await login('reviewer-alpha-key', keys.reviewerAlpha.privateKey);
    ownerBeta = await login('owner-beta-key', keys.ownerBeta.privateKey);

    // 1. 12-Step Partnership State Machine + Owner Gates + RLS
    const created = await partnerships.createPartnership(reviewerAlpha, {
      id: 'partner-hubspot',
      vendorId: 'vendor-hubspot',
      sourceUrl: 'https://www.hubspot.com/partners',
      occurredAt: new Date(Date.now() - 60000).toISOString()
    });
    assert.equal(created.state, 'discovered');
    assert.equal(created.step, 1);
    assert.equal(created.publicAffiliateUrl, null);

    // Reject skipped step
    await assert.rejects(
      partnerships.transitionPartnership(reviewerAlpha, {
        partnershipId: 'partner-hubspot',
        to: 'requirements_checked',
        occurredAt: new Date(Date.now() - 50000).toISOString()
      }),
      /Invalid partnership transition/
    );

    for (let i = 1; i < PARTNERSHIP_STEPS.length; i++) {
      const to = PARTNERSHIP_STEPS[i];
      const occurredAt = new Date(Date.now() - 50000 + i * 1000).toISOString();
      if (OWNER_GATED_STATES.includes(to)) {
        // Reviewer must be denied on owner-gated steps
        await assert.rejects(
          partnerships.transitionPartnership(reviewerAlpha, {
            partnershipId: 'partner-hubspot',
            to,
            occurredAt
          }),
          /Owner approval required/
        );
        const approved = await partnerships.transitionPartnership(ownerAlpha, {
          partnershipId: 'partner-hubspot',
          to,
          occurredAt
        });
        assert.equal(approved.state, to);
        assert.equal(approved.step, i + 1);
      } else {
        const stepped = await partnerships.transitionPartnership(reviewerAlpha, {
          partnershipId: 'partner-hubspot',
          to,
          occurredAt
        });
        assert.equal(stepped.state, to);
        assert.equal(stepped.step, i + 1);
        assert.equal(stepped.publicAffiliateUrl, null);
      }
    }

    const activeView = await partnerships.getPartnership(ownerAlpha, 'partner-hubspot');
    assert.equal(activeView.state, 'active');
    assert.equal(activeView.step, 12);

    // Cross-tenant RLS isolation for partnerships
    assert.equal(await partnerships.getPartnership(ownerBeta, 'partner-hubspot'), null);
    assert.equal((await partnerships.listPartnerships(ownerBeta)).length, 0);

    // Owner revocation is terminal
    const revoked = await partnerships.transitionPartnership(ownerAlpha, {
      partnershipId: 'partner-hubspot',
      to: 'revoked',
      occurredAt: new Date(Date.now() - 1000).toISOString()
    });
    assert.equal(revoked.state, 'revoked');
    await assert.rejects(
      partnerships.transitionPartnership(ownerAlpha, {
        partnershipId: 'partner-hubspot',
        to: 'discovered',
        occurredAt: new Date().toISOString()
      }),
      /Invalid partnership transition/
    );

    // 2. Deterministic Revenue Ledger + Forecast/Actual Separation + Multi-Currency + RLS
    const stmt = await revenue.recordStatement(ownerAlpha, {
      id: 'stmt-2026-11',
      programmeId: 'prog-hubspot',
      statementDigest: 'a'.repeat(64),
      recordedAt: new Date(Date.now() - 30000).toISOString()
    });
    assert.equal(stmt.id, 'stmt-2026-11');

    const periodStart = new Date(Date.now() - 86400000).toISOString();
    const periodEnd = new Date(Date.now() - 3600000).toISOString();
    const recordedAt = new Date(Date.now() - 10000).toISOString();

    await revenue.appendLedgerEntry(reviewerAlpha, {
      id: 'rev-forecast-inr',
      programmeId: 'prog-hubspot',
      entryType: 'forecast',
      entryKind: 'initial',
      currency: 'INR',
      amountMinor: 100000,
      periodStart,
      periodEnd,
      recordedAt
    });

    await revenue.appendLedgerEntry(ownerAlpha, {
      id: 'rev-actual-usd-1',
      programmeId: 'prog-hubspot',
      entryType: 'actual',
      entryKind: 'initial',
      statementId: 'stmt-2026-11',
      statementDigest: 'a'.repeat(64),
      currency: 'USD',
      amountMinor: 25000,
      periodStart,
      periodEnd,
      recordedAt,
      clicks: 10,
      conversions: null,
      payoutMinor: null,
      commissionRateBps: 1500
    });

    await revenue.appendLedgerEntry(ownerAlpha, {
      id: 'rev-actual-usd-2',
      programmeId: 'prog-hubspot',
      entryType: 'actual',
      entryKind: 'reversal',
      reversesEntryId: 'rev-actual-usd-1',
      statementId: 'stmt-2026-11',
      statementDigest: 'a'.repeat(64),
      currency: 'USD',
      amountMinor: -5000,
      periodStart,
      periodEnd,
      recordedAt
    });

    const summary = await revenue.summarizeProgrammeRevenue(ownerAlpha, 'prog-hubspot');
    assert.deepEqual(summary.actualTotalsByCurrency, { USD: 20000 });
    assert.deepEqual(summary.forecastTotalsByCurrency, { INR: 100000 });

    const listed = await revenue.listLedgerEntries(ownerAlpha, 'prog-hubspot');
    const actualEntry = listed.find(e => e.id === 'rev-actual-usd-1');
    assert.equal(actualEntry.clicks, 10);
    assert.equal(actualEntry.conversions, null);
    assert.equal(actualEntry.payoutMinor, null);

    // Cross-tenant RLS isolation for revenue ledger
    assert.equal((await revenue.listLedgerEntries(ownerBeta, 'prog-hubspot')).length, 0);
    const betaSummary = await revenue.summarizeProgrammeRevenue(ownerBeta, 'prog-hubspot');
    assert.deepEqual(betaSummary.actualTotalsByCurrency, {});
    assert.deepEqual(betaSummary.forecastTotalsByCurrency, {});
  } finally {
    await appPool?.end();
    await controlPool?.end();
    await admin.end();
    rmSync(root, { recursive: true, force: true });
  }
});
