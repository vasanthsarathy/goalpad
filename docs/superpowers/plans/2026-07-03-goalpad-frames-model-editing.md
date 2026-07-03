# goalpad Group A — Frames Model & Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor goalpad to an entities-and-frames model so markup can be tied to a step, players can be added/removed while persisting across frames, a frame can be deleted, and a half-pitch renders on a chosen side.

**Architecture:** A scene becomes `pieces` (players/ball/cones) + ordered `frames`; each frame holds every piece's position and its own markup. Pure modules (`scene.js`, `steps.js`, `storage.js`) are rewritten and unit-tested with `node:test`; DOM modules (`field.js`, `tokens.js`, `tools.js`, `app.js`) are rebuilt on the new model and verified in the browser. This is a staged refactor: the pure core is replaced first (Tasks 1–4, Node tests stay green), then the DOM layers are rebuilt (Tasks 5–8), and the app is fully rewired and browser-verified in Task 9. Between Tasks 1 and 9 the browser app is intentionally not runnable; `node --test` and `node --check` are the gates until Task 9.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, SVG, Pointer Events, `localStorage`, `node:test`.

## Global Constraints

- No build step, no third-party runtime dependencies. All rendering inside one `<svg>`.
- Scene shape is exactly:
  `{ name, field:{preset,half}, pieces:[{id,kind,team?,number?}], frames:[{positions:{[id]:{x,y}}, markup:[...]}] }`.
- `field.preset` ∈ `{"11v11","9v9","7v7","custom"}`; `field.half` ∈ `{"full","left","right"}`.
- `kind` ∈ `{"player","ball","cone"}`. Player ids `A<n>`/`B<n>`; ball id `"ball"`; cone ids `cone-<n>`.
- Every piece has a position entry in **every** frame. Adding a piece adds its position to all frames; removing a piece deletes it from all frames.
- Markup (`arrow`/`pen`/`text`) lives in `frame.markup` and shows only for the active frame; it never tweens.
- There is always ≥1 frame. "Add step" duplicates the current frame's positions with **empty** markup; "Delete step" is blocked at the last frame.
- Coordinates are in the field's SVG viewBox units (1 unit = 0.1 m).
- Interaction uses Pointer Events. ES module imports use explicit `./name.js` paths. Pure modules (`scene.js`, `steps.js`, `storage.js`) must not touch `document`/`window`/`localStorage` at import time.
- Colors: Team A `#2f6fed`, Team B `#e8552d`, ball `#ffffff` (outline `#1e232b`), cone `#ff9f1c`, markup `#ffe14d` (text `#ffffff`).
- Active-markup index from scrub position `pos`: if `|pos - round(pos)| < 1e-6` use `round(pos)`, else `ceil(pos)`.
- Old v1 saved scenes (shape `{players, steps}` without `pieces`/`frames`) are rejected by `deserialize` (throw), surfaced via the import `.catch`.

---

## File Structure

```
js/
  scene.js     # PURE model: pieces+frames, createScene, defaultPositions, add/remove/duplicate/delete helpers
  steps.js     # PURE interpolateFrames/ease/activeMarkupIndex + browser Play/scrub controller
  storage.js   # PURE serialize/deserialize (+validation) + localStorage/file I/O
  field.js     # DOM: pitch markings for full/left/right
  tokens.js    # DOM: render pieces (player/ball/cone) from a frame; drag (only in select tool); setTokenPositions
  tools.js     # DOM: renderMarkup(frame); initTools (add player/cone, draw markup, delete piece/markup)
  app.js       # DOM: owns scene + current frame index; wires everything; browser entry
test/
  scene.test.js
  steps.test.js
  storage.test.js
```

---

## Task 1: scene.js — model core (createScene, fieldViewBox, defaultPositions)

**Files:**
- Rewrite: `js/scene.js`
- Rewrite: `test/scene.test.js`

**Interfaces:**
- Produces:
  - `FIELD_DIMS` — preset → `{length_m,width_m}`.
  - `fieldViewBox(field)` → `{w,h}` (half → half length).
  - `defaultPositions(field, team, count)` → `[{x,y}]` (count 0 → `[]`).
  - `createScene(opts)` where `opts={preset,teamA,teamB,half,name}` → scene with `pieces` + one `frame`.

- [ ] **Step 1: Write failing tests at `test/scene.test.js`** (replace entire file)

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/scene.test.js`
Expected: FAIL — new exports not present / shape mismatch.

- [ ] **Step 3: Rewrite `js/scene.js`** (replace entire file)

```javascript
// scene.js — PURE model helpers (entities + frames). No DOM/window access anywhere.

export const FIELD_DIMS = {
  '11v11': { length_m: 105, width_m: 68 },
  '9v9':   { length_m: 75,  width_m: 50 },
  '7v7':   { length_m: 55,  width_m: 37 },
  'custom':{ length_m: 40,  width_m: 30 },
};

export function fieldViewBox(field) {
  const dims = FIELD_DIMS[field.preset] || FIELD_DIMS.custom;
  const length = field.half === 'full' ? dims.length_m : dims.length_m / 2;
  return { w: Math.round(length * 10), h: Math.round(dims.width_m * 10) };
}

// Spread `count` points across a near-square grid inside a rectangle.
function spread(count, xMin, xMax, yMin, yMax) {
  const pts = [];
  if (count <= 0) return pts;
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const rowCount = Math.min(cols, count - r * cols);
    const x = xMin + (xMax - xMin) * ((r + 1) / (rows + 1));
    const y = yMin + (yMax - yMin) * ((c + 1) / (rowCount + 1));
    pts.push({ x: Math.round(x), y: Math.round(y) });
  }
  return pts;
}

// team 'A' occupies the left of the current view, 'B' the right.
export function defaultPositions(field, team, count) {
  const { w, h } = fieldViewBox(field);
  const margin = w * 0.06;
  const xMin = team === 'A' ? margin : w / 2 + margin * 0.5;
  const xMax = team === 'A' ? w / 2 - margin * 0.5 : w - margin;
  return spread(count, xMin, xMax, h * 0.1, h * 0.9);
}

export function createScene(opts) {
  const field = { preset: opts.preset, half: opts.half || 'full' };
  const { w, h } = fieldViewBox(field);
  const pieces = [];
  const positions = {};

  const addTeam = (team, count) => {
    const pts = defaultPositions(field, team, count);
    for (let i = 0; i < count; i++) {
      const number = i + 1;
      const id = `${team}${number}`;
      pieces.push({ id, kind: 'player', team, number });
      positions[id] = pts[i];
    }
  };
  addTeam('A', opts.teamA);
  addTeam('B', opts.teamB);

  pieces.push({ id: 'ball', kind: 'ball' });
  positions['ball'] = { x: Math.round(w / 2), y: Math.round(h / 2) };

  return {
    name: opts.name || 'Untitled',
    field,
    pieces,
    frames: [{ positions, markup: [] }],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/scene.test.js`
Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
git add js/scene.js test/scene.test.js
git commit -m "feat: frames-model scene core (pieces + frames, createScene)"
```

---

## Task 2: scene.js — mutation helpers

**Files:**
- Modify: `js/scene.js` (append helpers)
- Modify: `test/scene.test.js` (append tests)

**Interfaces:**
- Consumes: the scene shape from Task 1.
- Produces:
  - `pieceById(scene, id)` → piece | null.
  - `addPlayer(scene, team, x, y)` → new id (next free number for team; position added to all frames).
  - `addCone(scene, x, y)` → new id (`cone-<n>`; position added to all frames).
  - `removePiece(scene, id)` → void (removes piece and its positions from all frames).
  - `duplicateFrame(scene, index)` → new index (positions deep-copied, markup empty).
  - `deleteFrame(scene, index)` → boolean (false if only one frame).

- [ ] **Step 1: Append failing tests to `test/scene.test.js`**

```javascript
import { pieceById, addPlayer, addCone, removePiece, duplicateFrame, deleteFrame } from '../js/scene.js';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/scene.test.js`
Expected: FAIL — helpers not exported yet.

- [ ] **Step 3: Append helpers to `js/scene.js`**

```javascript

export function pieceById(scene, id) {
  return scene.pieces.find(p => p.id === id) || null;
}

function nextNumber(scene, team) {
  const used = new Set(
    scene.pieces.filter(p => p.kind === 'player' && p.team === team).map(p => p.number)
  );
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

export function addPlayer(scene, team, x, y) {
  const number = nextNumber(scene, team);
  const id = `${team}${number}`;
  scene.pieces.push({ id, kind: 'player', team, number });
  for (const f of scene.frames) f.positions[id] = { x: Math.round(x), y: Math.round(y) };
  return id;
}

export function addCone(scene, x, y) {
  const nums = scene.pieces
    .filter(p => p.kind === 'cone')
    .map(p => Number(p.id.split('-')[1]) || 0);
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  const id = `cone-${n}`;
  scene.pieces.push({ id, kind: 'cone' });
  for (const f of scene.frames) f.positions[id] = { x: Math.round(x), y: Math.round(y) };
  return id;
}

export function removePiece(scene, id) {
  scene.pieces = scene.pieces.filter(p => p.id !== id);
  for (const f of scene.frames) delete f.positions[id];
}

export function duplicateFrame(scene, index) {
  const src = scene.frames[index];
  const positions = {};
  for (const [id, p] of Object.entries(src.positions)) positions[id] = { x: p.x, y: p.y };
  scene.frames.splice(index + 1, 0, { positions, markup: [] });
  return index + 1;
}

export function deleteFrame(scene, index) {
  if (scene.frames.length <= 1) return false;
  scene.frames.splice(index, 1);
  return true;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/scene.test.js`
Expected: PASS — all Task 1 + Task 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add js/scene.js test/scene.test.js
git commit -m "feat: scene mutation helpers (add/remove pieces, duplicate/delete frame)"
```

---

## Task 3: steps.js — interpolation over frames + Play/scrub controller

**Files:**
- Rewrite: `js/steps.js`
- Rewrite: `test/steps.test.js`

**Interfaces:**
- Consumes: frame shape `{positions:{[id]:{x,y}}, markup:[]}`.
- Produces:
  - `ease(t)` smoothstep.
  - `interpolateFrames(a, b, t)` → positions map `{[id]:{x,y}}` blended by raw `t`.
  - `activeMarkupIndex(pos)` → integer frame index (round at integers, else ceil).
  - `createStepController({ getScene, applyPositions, onDone })` → `{ play, scrubTo }` (browser). `onDone(finalIndex)` is called when playback finishes so the app can settle onto the last frame.

- [ ] **Step 1: Rewrite `test/steps.test.js`** (replace entire file)

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/steps.test.js`
Expected: FAIL — new exports absent.

- [ ] **Step 3: Rewrite `js/steps.js`** (replace entire file)

```javascript
// steps.js — PURE interpolation (top) + browser Play/scrub controller (bottom).

export function ease(t) {
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) { return a + (b - a) * t; }

// Returns a positions map { [id]: {x,y} } blended from frame a to frame b by raw t.
export function interpolateFrames(a, b, t) {
  const out = {};
  for (const id of Object.keys(a.positions)) {
    const pa = a.positions[id];
    const pb = (b.positions && b.positions[id]) || pa; // missing target -> hold
    out[id] = { x: lerp(pa.x, pb.x, t), y: lerp(pa.y, pb.y, t) };
  }
  return out;
}

export function activeMarkupIndex(pos) {
  const r = Math.round(pos);
  if (Math.abs(pos - r) < 1e-6) return r;
  return Math.ceil(pos);
}

// ---- Browser Play/scrub controller (requestAnimationFrame; no import-time DOM) ----
// applyPositions(positionsMap, scrubPos): render pieces at positionsMap and update
// active markup + scrub UI for scrubPos.
export function createStepController({ getScene, applyPositions, onDone }) {
  const SEGMENT_MS = 800;
  let playing = false;

  function scrubTo(pos) {
    const frames = getScene().frames;
    if (frames.length === 0) return;
    if (frames.length === 1) { applyPositions(interpolateFrames(frames[0], frames[0], 0), 0); return; }
    const clamped = Math.max(0, Math.min(frames.length - 1, pos));
    const seg = Math.min(Math.floor(clamped), frames.length - 2);
    const t = clamped - seg;
    applyPositions(interpolateFrames(frames[seg], frames[seg + 1], t), clamped);
  }

  function play() {
    const frames = getScene().frames;
    if (playing || frames.length < 2) return;
    playing = true;
    let seg = 0;
    let start = null;
    function frame(ts) {
      if (!playing) return;
      if (start == null) start = ts;
      const raw = Math.min(1, (ts - start) / SEGMENT_MS);
      applyPositions(interpolateFrames(frames[seg], frames[seg + 1], ease(raw)), seg + raw);
      if (raw < 1) {
        requestAnimationFrame(frame);
      } else if (seg < frames.length - 2) {
        seg += 1; start = null; requestAnimationFrame(frame);
      } else {
        playing = false;
        if (onDone) onDone(frames.length - 1);
      }
    }
    requestAnimationFrame(frame);
  }

  return { play, scrubTo };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/steps.test.js` then `node --check js/steps.js`
Expected: PASS — all tests passing; steps.js parses.

- [ ] **Step 5: Commit**

```bash
git add js/steps.js test/steps.test.js
git commit -m "feat: frame interpolation, active-markup rule, and frame Play controller"
```

---

## Task 4: storage.js — serialize/deserialize the frames shape

**Files:**
- Rewrite: `js/storage.js`
- Rewrite: `test/storage.test.js`

**Interfaces:**
- Consumes: scene shape; `createScene` from `scene.js` (tests only).
- Produces: `serialize(scene)`, `deserialize(str)` (validates + rejects legacy), and browser
  `saveNamed`/`listSaved`/`loadNamed`/`deleteNamed`/`exportScene`/`importSceneFile` (unchanged behavior, new shape).

- [ ] **Step 1: Rewrite `test/storage.test.js`** (replace entire file)

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/storage.test.js`
Expected: FAIL — new shape/validation not present.

- [ ] **Step 3: Rewrite `js/storage.js`** (replace entire file)

```javascript
// storage.js — PURE serialize/deserialize (top), browser persistence (bottom).
const KEY_PREFIX = 'goalpad:scene:';
const VALID_PRESETS = new Set(['11v11', '9v9', '7v7', 'custom']);
const VALID_HALF = new Set(['full', 'left', 'right']);

export function serialize(scene) {
  return JSON.stringify(scene);
}

export function deserialize(str) {
  const raw = JSON.parse(str); // throws on invalid JSON
  if (!raw || typeof raw !== 'object') throw new Error('Invalid scene');
  if (!raw.field || !VALID_PRESETS.has(raw.field.preset)) {
    throw new Error('Invalid scene: missing or unknown field preset');
  }
  if (!Array.isArray(raw.pieces) || !Array.isArray(raw.frames) || raw.frames.length < 1) {
    throw new Error('Invalid or legacy scene: expected pieces[] and frames[]');
  }
  for (const f of raw.frames) {
    if (!f || typeof f.positions !== 'object' || f.positions === null || !Array.isArray(f.markup)) {
      throw new Error('Invalid frame');
    }
  }
  return {
    name: raw.name || 'Untitled',
    field: {
      preset: raw.field.preset,
      half: VALID_HALF.has(raw.field.half) ? raw.field.half : 'full',
    },
    pieces: raw.pieces,
    frames: raw.frames,
  };
}

// ---- Browser-only below ----

export function saveNamed(name, scene) {
  localStorage.setItem(KEY_PREFIX + name, serialize({ ...scene, name }));
}

export function listSaved() {
  const names = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(KEY_PREFIX)) names.push(key.slice(KEY_PREFIX.length));
  }
  return names.sort();
}

export function loadNamed(name) {
  const str = localStorage.getItem(KEY_PREFIX + name);
  return str ? deserialize(str) : null;
}

export function deleteNamed(name) {
  localStorage.removeItem(KEY_PREFIX + name);
}

export function exportScene(scene) {
  const blob = new Blob([serialize(scene)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(scene.name || 'scene').replace(/[^\w.-]+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importSceneFile(file) {
  return file.text().then(deserialize);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/storage.test.js` then `node --test` (full suite) then `node --check js/storage.js`
Expected: PASS — storage tests pass; full suite (scene + steps + storage) green; storage.js parses.

- [ ] **Step 5: Commit**

```bash
git add js/storage.js test/storage.test.js
git commit -m "feat: persistence for frames scene with validation and legacy rejection"
```

---

## Task 5: field.js — full / left / right rendering

**Files:**
- Rewrite: `js/field.js`

**Interfaces:**
- Consumes: `fieldViewBox(field)` from `scene.js`.
- Produces: `renderField(svg, layerEl, field)` — sets viewBox and draws markings for `field.half`.

- [ ] **Step 1: Rewrite `js/field.js`** (replace entire file)

```javascript
// field.js — DOM: pitch markings for full / left / right into a <g> layer.
import { fieldViewBox } from './scene.js';

const SVGNS = 'http://www.w3.org/2000/svg';

function el(name, attrs) {
  const node = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export function renderField(svg, layerEl, field) {
  const { w, h } = fieldViewBox(field);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  layerEl.replaceChildren();

  const g = el('g', { stroke: 'rgba(255,255,255,0.85)', 'stroke-width': '2', fill: 'none' });
  g.appendChild(el('rect', { x: 6, y: 6, width: w - 12, height: h - 12 }));

  const centreR = Math.min(w, h) * 0.09;
  const dot = (cx, cy) => el('circle', { cx, cy, r: 3, fill: 'rgba(255,255,255,0.85)', stroke: 'none' });

  // Penalty/goal box helper for a given side ('left' | 'right').
  const boxDepth = Math.min(w * 0.16, 165);
  const penH = Math.min(h * 0.6, 403);
  const goalH = Math.min(h * 0.3, 183);
  const goalDepth = Math.min(w * 0.05, 55);
  const drawGoal = (side) => {
    if (w <= 130) return; // too small to bother
    if (side === 'left') {
      g.appendChild(el('rect', { x: 6, y: (h - penH) / 2, width: boxDepth, height: penH }));
      g.appendChild(el('rect', { x: 6, y: (h - goalH) / 2, width: goalDepth, height: goalH }));
    } else {
      g.appendChild(el('rect', { x: w - 6 - boxDepth, y: (h - penH) / 2, width: boxDepth, height: penH }));
      g.appendChild(el('rect', { x: w - 6 - goalDepth, y: (h - goalH) / 2, width: goalDepth, height: goalH }));
    }
  };

  if (field.half === 'full') {
    g.appendChild(el('line', { x1: w / 2, y1: 6, x2: w / 2, y2: h - 6 }));
    g.appendChild(el('circle', { cx: w / 2, cy: h / 2, r: centreR }));
    g.appendChild(dot(w / 2, h / 2));
    drawGoal('left');
    drawGoal('right');
  } else if (field.half === 'left') {
    // Left half: left goal; halfway line at the right edge; centre circle half-visible there.
    g.appendChild(el('line', { x1: w - 6, y1: 6, x2: w - 6, y2: h - 6 }));
    g.appendChild(el('circle', { cx: w - 6, cy: h / 2, r: centreR }));
    g.appendChild(dot(w - 6, h / 2));
    drawGoal('left');
  } else { // 'right'
    g.appendChild(el('line', { x1: 6, y1: 6, x2: 6, y2: h - 6 }));
    g.appendChild(el('circle', { cx: 6, cy: h / 2, r: centreR }));
    g.appendChild(dot(6, h / 2));
    drawGoal('right');
  }

  layerEl.appendChild(g);
}
```

- [ ] **Step 2: Verify it parses**

Run: `node --check js/field.js`
Expected: no output (valid). (Browser visual verification is deferred to Task 9.)

- [ ] **Step 3: Commit**

```bash
git add js/field.js
git commit -m "feat: render pitch for full, left, and right half views"
```

---

## Task 6: tokens.js — render pieces from a frame; drag in select mode

**Files:**
- Rewrite: `js/tokens.js`

**Interfaces:**
- Consumes: scene pieces; a frame's `positions` map; team colors.
- Produces:
  - `clientToSvg(svg, clientX, clientY)` → `{x,y}`.
  - `renderTokens(svg, layerEl, scene, frame, getTool, onChange)` — draws every piece at `frame.positions`; drag (only when `getTool()==='select'`) updates `frame.positions[id]` and calls `onChange()`.
  - `setTokenPositions(layerEl, positionsMap)` — moves existing token groups to a positions map (used during Play/scrub without rebuilding).

- [ ] **Step 1: Rewrite `js/tokens.js`** (replace entire file)

```javascript
// tokens.js — DOM: render pieces (player/ball/cone) from a frame; drag in select mode.
const SVGNS = 'http://www.w3.org/2000/svg';
const COLORS = { A: '#2f6fed', B: '#e8552d' };
const R = 16; // player token radius (viewBox units)

export function clientToSvg(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: p.x, y: p.y };
}

function el(name, attrs) {
  const node = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function shapeFor(piece) {
  if (piece.kind === 'player') {
    const c = el('circle', { r: R, fill: COLORS[piece.team], stroke: 'white', 'stroke-width': '2' });
    const t = el('text', {
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: 'white', 'font-size': '16', 'font-weight': '700',
    });
    t.textContent = String(piece.number);
    return [c, t];
  }
  if (piece.kind === 'ball') {
    return [el('circle', { r: R * 0.55, fill: '#ffffff', stroke: '#1e232b', 'stroke-width': '2' })];
  }
  // cone
  return [el('path', { d: `M0,-12 L-10,8 L10,8 Z`, fill: '#ff9f1c', stroke: '#5a3a00', 'stroke-width': '1.5' })];
}

function makeDraggable(svg, groupEl, frame, id, getTool, onChange) {
  let dragging = false;
  groupEl.addEventListener('pointerdown', (e) => {
    if (getTool() !== 'select') return; // let non-select tools handle the event
    dragging = true;
    groupEl.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });
  groupEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    frame.positions[id] = { x: Math.round(x), y: Math.round(y) };
    groupEl.setAttribute('transform', `translate(${frame.positions[id].x}, ${frame.positions[id].y})`);
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    try { groupEl.releasePointerCapture(e.pointerId); } catch {}
    onChange && onChange();
  };
  groupEl.addEventListener('pointerup', end);
  groupEl.addEventListener('pointercancel', end);
}

export function renderTokens(svg, layerEl, scene, frame, getTool, onChange) {
  layerEl.replaceChildren();
  for (const piece of scene.pieces) {
    const pos = frame.positions[piece.id] || { x: 0, y: 0 };
    const g = el('g', { transform: `translate(${pos.x}, ${pos.y})` });
    g.dataset.tokenId = piece.id;
    if (piece.kind === 'player') g.style.cursor = 'grab';
    for (const s of shapeFor(piece)) g.appendChild(s);
    makeDraggable(svg, g, frame, piece.id, getTool, onChange);
    layerEl.appendChild(g);
  }
}

export function setTokenPositions(layerEl, positionsMap) {
  for (const g of layerEl.querySelectorAll('[data-token-id]')) {
    const p = positionsMap[g.dataset.tokenId];
    if (p) g.setAttribute('transform', `translate(${p.x}, ${p.y})`);
  }
}
```

- [ ] **Step 2: Verify it parses**

Run: `node --check js/tokens.js`
Expected: no output. (Browser verification deferred to Task 9.)

- [ ] **Step 3: Commit**

```bash
git add js/tokens.js
git commit -m "feat: render draggable pieces (player/ball/cone) from a frame"
```

---

## Task 7: tools.js — markup + add/delete via tools

**Files:**
- Rewrite: `js/tools.js`

**Interfaces:**
- Consumes: `clientToSvg` from `tokens.js`; `addPlayer`, `addCone`, `removePiece` from `scene.js`.
- Produces:
  - `renderMarkup(layerEl, frame)` — draws the active frame's markup.
  - `initTools(svg, markupLayer, { getScene, getFrame, getTool, getTeam, onSceneChange, onMarkupChange })` — pointer handlers for add-player, add-cone, draw markup, and delete.

- [ ] **Step 1: Rewrite `js/tools.js`** (replace entire file)

```javascript
// tools.js — DOM: markup rendering + tool input (add player/cone, draw markup, delete).
// Markup shapes (in frame.markup): {type:'arrow',x1,y1,x2,y2} {type:'pen',points:[{x,y}]}
//   {type:'text',x,y,text}
import { clientToSvg } from './tokens.js';
import { addPlayer, addCone, removePiece } from './scene.js';

const SVGNS = 'http://www.w3.org/2000/svg';

function el(name, attrs) {
  const node = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function ensureMarker(layerEl) {
  if (layerEl.querySelector('#arrowhead')) return;
  const defs = document.createElementNS(SVGNS, 'defs');
  const marker = el('marker', { id: 'arrowhead', markerWidth: '8', markerHeight: '8', refX: '6', refY: '3', orient: 'auto', markerUnits: 'strokeWidth' });
  marker.appendChild(el('path', { d: 'M0,0 L6,3 L0,6 Z', fill: '#ffe14d' }));
  defs.appendChild(marker);
  layerEl.appendChild(defs);
}

function drawOne(layerEl, a, index) {
  let node;
  if (a.type === 'arrow') {
    node = el('line', { x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, stroke: '#ffe14d', 'stroke-width': '4', 'stroke-linecap': 'round', 'marker-end': 'url(#arrowhead)' });
  } else if (a.type === 'pen') {
    const d = a.points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
    node = el('path', { d, fill: 'none', stroke: '#ffe14d', 'stroke-width': '4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  } else if (a.type === 'text') {
    node = el('text', { x: a.x, y: a.y, fill: '#ffffff', 'font-size': '20', 'font-weight': '700', 'text-anchor': 'middle' });
    node.textContent = a.text;
  }
  if (node) { node.dataset.annIndex = index; layerEl.appendChild(node); }
}

export function renderMarkup(layerEl, frame) {
  layerEl.replaceChildren();
  ensureMarker(layerEl);
  frame.markup.forEach((a, i) => drawOne(layerEl, a, i));
}

export function initTools(svg, markupLayer, { getScene, getFrame, getTool, getTeam, onSceneChange, onMarkupChange }) {
  let draft = null;

  svg.addEventListener('pointerdown', (e) => {
    const tool = getTool();
    if (tool === 'select') return;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);

    if (tool === 'add') {
      addPlayer(getScene(), getTeam(), x, y);
      onSceneChange();
      return;
    }
    if (tool === 'cone') {
      addCone(getScene(), x, y);
      onSceneChange();
      return;
    }
    if (tool === 'delete') {
      const t = e.target;
      const tokenG = t.closest && t.closest('[data-token-id]');
      const annEl = t.closest && t.closest('[data-ann-index]');
      if (tokenG) { removePiece(getScene(), tokenG.dataset.tokenId); onSceneChange(); }
      else if (annEl) { getFrame().markup.splice(Number(annEl.dataset.annIndex), 1); onMarkupChange(); }
      return;
    }
    // markup tools capture the pointer on the svg
    svg.setPointerCapture(e.pointerId);
    if (tool === 'arrow') draft = { type: 'arrow', x1: x, y1: y, x2: x, y2: y };
    else if (tool === 'pen') draft = { type: 'pen', points: [{ x: Math.round(x), y: Math.round(y) }] };
    else if (tool === 'text') {
      const text = window.prompt('Label text:');
      if (text) { getFrame().markup.push({ type: 'text', x: Math.round(x), y: Math.round(y), text }); onMarkupChange(); }
    }
  });

  svg.addEventListener('pointermove', (e) => {
    if (!draft) return;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    if (draft.type === 'arrow') { draft.x2 = x; draft.y2 = y; }
    else if (draft.type === 'pen') draft.points.push({ x: Math.round(x), y: Math.round(y) });
    // live preview: current frame markup + the draft
    renderMarkup(markupLayer, { markup: [...getFrame().markup, draft] });
  });

  const finish = (e) => {
    if (!draft) return;
    try { svg.releasePointerCapture(e.pointerId); } catch {}
    if (draft.type === 'arrow') {
      if (Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) > 5) {
        getFrame().markup.push({ type: 'arrow', x1: Math.round(draft.x1), y1: Math.round(draft.y1), x2: Math.round(draft.x2), y2: Math.round(draft.y2) });
      }
    } else if (draft.type === 'pen' && draft.points.length > 1) {
      getFrame().markup.push(draft);
    }
    draft = null;
    onMarkupChange();
  };
  svg.addEventListener('pointerup', finish);
  svg.addEventListener('pointercancel', finish);
}
```

- [ ] **Step 2: Verify it parses**

Run: `node --check js/tools.js`
Expected: no output. (Browser verification deferred to Task 9.)

- [ ] **Step 3: Commit**

```bash
git add js/tools.js
git commit -m "feat: tools for add player/cone, per-frame markup, and delete"
```

---

## Task 8: index.html + styles.css — toolbar, steps bar, and setup controls

**Files:**
- Modify: `index.html`
- Modify: `styles.css`

**Interfaces:**
- Produces: the DOM element ids/classes that Task 9 wires: `tool` buttons incl. `data-tool="add"`, team toggle `#team-toggle` with `data-team` buttons, `#btn-del-step`, and Setup `#setup-half`, `#setup-teamA/B`.

- [ ] **Step 1: Replace the toolbar `<nav id="toolbar">` block in `index.html`** with:

```html
  <nav id="toolbar">
    <button class="tool" data-tool="select" aria-pressed="true">👆 Select</button>
    <button class="tool" data-tool="add">➕ Player</button>
    <span id="team-toggle">
      <button class="team" data-team="A" aria-pressed="true">Blue</button>
      <button class="team" data-team="B">Orange</button>
    </span>
    <button class="tool" data-tool="cone">🔺 Cone</button>
    <button class="tool" data-tool="arrow">↗ Arrow</button>
    <button class="tool" data-tool="pen">✎ Pen</button>
    <button class="tool" data-tool="text">T Text</button>
    <button class="tool" data-tool="delete">🗑 Delete</button>
  </nav>
```

- [ ] **Step 2: Replace the steps-bar `<footer id="stepsbar">` block in `index.html`** with:

```html
  <footer id="stepsbar">
    <button id="btn-step-prev" type="button">◀</button>
    <input id="scrub" type="range" min="0" max="0" step="0.01" value="0">
    <button id="btn-step-next" type="button">▶</button>
    <span id="step-label">Step 1 / 1</span>
    <button id="btn-add-step" type="button">+ Frame</button>
    <button id="btn-del-step" type="button">🗑 Frame</button>
    <button id="btn-play" type="button">▶ Play</button>
  </footer>
```

- [ ] **Step 3: Replace the Setup panel body in `index.html`** — replace the three form rows (the `setup-preset` label, the two team-count labels, and the half-pitch checkbox label) inside `#panel-setup .panel-card` with:

```html
      <label>Field / game size
        <select id="setup-preset">
          <option value="11v11">11 v 11</option>
          <option value="9v9">9 v 9</option>
          <option value="7v7">7 v 7</option>
          <option value="custom">Custom (small-sided grid)</option>
        </select>
      </label>
      <label>Pitch
        <select id="setup-half">
          <option value="full">Full</option>
          <option value="left">Left half</option>
          <option value="right">Right half</option>
        </select>
      </label>
      <label>Team A (blue) players <input id="setup-teamA" type="number" min="0" max="11" value="11"></label>
      <label>Team B (orange) players <input id="setup-teamB" type="number" min="0" max="11" value="11"></label>
      <p class="panel-note">Set both counts to 0 for an empty pitch. Changing the setup rebuilds the board.</p>
```

(Delete the old `<label><input id="setup-half" type="checkbox"> Half pitch</label>` line — it is replaced by the Pitch select above.)

- [ ] **Step 4: Append styles to `styles.css`**

```css
#team-toggle { display: inline-flex; gap: 4px; margin: 0 4px; }
.team { font-size: 14px; padding: 8px 10px; min-height: 44px; border: none; border-radius: 8px; background: #3b4250; color: #f2f4f7; opacity: 0.55; }
.team[data-team="A"][aria-pressed="true"] { background: #2f6fed; opacity: 1; }
.team[data-team="B"][aria-pressed="true"] { background: #e8552d; opacity: 1; }
#btn-del-step:disabled { opacity: 0.4; }
```

- [ ] **Step 5: Verify structure**

Open the file and confirm: the toolbar has an `add` tool and a `#team-toggle`; the steps bar has `#btn-del-step`; the Setup panel has `#setup-half` as a `<select>` and number inputs with `min="0"`. (No JS wired yet — that is Task 9.)

- [ ] **Step 6: Commit**

```bash
git add index.html styles.css
git commit -m "feat: toolbar add-player + team toggle, delete-frame button, setup pitch/roster controls"
```

---

## Task 9: app.js — full rewire to the frames model + browser verification

**Files:**
- Rewrite: `js/app.js`

**Interfaces:**
- Consumes: everything above.
- Produces: the running app (browser entry).

- [ ] **Step 1: Rewrite `js/app.js`** (replace entire file)

```javascript
// app.js — entry point. Owns the scene and the current frame index; wires all modules.
import { createScene, duplicateFrame, deleteFrame } from './scene.js';
import { renderField } from './field.js';
import { renderTokens, setTokenPositions } from './tokens.js';
import { renderMarkup, initTools } from './tools.js';
import { createStepController, activeMarkupIndex } from './steps.js';
import { saveNamed, listSaved, loadNamed, deleteNamed, exportScene, importSceneFile } from './storage.js';

const board = document.getElementById('board');
const layerField = document.getElementById('layer-field');
const layerAnnotations = document.getElementById('layer-annotations');
const layerTokens = document.getElementById('layer-tokens');

let scene = createScene({ preset: '11v11', teamA: 11, teamB: 11, half: 'full' });
let index = 0;               // current frame index
let currentTool = 'select';
let currentTeam = 'A';

const frame = () => scene.frames[index];

// Full render of the current frame (field + tokens + its markup).
function render() {
  renderField(board, layerField, scene.field);
  renderTokens(board, layerTokens, scene, frame(), () => currentTool, () => {});
  renderMarkup(layerAnnotations, frame());
  refreshScrubRange();
}

// ---- Tools (bound once; read live state via accessors) ----
initTools(board, layerAnnotations, {
  getScene: () => scene,
  getFrame: () => frame(),
  getTool: () => currentTool,
  getTeam: () => currentTeam,
  onSceneChange: () => { renderTokens(board, layerTokens, scene, frame(), () => currentTool, () => {}); },
  onMarkupChange: () => { renderMarkup(layerAnnotations, frame()); },
});

// Tool selection.
document.querySelectorAll('.tool').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentTool = btn.dataset.tool;
    document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  });
});
// Team toggle.
document.querySelectorAll('.team').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentTeam = btn.dataset.team;
    document.querySelectorAll('.team').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  });
});

// ---- Steps / playback ----
const scrub = document.getElementById('scrub');
const stepLabel = document.getElementById('step-label');
const btnDel = document.getElementById('btn-del-step');

function updateStepLabel(pos) {
  stepLabel.textContent = `Step ${Math.round(pos) + 1} / ${scene.frames.length}`;
}
function refreshScrubRange() {
  scrub.max = String(Math.max(0, scene.frames.length - 1));
  scrub.value = String(index);
  updateStepLabel(index);
  btnDel.disabled = scene.frames.length <= 1;
}

// Called by the controller during play/scrub: move tokens + swap active-frame markup.
function applyPositions(positionsMap, pos) {
  setTokenPositions(layerTokens, positionsMap);
  const mi = Math.max(0, Math.min(scene.frames.length - 1, activeMarkupIndex(pos)));
  renderMarkup(layerAnnotations, scene.frames[mi]);
  scrub.value = String(pos);
  updateStepLabel(pos);
}

// Settle onto an integer frame: make it current and fully re-render (so drag edits it).
function settleTo(i) {
  index = Math.max(0, Math.min(scene.frames.length - 1, Math.round(i)));
  render();
}

const steps = createStepController({ getScene: () => scene, applyPositions, onDone: (i) => settleTo(i) });

document.getElementById('btn-add-step').addEventListener('click', () => {
  index = duplicateFrame(scene, index);
  render();
});
btnDel.addEventListener('click', () => {
  if (deleteFrame(scene, index)) { index = Math.min(index, scene.frames.length - 1); render(); }
});
document.getElementById('btn-play').addEventListener('click', () => steps.play());
scrub.addEventListener('input', () => steps.scrubTo(Number(scrub.value)));
scrub.addEventListener('change', () => settleTo(Number(scrub.value)));
document.getElementById('btn-step-prev').addEventListener('click', () => { settleTo(index - 1); });
document.getElementById('btn-step-next').addEventListener('click', () => { settleTo(index + 1); });

// ---- Setup panel ----
const panelSetup = document.getElementById('panel-setup');
const elPreset = document.getElementById('setup-preset');
const elHalf = document.getElementById('setup-half');
const elTeamA = document.getElementById('setup-teamA');
const elTeamB = document.getElementById('setup-teamB');
const PRESET_COUNTS = { '11v11': 11, '9v9': 9, '7v7': 7 };

function openSetup() {
  elPreset.value = scene.field.preset;
  elHalf.value = scene.field.half;
  elTeamA.value = elTeamA.value || '11';
  elTeamB.value = elTeamB.value || '11';
  const custom = elPreset.value === 'custom';
  elTeamA.disabled = elTeamB.disabled = !custom;
  panelSetup.hidden = false;
}
elPreset.addEventListener('change', () => {
  const custom = elPreset.value === 'custom';
  elTeamA.disabled = elTeamB.disabled = !custom;
  if (!custom) { elTeamA.value = PRESET_COUNTS[elPreset.value]; elTeamB.value = PRESET_COUNTS[elPreset.value]; }
});
document.getElementById('btn-setup').addEventListener('click', openSetup);
document.getElementById('setup-cancel').addEventListener('click', () => { panelSetup.hidden = true; });
document.getElementById('setup-apply').addEventListener('click', () => {
  scene = createScene({
    preset: elPreset.value,
    half: elHalf.value,
    teamA: Math.max(0, Math.min(11, Number(elTeamA.value) || 0)),
    teamB: Math.max(0, Math.min(11, Number(elTeamB.value) || 0)),
    name: scene.name,
  });
  index = 0;
  panelSetup.hidden = true;
  render();
});

// ---- Save / Load ----
const panelSaveLoad = document.getElementById('panel-saveload');
const savedList = document.getElementById('saved-list');
const saveName = document.getElementById('save-name');

function loadScene(next) { scene = next; index = 0; render(); }

function refreshSavedList() {
  savedList.replaceChildren();
  for (const name of listSaved()) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = name;
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', () => {
      let s = null;
      try { s = loadNamed(name); } catch { window.alert('That saved play is from an older version and cannot be loaded.'); return; }
      if (s) { loadScene(s); panelSaveLoad.hidden = true; }
    });
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => { deleteNamed(name); refreshSavedList(); });
    const actions = document.createElement('span');
    actions.append(loadBtn, delBtn);
    li.append(label, actions);
    savedList.appendChild(li);
  }
}
document.getElementById('btn-saveload').addEventListener('click', () => {
  saveName.value = scene.name === 'Untitled' ? '' : scene.name;
  refreshSavedList();
  panelSaveLoad.hidden = false;
});
document.getElementById('saveload-close').addEventListener('click', () => { panelSaveLoad.hidden = true; });
document.getElementById('save-current').addEventListener('click', () => {
  const name = (saveName.value || 'Untitled').trim();
  scene.name = name;
  saveNamed(name, scene);
  refreshSavedList();
});
document.getElementById('export-current').addEventListener('click', () => {
  const name = (saveName.value || scene.name || 'scene').trim();
  exportScene({ ...scene, name });
});
document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  importSceneFile(file).then((s) => { loadScene(s); panelSaveLoad.hidden = true; })
    .catch(() => window.alert('Could not read that file.'));
  e.target.value = '';
});

render();
console.log('[goalpad] loaded');
```

- [ ] **Step 2: Verify all files parse and the suite passes**

Run: `node --check js/app.js` and `node --test`
Expected: app.js parses; full suite green (scene + steps + storage).

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: rewire app to frames model — add/remove players, delete frame, per-frame markup, half pitch"
```

- [ ] **Step 4: Browser verification (controller runs this)**

Serve (`py -m http.server 8000`) and drive `http://localhost:8000`. Confirm:
1. **Renders:** 11v11 full pitch, 22 players + ball; console has no app errors.
2. **Add players:** select **➕ Player**, toggle **Orange**, tap empty spots → orange players appear with sequential numbers. Toggle **Blue**, tap → blue players. Delete tool removes a tapped player.
3. **Empty start:** Setup → Team A 0, Team B 0, Apply → only the ball; tap to build a 2v1.
4. **Half pitch:** Setup → **Left half** → left goal shown, halfway line at right edge; **Right half** mirrors.
5. **Frames + markup:** add a frame, move players, draw an arrow on frame 2; scrub to frame 1 → arrow gone; scrub to frame 2 → arrow shows. Play → arrow appears during the run to frame 2. Delete frame → removed; button disabled at the last frame.
6. **Cones** persist across frames; **arrows/text** do not.
7. **Save/Load/Export/Import** round-trips a multi-frame scene; a malformed import is rejected with the alert.

Fix any defect found before marking the task complete.

---

## Self-Review Notes

- **Spec coverage:** frames model (Tasks 1–3), add/remove players (Task 2 + 7 + 9), delete frame (Task 2 + 9), step-tied markup with target-frame-during-motion rule (Tasks 3, 7, 9), half full/left/right (Tasks 1, 5, 9), empty start via 0/0 counts (Tasks 1, 8, 9), persistence + legacy rejection (Task 4). All spec sections map to tasks.
- **Type consistency:** frame shape `{positions:{[id]:{x,y}}, markup:[]}` and piece shape `{id,kind,team?,number?}` are identical across scene/steps/storage/tokens/tools/app. `interpolateFrames` returns a positions map (not a frame); `applyPositions(positionsMap, pos)` consumes exactly that. `activeMarkupIndex(pos)` used identically in steps tests and app. Tool accessor object keys (`getScene/getFrame/getTool/getTeam/onSceneChange/onMarkupChange`) match between `initTools` (Task 7) and its call site (Task 9).
- **Known simplification:** default rosters no longer place a dedicated goalkeeper (players are spread evenly and numbered 1..N); the user positions the keeper by dragging. This keeps `defaultPositions` simple and is consistent with free add/remove. Group B (visuals) and Group C (preset tactics) build on this.
