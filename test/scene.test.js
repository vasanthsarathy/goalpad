import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIELD_DIMS, fieldViewBox, defaultPlayers, createScene, applyStep } from '../js/scene.js';

test('fieldViewBox uses preset dims in tenths of a metre', () => {
  const vb = fieldViewBox({ preset: '11v11', teamA: 11, teamB: 11, half: false });
  assert.deepEqual(vb, { w: 1050, h: 680 });
});

test('fieldViewBox halves length when half is true', () => {
  const vb = fieldViewBox({ preset: '11v11', teamA: 11, teamB: 11, half: true });
  assert.deepEqual(vb, { w: 525, h: 680 });
});

test('defaultPlayers returns the requested counts per team', () => {
  const field = { preset: '7v7', teamA: 7, teamB: 7, half: false };
  const players = defaultPlayers(field);
  assert.equal(players.filter(p => p.team === 'A').length, 7);
  assert.equal(players.filter(p => p.team === 'B').length, 7);
});

test('defaultPlayers gives unique ids and in-bounds coords', () => {
  const field = { preset: '9v9', teamA: 9, teamB: 9, half: false };
  const { w, h } = fieldViewBox(field);
  const players = defaultPlayers(field);
  const ids = new Set(players.map(p => p.id));
  assert.equal(ids.size, players.length);
  for (const p of players) {
    assert.ok(p.x >= 0 && p.x <= w, `x in range: ${p.x}`);
    assert.ok(p.y >= 0 && p.y <= h, `y in range: ${p.y}`);
  }
});

test('team A players sit in the left half, team B in the right half', () => {
  const field = { preset: '11v11', teamA: 11, teamB: 11, half: false };
  const { w } = fieldViewBox(field);
  const players = defaultPlayers(field);
  assert.ok(players.filter(p => p.team === 'A').every(p => p.x <= w / 2));
  assert.ok(players.filter(p => p.team === 'B').every(p => p.x >= w / 2));
});

test('custom preset supports asymmetric counts (2v1)', () => {
  const field = { preset: 'custom', teamA: 2, teamB: 1, half: false };
  const players = defaultPlayers(field);
  assert.equal(players.filter(p => p.team === 'A').length, 2);
  assert.equal(players.filter(p => p.team === 'B').length, 1);
});

test('createScene centers the ball and starts with no steps', () => {
  const scene = createScene({ preset: '7v7', teamA: 7, teamB: 7, half: false });
  const { w, h } = fieldViewBox(scene.field);
  assert.deepEqual(scene.ball, { x: w / 2, y: h / 2 });
  assert.deepEqual(scene.steps, []);
  assert.deepEqual(scene.annotations, []);
});

test('applyStep writes snapshot coords back onto matching players', () => {
  const scene = createScene({ preset: 'custom', teamA: 1, teamB: 1, half: false });
  const id = scene.players[0].id;
  applyStep(scene, { players: [{ id, x: 123, y: 45 }], ball: { x: 10, y: 20 } });
  assert.deepEqual(
    { x: scene.players.find(p => p.id === id).x, y: scene.players.find(p => p.id === id).y },
    { x: 123, y: 45 }
  );
  assert.deepEqual(scene.ball, { x: 10, y: 20 });
});
