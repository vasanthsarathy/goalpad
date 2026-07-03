import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureStep, ease, interpolateSteps } from '../js/steps.js';

test('captureStep snapshots player and ball coords by id', () => {
  const scene = { players: [{ id: 'A1', x: 10, y: 20 }, { id: 'B1', x: 30, y: 40 }], ball: { x: 5, y: 6 } };
  const step = captureStep(scene);
  assert.deepEqual(step, { players: [{ id: 'A1', x: 10, y: 20 }, { id: 'B1', x: 30, y: 40 }], ball: { x: 5, y: 6 } });
});

test('captureStep is a deep copy (mutating scene does not change the step)', () => {
  const scene = { players: [{ id: 'A1', x: 10, y: 20 }], ball: { x: 0, y: 0 } };
  const step = captureStep(scene);
  scene.players[0].x = 999;
  assert.equal(step.players[0].x, 10);
});

test('ease is 0 at 0, 1 at 1, and 0.5 at midpoint', () => {
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.ok(Math.abs(ease(0.5) - 0.5) < 1e-9);
});

test('interpolateSteps blends coords linearly by t', () => {
  const a = { players: [{ id: 'A1', x: 0, y: 0 }], ball: { x: 0, y: 0 } };
  const b = { players: [{ id: 'A1', x: 100, y: 200 }], ball: { x: 10, y: 20 } };
  const mid = interpolateSteps(a, b, 0.5);
  assert.deepEqual(mid.players[0], { id: 'A1', x: 50, y: 100 });
  assert.deepEqual(mid.ball, { x: 5, y: 10 });
});

test('interpolateSteps keeps an id present only in the from-step', () => {
  const a = { players: [{ id: 'A1', x: 0, y: 0 }, { id: 'B1', x: 10, y: 10 }], ball: { x: 0, y: 0 } };
  const b = { players: [{ id: 'A1', x: 100, y: 0 }], ball: { x: 0, y: 0 } };
  const mid = interpolateSteps(a, b, 0.5);
  const b1 = mid.players.find(p => p.id === 'B1');
  assert.deepEqual(b1, { id: 'B1', x: 10, y: 10 }); // no target → stays put
});
