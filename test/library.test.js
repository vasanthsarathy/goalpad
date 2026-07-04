import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIBRARY } from '../js/library.js';
import { serialize, deserialize } from '../js/storage.js';

test('every preset has required fields and a valid category', () => {
  for (const p of LIBRARY) {
    assert.ok(p.id && p.name && p.group && p.description, `fields for ${p.id}`);
    assert.ok(['tactics', 'drills'].includes(p.category), `category for ${p.id}`);
    assert.ok(p.scene && Array.isArray(p.scene.pieces) && Array.isArray(p.scene.frames), `scene for ${p.id}`);
  }
});

test('preset ids are unique', () => {
  const ids = LIBRARY.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every preset scene is a valid frames scene that round-trips', () => {
  for (const p of LIBRARY) {
    const back = deserialize(serialize(p.scene));
    assert.equal(back.pieces.length, p.scene.pieces.length, `pieces ${p.id}`);
    assert.equal(back.frames.length, p.scene.frames.length, `frames ${p.id}`);
    assert.ok(p.scene.frames.length >= 1, `>=1 frame ${p.id}`);
  }
});

test('every frame has a position for every piece', () => {
  for (const p of LIBRARY) {
    const ids = p.scene.pieces.map((pc) => pc.id);
    for (const f of p.scene.frames) {
      for (const id of ids) assert.ok(f.positions[id], `${p.id}: frame missing ${id}`);
    }
  }
});
