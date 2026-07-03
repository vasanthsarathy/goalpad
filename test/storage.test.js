import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serialize, deserialize } from '../js/storage.js';
import { createScene } from '../js/scene.js';

test('serialize then deserialize round-trips a scene', () => {
  const scene = createScene({ preset: '7v7', teamA: 7, teamB: 7, half: false }, 'My Play');
  const back = deserialize(serialize(scene));
  assert.equal(back.name, 'My Play');
  assert.equal(back.players.length, 14);
  assert.deepEqual(back.field, scene.field);
});

test('deserialize fills in missing arrays with empty defaults', () => {
  const back = deserialize(JSON.stringify({ name: 'x', field: { preset: 'custom', teamA: 2, teamB: 1, half: false }, players: [], ball: { x: 0, y: 0 } }));
  assert.deepEqual(back.annotations, []);
  assert.deepEqual(back.steps, []);
});

test('deserialize throws on invalid JSON', () => {
  assert.throws(() => deserialize('not json'));
});
