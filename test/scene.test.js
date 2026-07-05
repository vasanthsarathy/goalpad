import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIELD_DIMS, fieldViewBox, defaultPositions, createScene, pieceById, addPlayer, addCone, addBall, removePiece, duplicateFrame, deleteFrame, emptyScratchScene } from '../js/scene.js';

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

test('addPlayer uses the next free number and adds a position in every frame', () => {
  const scene = createScene({ preset: 'custom', teamA: 2, teamB: 0, half: 'full' });
  duplicateFrame(scene, 0); // now 2 frames
  const id = addPlayer(scene, 'A', 100, 120);
  assert.equal(id, 'A3');
  assert.ok(scene.pieces.some(p => p.id === 'A3' && p.team === 'A' && p.number === 3));
  assert.deepEqual(scene.frames[0].positions['A3'], { x: 100, y: 120 });
  assert.deepEqual(scene.frames[1].positions['A3'], { x: 100, y: 120 });
});

test('addPlayer fills a gap left by a deletion', () => {
  const scene = createScene({ preset: 'custom', teamA: 3, teamB: 0, half: 'full' });
  removePiece(scene, 'A2');
  assert.equal(addPlayer(scene, 'A', 10, 10), 'A2');
});

test('addCone gives sequential cone ids and positions in all frames', () => {
  const scene = createScene({ preset: 'custom', teamA: 0, teamB: 0, half: 'full' });
  const c1 = addCone(scene, 5, 6);
  const c2 = addCone(scene, 7, 8);
  assert.equal(c1, 'cone-1');
  assert.equal(c2, 'cone-2');
  assert.deepEqual(scene.frames[0].positions['cone-1'], { x: 5, y: 6 });
});

test('removePiece deletes the piece and clears it from every frame', () => {
  const scene = createScene({ preset: 'custom', teamA: 2, teamB: 0, half: 'full' });
  duplicateFrame(scene, 0);
  removePiece(scene, 'A1');
  assert.equal(pieceById(scene, 'A1'), null);
  assert.equal(scene.frames[0].positions['A1'], undefined);
  assert.equal(scene.frames[1].positions['A1'], undefined);
});

test('duplicateFrame deep-copies positions and starts with empty markup', () => {
  const scene = createScene({ preset: 'custom', teamA: 1, teamB: 0, half: 'full' });
  scene.frames[0].markup.push({ type: 'text', x: 1, y: 2, text: 'hi' });
  const idx = duplicateFrame(scene, 0);
  assert.equal(idx, 1);
  assert.deepEqual(scene.frames[1].markup, []);
  scene.frames[0].positions['A1'].x = 999;
  assert.notEqual(scene.frames[1].positions['A1'].x, 999); // deep copy
});

test('deleteFrame removes a frame but never the last one', () => {
  const scene = createScene({ preset: 'custom', teamA: 1, teamB: 0, half: 'full' });
  assert.equal(deleteFrame(scene, 0), false); // only one frame
  duplicateFrame(scene, 0);
  assert.equal(deleteFrame(scene, 1), true);
  assert.equal(scene.frames.length, 1);
});

test('addBall adds a ball with a position in every frame when absent', () => {
  const scene = createScene({ preset: '7v7', teamA: 3, teamB: 3, half: 'full' });
  // remove the default ball first
  scene.pieces = scene.pieces.filter((p) => p.kind !== 'ball');
  for (const f of scene.frames) delete f.positions.ball;
  scene.frames.push({ positions: { ...scene.frames[0].positions }, markup: [] });

  const id = addBall(scene, 100, 120);
  assert.equal(id, 'ball');
  assert.equal(scene.pieces.filter((p) => p.kind === 'ball').length, 1);
  for (const f of scene.frames) {
    assert.ok(f.positions.ball, 'every frame has a ball position');
  }
  assert.deepEqual(scene.frames[0].positions.ball, { x: 100, y: 120 });
});

test('addBall is a no-op returning null when a ball already exists', () => {
  const scene = createScene({ preset: '7v7', teamA: 3, teamB: 3, half: 'full' });
  const before = scene.pieces.length;
  assert.equal(addBall(scene, 5, 5), null);
  assert.equal(scene.pieces.length, before);
});

test('emptyScratchScene: 7v7 full, no players, ball, one frame, named Scratchpad', () => {
  const s = emptyScratchScene();
  assert.equal(s.field.preset, '7v7');
  assert.equal(s.field.half, 'full');
  assert.equal(s.name, 'Scratchpad');
  assert.equal(s.frames.length, 1);
  assert.equal(s.pieces.filter((p) => p.kind === 'player').length, 0);
  assert.ok(s.pieces.some((p) => p.kind === 'ball'));
});
