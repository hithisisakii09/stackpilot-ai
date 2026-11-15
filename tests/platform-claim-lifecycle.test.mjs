import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateClaimTransition, effectiveClaimState, normalizeLifecycleInput} from '../src/platform/products/lifecycle.mjs';
import * as migrations from '../src/platform/persistence/migrate.mjs';
import {auditLocalControlPlaneExport} from '../src/lib/local-control-plane-export.mjs';

const transition = patch => ({from:'needs-review', to:'verified', role:'owner', decision:'approved', requesterUserId:'reviewer-user', actorId:'owner-user', current:true, ...patch});
const state = patch => ({recordedStatus:'approved', bindingMatches:true, evidenceRevoked:false, expired:false, decision:'approved', ...patch});
const input = patch => ({claimId:'claim-alpha', agentId:'qa-agent', expectedVersion:0, idempotencyKey:'collect-alpha', to:'evidence-collected', expiresAt:'2026-02-01T00:00:00.000Z', ...patch});

test('lifecycle requires explicit collection, review, verification and approval steps', () => {
  assert.equal(evaluateClaimTransition(transition()), 'verified');
  assert.equal(evaluateClaimTransition(transition({from:'verified', to:'approved'})), 'approved');
  assert.equal(evaluateClaimTransition(transition({from:'candidate', to:'evidence-collected', role:'reviewer', decision:null, requesterUserId:null})), 'evidence-collected');
  for (const [from,to] of [['candidate','approved'], ['evidence-collected','verified'], ['needs-review','approved'], ['approved','published']]) assert.throws(() => evaluateClaimTransition(transition({from,to})));
});

test('owner identity and independent current approval are mandatory', () => {
  for (const patch of [{role:'reviewer'}, {role:'agent'}, {decision:null}, {decision:'revoked'}, {actorId:'reviewer-user'}, {current:false}]) assert.throws(() => evaluateClaimTransition(transition(patch)));
});

test('rejected, stale and invalidated claims require a fresh evidence collection cycle', () => {
  for (const from of ['rejected','stale','reverification-required']) {
    assert.equal(evaluateClaimTransition(transition({from,to:'evidence-collected',role:'reviewer',decision:null,current:false})), 'evidence-collected');
    assert.throws(() => evaluateClaimTransition(transition({from,to:'approved'})));
  }
  assert.equal(evaluateClaimTransition(transition({to:'rejected',decision:'rejected'})), 'rejected');
  assert.throws(() => evaluateClaimTransition(transition({to:'rejected',decision:'approved'})));
});

test('effective state immediately invalidates changed, revoked or expired evidence and approval', () => {
  assert.equal(effectiveClaimState(state()).status, 'approved');
  for (const patch of [{bindingMatches:false}, {evidenceRevoked:true}, {decision:'revoked'}, {decision:null}]) assert.equal(effectiveClaimState(state(patch)).status, 'reverification-required');
  assert.equal(effectiveClaimState(state({expired:true})).status, 'stale');
  assert.equal(effectiveClaimState(state({recordedStatus:'needs-review',decision:null})).status, 'needs-review');
});

test('transition input captures strict data and rejects authority, invalid clocks and skipped fields', () => {
  const captured = normalizeLifecycleInput(input());
  assert.equal(Object.isFrozen(captured), true);
  assert.throws(() => normalizeLifecycleInput(input({role:'owner'})));
  assert.throws(() => normalizeLifecycleInput(input({expectedVersion:-1})));
  assert.throws(() => normalizeLifecycleInput(input({expiresAt:'2026-02-30T00:00:00.000Z'})));
  assert.throws(() => normalizeLifecycleInput(input({to:'approved'})));
  assert.throws(() => normalizeLifecycleInput(input({to:'needs-review',expiresAt:undefined})));
  const hostile = input();
  Object.defineProperty(hostile, 'claimId', {enumerable:true,get(){throw new Error('getter');}});
  assert.throws(() => normalizeLifecycleInput(hostile), /Invalid platform contract/);
});

test('migration nine is bound to canonical bytes and static export rejects lifecycle material', () => {
  assert.equal(typeof migrations.verifyLifecycleMigration, 'function');
  const bytes=readFileSync(new URL('../src/platform/persistence/migrations/0009_claim_lifecycle.sql',import.meta.url));
  const manifest=JSON.parse(readFileSync(new URL('../src/platform/persistence/migrations/lifecycle-manifest.json',import.meta.url)));
  assert.equal(migrations.verifyLifecycleMigration(bytes,manifest),true);
  assert.throws(()=>migrations.verifyLifecycleMigration(Buffer.concat([bytes,Buffer.from('-- drift')]),manifest));
  for(const file of [{path:'claim_lifecycle_events.json',content:''},{path:'evidence_revocations.json',content:''},{path:'assets/app.js',content:'createClaimLifecycleService claim-review-lifecycle-v1'},{path:'assets/helper.js',content:'readClaimReviewSnapshot inspectClaimApproval'}]) assert.equal(auditLocalControlPlaneExport([file]).violations.length,1);
});
