import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIBRARY } from '../js/library.js';
import { serialize, deserialize } from '../js/storage.js';
import { fieldViewBox } from '../js/scene.js';

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

test('library ships 25 tactics and 19 drills (core + season)', () => {
  assert.equal(LIBRARY.filter((p) => p.category === 'tactics').length, 25);
  assert.equal(LIBRARY.filter((p) => p.category === 'drills').length, 19);
});

test('player pieces carry a team and number; all pieces have id and kind', () => {
  for (const p of LIBRARY) {
    for (const pc of p.scene.pieces) {
      assert.ok(pc.id && pc.kind, `${p.id}: piece needs id+kind`);
      if (pc.kind === 'player') {
        assert.ok(pc.team === 'A' || pc.team === 'B', `${p.id}/${pc.id}: player team`);
        assert.ok(Number.isInteger(pc.number), `${p.id}/${pc.id}: player number`);
      }
    }
  }
});

test('markup shapes are well-formed', () => {
  for (const p of LIBRARY) {
    for (const f of p.scene.frames) {
      for (const m of f.markup) {
        if (m.type === 'arrow') assert.ok([m.x1, m.y1, m.x2, m.y2].every(Number.isFinite), `${p.id}: arrow coords`);
        else if (m.type === 'pen') assert.ok(Array.isArray(m.points) && m.points.length > 1, `${p.id}: pen points`);
        else if (m.type === 'text') assert.ok(typeof m.text === 'string' && Number.isFinite(m.x) && Number.isFinite(m.y), `${p.id}: text`);
        else assert.fail(`${p.id}: unknown markup type ${m.type}`);
      }
    }
  }
});

test('every position is within the pitch bounds', () => {
  for (const p of LIBRARY) {
    const { w, h } = fieldViewBox(p.scene.field);
    for (const f of p.scene.frames) {
      for (const [id, pos] of Object.entries(f.positions)) {
        assert.ok(pos.x >= 0 && pos.x <= w && pos.y >= 0 && pos.y <= h, `${p.id}: ${id} off-pitch (${pos.x},${pos.y}) in ${w}x${h}`);
      }
    }
  }
});
