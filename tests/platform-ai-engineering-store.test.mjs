import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiRouterStore } from '../src/platform/ai/store.mjs';
import { createEngineeringIntelligenceStore } from '../src/platform/engineering/store.mjs';
import { auditLocalControlPlaneExport } from '../src/lib/local-control-plane-export.mjs';

const fakeIdentity = {};
const fakeAppPool = { connect: async () => { throw new Error('Should not connect'); } };

test('AI router and engineering stores validate options and reject paid/secret/Proxy inputs before DB access', async () => {
  assert.throws(() => createAiRouterStore({}), /Invalid platform contract/);
  assert.throws(() => createEngineeringIntelligenceStore({}), /Invalid platform contract/);
  assert.throws(() => createAiRouterStore({ identity: fakeIdentity, appPool: null }), /AI router store operation failed/);
  assert.throws(() => createEngineeringIntelligenceStore({ identity: fakeIdentity, appPool: null }), /Engineering store operation failed/);

  const aiStore = createAiRouterStore({ identity: fakeIdentity, appPool: fakeAppPool });
  const engStore = createEngineeringIntelligenceStore({ identity: fakeIdentity, appPool: fakeAppPool });
  const fakeHandle = Object.freeze(Object.create(null));

  await assert.rejects(
    () => aiStore.routeAndRecord(fakeHandle, {
      taskClass: 'code_review',
      prompt: 'Safe prompt',
      requestedTokens: 100,
      timestamp: '2026-11-26T12:00:00.000Z',
      registry: [{
        id: 'paid-model',
        provider: 'vendor',
        tier: 'paid',
        estimatedCostMinor: 0,
        maxContextTokens: 8192,
        priority: 1,
        capabilities: ['code_review'],
        dailyCallLimit: 10,
        dailyTokenLimit: 10000,
        callsUsed: 0,
        tokensUsed: 0,
        healthy: true,
        rateLimited: false,
        circuitOpen: false
      }]
    }),
    /budget_violation/
  );

  await assert.rejects(
    () => aiStore.routeAndRecord(fakeHandle, {
      taskClass: 'code_review',
      prompt: 'sk-1234567890abcdef123456',
      requestedTokens: 100,
      timestamp: '2026-11-26T12:00:00.000Z',
      registry: []
    }),
    /secret_detected/
  );

  await assert.rejects(
    () => engStore.recordHealthReport(fakeHandle, new Proxy({}, {})),
    /Invalid engineering input/
  );

  await assert.rejects(
    () => engStore.approveEngineeringProposal(fakeHandle, {
      id: 'prop-1',
      actionType: 'dependency_update',
      summary: 'Update package',
      requesterId: 'agent-1',
      proposedAt: '2026-11-26T11:00:00.000Z',
      now: '2026-11-26T12:00:00.000Z'
    }),
    /Engineering store operation failed/
  );
});

test('auditLocalControlPlaneExport blocks Phase 7 AI router and engineering intelligence paths and markers in dist', () => {
  for (const marker of [
    'routeAiRequest',
    'createAiRouterStore',
    'evaluateCiHealth',
    'triageRegression',
    'validateEngineeringProposal',
    'createEngineeringIntelligenceStore',
    'ai-routing-decision',
    'engineering-action-approval'
  ]) {
    const res = auditLocalControlPlaneExport([{ path: 'assets/app.js', content: `export const x = "${marker}";` }]);
    assert.equal(res.violations.length, 1);
  }
  for (const path of [
    'platform/ai/router.mjs',
    'platform/ai/store.mjs',
    'platform/engineering/intelligence.mjs',
    'platform/engineering/store.mjs'
  ]) {
    const res = auditLocalControlPlaneExport([{ path, content: 'ok' }]);
    assert.equal(res.violations.length, 1);
  }
});
