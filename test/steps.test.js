import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ease, interpolateFrames, activeMarkupIndex } from '../js/steps.js';

test('ease is smoothstep: 0->0, 1->1, 0.5->0.5', () => {
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.ok(Math.abs(ease(0.5) - 0.5) < 1e-9);
});

test('interpolateFrames blends each piece position by t', () => {
  const a = { positions: { A1: { x: 0, y: 0 }, ball: { x: 0, y: 0 } }, markup: [] };
  const b = { positions: { A1: { x: 100, y: 200 }, ball: { x: 10, y: 20 } }, markup: [] };
  const mid = interpolateFrames(a, b, 0.5);
  assert.deepEqual(mid.A1, { x: 50, y: 100 });
  assert.deepEqual(mid.ball, { x: 5, y: 10 });
});

test('interpolateFrames holds a piece missing from the target frame', () => {
  const a = { positions: { A1: { x: 10, y: 10 }, B1: { x: 5, y: 5 } }, markup: [] };
  const b = { positions: { A1: { x: 20, y: 10 } }, markup: [] };
  const mid = interpolateFrames(a, b, 0.5);
  assert.deepEqual(mid.B1, { x: 5, y: 5 }); // no target -> stays put
});

test('activeMarkupIndex rounds at integers and ceils mid-transition', () => {
  assert.equal(activeMarkupIndex(0), 0);
  assert.equal(activeMarkupIndex(2), 2);
  assert.equal(activeMarkupIndex(1.0000001), 1); // within epsilon -> round
  assert.equal(activeMarkupIndex(1.3), 2);        // mid -> ceil (target frame)
  assert.equal(activeMarkupIndex(0.5), 1);
});
