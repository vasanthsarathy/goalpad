import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIELD_DIMS, fieldViewBox, defaultPositions, createScene } from '../js/scene.js';

test('fieldViewBox full uses preset dims in tenths of a metre', () => {
  assert.deepEqual(fieldViewBox({ preset: '11v11', half: 'full' }), { w: 1050, h: 680 });
});

test('fieldViewBox halves length for left/right', () => {
  assert.deepEqual(fieldViewBox({ preset: '11v11', half: 'left' }), { w: 525, h: 680 });
  assert.deepEqual(fieldViewBox({ preset: '11v11', half: 'right' }), { w: 525, h: 680 });
});

test('defaultPositions returns count points inside the field', () => {
  const field = { preset: '9v9', half: 'full' };
  const { w, h } = fieldViewBox(field);
  const pts = defaultPositions(field, 'A', 9);
  assert.equal(pts.length, 9);
  for (const p of pts) {
    assert.ok(p.x >= 0 && p.x <= w);
    assert.ok(p.y >= 0 && p.y <= h);
  }
});

test('defaultPositions count 0 returns empty', () => {
  assert.deepEqual(defaultPositions({ preset: '7v7', half: 'full' }, 'A', 0), []);
});

test('team A sits left of centre, team B right (full pitch)', () => {
  const field = { preset: '11v11', half: 'full' };
  const { w } = fieldViewBox(field);
  assert.ok(defaultPositions(field, 'A', 11).every(p => p.x <= w / 2));
  assert.ok(defaultPositions(field, 'B', 11).every(p => p.x >= w / 2));
});

test('createScene builds pieces (players + ball) and exactly one frame', () => {
  const scene = createScene({ preset: '7v7', teamA: 7, teamB: 7, half: 'full', name: 'X' });
  assert.equal(scene.name, 'X');
  assert.equal(scene.field.preset, '7v7');
  assert.equal(scene.field.half, 'full');
  assert.equal(scene.pieces.filter(p => p.kind === 'player').length, 14);
  assert.equal(scene.pieces.filter(p => p.kind === 'ball').length, 1);
  assert.equal(scene.frames.length, 1);
});

test('createScene gives every piece a position in the frame; ball centered', () => {
  const scene = createScene({ preset: '11v11', teamA: 11, teamB: 11, half: 'full' });
  const { w, h } = fieldViewBox(scene.field);
  const pos = scene.frames[0].positions;
  for (const piece of scene.pieces) assert.ok(pos[piece.id], `position for ${piece.id}`);
  assert.deepEqual(pos['ball'], { x: Math.round(w / 2), y: Math.round(h / 2) });
  assert.deepEqual(scene.frames[0].markup, []);
});

test('createScene 0/0 gives an empty pitch (ball only)', () => {
  const scene = createScene({ preset: 'custom', teamA: 0, teamB: 0, half: 'full' });
  assert.equal(scene.pieces.filter(p => p.kind === 'player').length, 0);
  assert.equal(scene.pieces.length, 1); // just the ball
});

test('player ids and numbers are sequential per team', () => {
  const scene = createScene({ preset: 'custom', teamA: 3, teamB: 2, half: 'full' });
  assert.deepEqual(scene.pieces.filter(p => p.team === 'A').map(p => p.id), ['A1', 'A2', 'A3']);
  assert.deepEqual(scene.pieces.filter(p => p.team === 'B').map(p => p.id), ['B1', 'B2']);
});
