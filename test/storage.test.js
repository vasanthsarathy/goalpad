import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serialize, deserialize } from '../js/storage.js';
import { createScene, duplicateFrame } from '../js/scene.js';

test('serialize then deserialize round-trips a frames scene', () => {
  const scene = createScene({ preset: '7v7', teamA: 7, teamB: 7, half: 'left', name: 'P' });
  duplicateFrame(scene, 0);
  const back = deserialize(serialize(scene));
  assert.equal(back.name, 'P');
  assert.equal(back.field.half, 'left');
  assert.equal(back.pieces.length, 15); // 14 players + ball
  assert.equal(back.frames.length, 2);
});

test('deserialize defaults an unknown half to full', () => {
  const scene = createScene({ preset: 'custom', teamA: 1, teamB: 1, half: 'full' });
  const raw = JSON.parse(serialize(scene));
  raw.field.half = 'weird';
  assert.equal(deserialize(JSON.stringify(raw)).field.half, 'full');
});

test('deserialize throws on invalid JSON', () => {
  assert.throws(() => deserialize('not json'));
});

test('deserialize throws on a missing/invalid field preset', () => {
  assert.throws(() => deserialize('{}'));
  assert.throws(() => deserialize(JSON.stringify({ field: { preset: 'nope' }, pieces: [], frames: [{ positions: {}, markup: [] }] })));
});

test('deserialize rejects a legacy v1 scene (players/steps, no pieces/frames)', () => {
  const legacy = JSON.stringify({
    name: 'old', field: { preset: '11v11', half: false },
    players: [{ id: 'A1', team: 'A', number: 1, x: 1, y: 1 }],
    ball: { x: 0, y: 0 }, annotations: [], steps: [],
  });
  assert.throws(() => deserialize(legacy));
});
