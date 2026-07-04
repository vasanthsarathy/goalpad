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

test('deserialize throws on a malformed frame', () => {
  const base = { field: { preset: '11v11', half: 'full' }, pieces: [] };
  // positions not an object
  assert.throws(() => deserialize(JSON.stringify({ ...base, frames: [{ positions: null, markup: [] }] })));
  // markup not an array
  assert.throws(() => deserialize(JSON.stringify({ ...base, frames: [{ positions: {}, markup: 'x' }] })));
});

// ---- Mine (saved tactics) + migration ----

import { newTactic, validLegacyEntries } from '../js/storage.js';

test('newTactic builds a record with id, name, synced scene.name, numeric updatedAt', () => {
  const scene = createScene({ preset: '7v7', teamA: 7, teamB: 7, half: 'full' });
  const t = newTactic('My Play', scene);
  assert.equal(typeof t.id, 'string');
  assert.ok(t.id.length > 0);
  assert.equal(t.name, 'My Play');
  assert.equal(t.scene.name, 'My Play');
  assert.equal(typeof t.updatedAt, 'number');
});

test('newTactic defaults a blank name to Untitled', () => {
  const scene = createScene({ preset: '7v7', teamA: 7, teamB: 7, half: 'full' });
  assert.equal(newTactic('', scene).name, 'Untitled');
  assert.equal(newTactic('   ', scene).name, 'Untitled');
});

test('validLegacyEntries keeps deserializable entries and skips the rest', () => {
  const scene = createScene({ preset: '9v9', teamA: 9, teamB: 9, half: 'full' });
  const entries = [
    { name: 'good', str: serialize(scene) },
    { name: 'bad', str: '{not valid json}' },
    { name: 'legacy', str: JSON.stringify({ foo: 1 }) },
  ];
  const out = validLegacyEntries(entries);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, 'good');
  assert.equal(out[0].scene.field.preset, '9v9');
});
