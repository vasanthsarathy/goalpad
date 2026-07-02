# goalpad — Soccer Tactics Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, iPad-first soccer tactics board — drag players/ball on a pitch, draw annotations, animate plays as steps, and save/export setups — hostable on GitHub Pages.

**Architecture:** Vanilla HTML/CSS/JS ES modules rendering into a single SVG surface. Pure data/logic modules (`scene.js`, `steps.js`, `storage.js`) are unit-tested with Node's built-in test runner; DOM/interaction modules (`field.js`, `tokens.js`, `tools.js`, `app.js`) are verified in the browser. No build step, no third-party dependencies.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, SVG, Pointer Events, `localStorage`, `node:test` (dev-only, built into Node).

## Global Constraints

- No build step and no third-party runtime dependencies — plain files served statically.
- All rendering happens inside one `<svg>` element.
- Interaction uses **Pointer Events** (`pointerdown`/`pointermove`/`pointerup`) so touch and mouse behave identically.
- Player/ball/annotation coordinates are stored in the field's **SVG viewBox units** (1 unit = 0.1 m); the SVG scales to the screen via viewBox + `preserveAspectRatio`.
- The whole scene is one serializable object (see Task 2); it is the unit saved to `localStorage` and exported as `.json`.
- Annotations stay **fixed** on screen during playback in v1 (no per-step annotations).
- ES module imports must use explicit `./name.js` paths; pure modules must not touch `document`/`window`/`localStorage` at import time (only inside functions) so Node can import them.
- Team A color `#2f6fed` (blue), Team B color `#e8552d` (orange), ball `#ffffff` with dark outline.

---

## File Structure

```
goalpad/
  index.html            # page shell: top bar, svg, tool bar, steps bar, panels
  styles.css            # full-height flex layout, touch-friendly controls
  package.json          # { "type": "module" } — enables node:test on .js modules
  js/
    scene.js            # PURE: presets, default rosters, createScene, applyStep helpers
    steps.js            # PURE: captureStep, ease, interpolateSteps  + browser play/scrub
    storage.js          # PURE: serialize/deserialize  + browser localStorage/file I/O
    field.js            # DOM: draw pitch markings from a field config
    tokens.js           # DOM: render + drag players and ball
    tools.js            # DOM: annotation tools (arrow, pen, cone, text, delete)
    app.js              # DOM: entry point; owns current scene, wires everything
  test/
    scene.test.js       # unit tests for scene.js
    steps.test.js       # unit tests for steps.js
    storage.test.js     # unit tests for storage.js
```

---

## Task 1: Project scaffold + empty pitch surface

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `styles.css`
- Create: `js/app.js`
- Create: `test/smoke.test.js`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a running static page with a full-screen `<svg id="board">`; a working `node --test` setup.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "goalpad",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Write a smoke test at `test/smoke.test.js`**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('node test runner works', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 3: Run the test to confirm the runner works**

Run: `node --test`
Expected: PASS — 1 test passing.

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>goalpad</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header id="topbar">
    <span class="brand">▦ goalpad</span>
    <div class="top-actions">
      <button id="btn-setup" type="button">Setup</button>
      <button id="btn-saveload" type="button">Save / Load</button>
    </div>
  </header>

  <main id="stage">
    <svg id="board" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      <g id="layer-field"></g>
      <g id="layer-annotations"></g>
      <g id="layer-tokens"></g>
    </svg>
  </main>

  <nav id="toolbar">
    <button class="tool" data-tool="select" aria-pressed="true">👆 Select</button>
    <button class="tool" data-tool="arrow">↗ Arrow</button>
    <button class="tool" data-tool="pen">✎ Pen</button>
    <button class="tool" data-tool="cone">▲ Cone</button>
    <button class="tool" data-tool="text">T Text</button>
    <button class="tool" data-tool="delete">🗑 Delete</button>
  </nav>

  <footer id="stepsbar">
    <button id="btn-step-prev" type="button">◀</button>
    <input id="scrub" type="range" min="0" max="0" step="0.01" value="0">
    <button id="btn-step-next" type="button">▶</button>
    <span id="step-label">Step 0 / 0</span>
    <button id="btn-add-step" type="button">+ Add step</button>
    <button id="btn-play" type="button">▶ Play</button>
  </footer>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create `styles.css`**

```css
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  display: flex; flex-direction: column; height: 100vh;
  font-family: system-ui, -apple-system, sans-serif;
  overflow: hidden; touch-action: none;
  -webkit-user-select: none; user-select: none;
  background: #1e232b; color: #f2f4f7;
}
#topbar, #toolbar, #stepsbar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; background: #2a303a; flex: 0 0 auto;
}
#topbar { justify-content: space-between; }
.brand { font-weight: 700; font-size: 18px; }
.top-actions { display: flex; gap: 8px; }
#stage { flex: 1 1 auto; min-height: 0; display: flex; }
#board { width: 100%; height: 100%; display: block; background: #2f7a3f; }
#toolbar { justify-content: center; flex-wrap: wrap; }
#stepsbar { gap: 10px; }
#scrub { flex: 1 1 auto; }
button, .tool {
  font-size: 16px; padding: 10px 14px; min-height: 44px;
  border: none; border-radius: 8px; background: #3b4250; color: #f2f4f7;
}
.tool[aria-pressed="true"] { background: #2f6fed; }
button:active { filter: brightness(1.2); }
#step-label { min-width: 96px; text-align: center; font-variant-numeric: tabular-nums; }
</style>
```

Note: remove the stray trailing `</style>` — CSS files have no tags. Final line of the file is `#step-label { ... }`.

- [ ] **Step 6: Create `js/app.js` (minimal entry)**

```javascript
// app.js — entry point. Owns the current scene and wires modules together.
// Task 1: just size the board's viewBox so the empty pitch fills the stage.

const board = document.getElementById('board');

// Temporary viewBox until the field module sets it (full pitch, landscape).
board.setAttribute('viewBox', '0 0 1050 680');

console.log('[goalpad] loaded');
```

- [ ] **Step 7: Verify in the browser**

Run a static server (ES modules require http, not `file://`):
`python -m http.server 8000` (or `npx --yes serve -l 8000`), then open `http://localhost:8000`.
Expected: a green rectangle fills the area between the top bar and the tool/steps bars; the tool bar shows the six tools; the steps bar shows the scrubber and buttons. Console logs `[goalpad] loaded`.

- [ ] **Step 8: Commit**

```bash
git add package.json index.html styles.css js/app.js test/smoke.test.js
git commit -m "feat: scaffold goalpad shell with empty pitch and node test runner"
```

---

## Task 2: Scene model (presets, default rosters, createScene)

**Files:**
- Create: `js/scene.js`
- Create: `test/scene.test.js`

**Interfaces:**
- Consumes: Global Constraints (coordinate units, team counts).
- Produces:
  - `FIELD_DIMS` — map of preset → `{ length_m, width_m }`.
  - `fieldViewBox(field)` → `{ w, h }` in viewBox units (accounts for `half`).
  - `defaultPlayers(field)` → `[{ id, team, number, x, y }]`.
  - `createScene(opts)` → full scene object `{ name, field, players, ball, annotations, steps }`.
  - `applyStep(scene, step)` → mutates `scene.players`/`scene.ball` coords from a step snapshot.

- [ ] **Step 1: Write failing tests at `test/scene.test.js`**

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/scene.test.js`
Expected: FAIL — cannot import from `../js/scene.js` (module not found).

- [ ] **Step 3: Implement `js/scene.js`**

```javascript
// scene.js — PURE model helpers. No DOM/window access anywhere in this file.

export const FIELD_DIMS = {
  '11v11': { length_m: 105, width_m: 68 },
  '9v9':   { length_m: 75,  width_m: 50 },
  '7v7':   { length_m: 55,  width_m: 37 },
  'custom':{ length_m: 40,  width_m: 30 }, // compact grid, good for 2v1 / 3v2
};

// Presets have a dedicated goalkeeper as player #1; custom grids do not.
const PRESETS_WITH_GK = new Set(['11v11', '9v9', '7v7']);

export function fieldViewBox(field) {
  const dims = FIELD_DIMS[field.preset] || FIELD_DIMS.custom;
  const length = field.half ? dims.length_m / 2 : dims.length_m;
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

function playersForTeam(team, count, field) {
  const { w, h } = fieldViewBox(field);
  const hasGK = PRESETS_WITH_GK.has(field.preset);
  const attacksRight = team === 'A';
  const halfMin = attacksRight ? 0 : w / 2;
  const halfMax = attacksRight ? w / 2 : w;
  const out = [];
  let outfield = count;
  if (hasGK && count >= 1) {
    const gx = attacksRight ? Math.round(w * 0.04) : Math.round(w * 0.96);
    out.push({ id: `${team}1`, team, number: 1, x: gx, y: Math.round(h / 2) });
    outfield = count - 1;
  }
  const margin = w * 0.06;
  const pts = spread(outfield, halfMin + margin, halfMax - margin, h * 0.1, h * 0.9);
  for (let i = 0; i < outfield; i++) {
    const number = (hasGK ? i + 2 : i + 1);
    out.push({ id: `${team}${number}`, team, number, x: pts[i].x, y: pts[i].y });
  }
  return out;
}

export function defaultPlayers(field) {
  return [
    ...playersForTeam('A', field.teamA, field),
    ...playersForTeam('B', field.teamB, field),
  ];
}

export function createScene(field, name = 'Untitled') {
  const { w, h } = fieldViewBox(field);
  return {
    name,
    field: { preset: field.preset, teamA: field.teamA, teamB: field.teamB, half: !!field.half },
    players: defaultPlayers(field),
    ball: { x: Math.round(w / 2), y: Math.round(h / 2) },
    annotations: [],
    steps: [],
  };
}

export function applyStep(scene, step) {
  const byId = new Map(step.players.map(p => [p.id, p]));
  for (const player of scene.players) {
    const snap = byId.get(player.id);
    if (snap) { player.x = snap.x; player.y = snap.y; }
  }
  if (step.ball) { scene.ball.x = step.ball.x; scene.ball.y = step.ball.y; }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/scene.test.js`
Expected: PASS — all 8 tests passing.

- [ ] **Step 5: Commit**

```bash
git add js/scene.js test/scene.test.js
git commit -m "feat: pure scene model with presets, rosters, and step application"
```

---

## Task 3: Field rendering

**Files:**
- Create: `js/field.js`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `fieldViewBox(field)` from `scene.js`.
- Produces: `renderField(svg, layerEl, field)` — sets the SVG viewBox and draws pitch markings into `layerEl`.

- [ ] **Step 1: Implement `js/field.js`**

```javascript
// field.js — DOM: draw pitch markings for a field config into a <g> layer.
import { fieldViewBox } from './scene.js';

const SVGNS = 'http://www.w3.org/2000/svg';

function line(x1, y1, x2, y2) {
  const el = document.createElementNS(SVGNS, 'line');
  el.setAttribute('x1', x1); el.setAttribute('y1', y1);
  el.setAttribute('x2', x2); el.setAttribute('y2', y2);
  return el;
}
function rect(x, y, w, h) {
  const el = document.createElementNS(SVGNS, 'rect');
  el.setAttribute('x', x); el.setAttribute('y', y);
  el.setAttribute('width', w); el.setAttribute('height', h);
  el.setAttribute('fill', 'none');
  return el;
}
function circle(cx, cy, r, fill = 'none') {
  const el = document.createElementNS(SVGNS, 'circle');
  el.setAttribute('cx', cx); el.setAttribute('cy', cy);
  el.setAttribute('r', r); el.setAttribute('fill', fill);
  return el;
}

export function renderField(svg, layerEl, field) {
  const { w, h } = fieldViewBox(field);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  layerEl.replaceChildren();

  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('stroke', 'rgba(255,255,255,0.85)');
  g.setAttribute('stroke-width', '2');
  g.setAttribute('fill', 'none');

  // Outer boundary.
  g.appendChild(rect(6, 6, w - 12, h - 12));
  // Halfway line + centre circle + spot.
  g.appendChild(line(w / 2, 6, w / 2, h - 6));
  g.appendChild(circle(w / 2, h / 2, Math.min(w, h) * 0.09));
  const spot = circle(w / 2, h / 2, 3, 'rgba(255,255,255,0.85)');
  g.appendChild(spot);

  // Penalty + goal boxes, scaled to field width; skipped on tiny custom grids.
  const boxDepth = Math.min(w * 0.16, 165);
  const penH = Math.min(h * 0.6, 403);
  const goalH = Math.min(h * 0.3, 183);
  const goalDepth = Math.min(w * 0.05, 55);
  if (w > 260) {
    // Left goal.
    g.appendChild(rect(6, (h - penH) / 2, boxDepth, penH));
    g.appendChild(rect(6, (h - goalH) / 2, goalDepth, goalH));
    // Right goal.
    g.appendChild(rect(w - 6 - boxDepth, (h - penH) / 2, boxDepth, penH));
    g.appendChild(rect(w - 6 - goalDepth, (h - goalH) / 2, goalDepth, goalH));
  }

  layerEl.appendChild(g);
}
```

- [ ] **Step 2: Wire it into `js/app.js`**

Replace the entire contents of `js/app.js` with:

```javascript
// app.js — entry point. Owns the current scene and wires modules together.
import { createScene } from './scene.js';
import { renderField } from './field.js';

const board = document.getElementById('board');
const layerField = document.getElementById('layer-field');

const scene = createScene({ preset: '11v11', teamA: 11, teamB: 11, half: false });

function render() {
  renderField(board, layerField, scene.field);
}

render();
console.log('[goalpad] loaded');
```

- [ ] **Step 3: Verify in the browser**

Restart the static server if needed and reload `http://localhost:8000`.
Expected: the green pitch now shows a white boundary, halfway line, centre circle + spot, and penalty/goal boxes at both ends. It scales to fill the stage and stays crisp.

- [ ] **Step 4: Commit**

```bash
git add js/field.js js/app.js
git commit -m "feat: render pitch markings sized to the field preset"
```

---

## Task 4: Players and ball tokens with drag

**Files:**
- Create: `js/tokens.js`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: the `scene` object; team colors from Global Constraints.
- Produces:
  - `clientToSvg(svg, clientX, clientY)` → `{ x, y }` in viewBox units.
  - `renderTokens(svg, layerEl, scene, onChange)` — draws players + ball and wires dragging; calls `onChange()` after a drag ends.

- [ ] **Step 1: Implement `js/tokens.js`**

```javascript
// tokens.js — DOM: render players + ball and make them draggable.
const SVGNS = 'http://www.w3.org/2000/svg';
const COLORS = { A: '#2f6fed', B: '#e8552d' };
const R = 16; // token radius in viewBox units

export function clientToSvg(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: p.x, y: p.y };
}

function makeDraggable(svg, groupEl, model, onChange) {
  let dragging = false;
  groupEl.addEventListener('pointerdown', (e) => {
    dragging = true;
    groupEl.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });
  groupEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    model.x = Math.round(x); model.y = Math.round(y);
    groupEl.setAttribute('transform', `translate(${model.x}, ${model.y})`);
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

function playerGroup(svg, player, onChange) {
  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('transform', `translate(${player.x}, ${player.y})`);
  g.style.cursor = 'grab';
  g.dataset.tokenId = player.id;

  const c = document.createElementNS(SVGNS, 'circle');
  c.setAttribute('r', R);
  c.setAttribute('fill', COLORS[player.team]);
  c.setAttribute('stroke', 'white');
  c.setAttribute('stroke-width', '2');

  const t = document.createElementNS(SVGNS, 'text');
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('dominant-baseline', 'central');
  t.setAttribute('fill', 'white');
  t.setAttribute('font-size', '16');
  t.setAttribute('font-weight', '700');
  t.textContent = String(player.number);

  g.append(c, t);
  makeDraggable(svg, g, player, onChange);
  return g;
}

function ballGroup(svg, ball, onChange) {
  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('transform', `translate(${ball.x}, ${ball.y})`);
  g.dataset.tokenId = 'ball';
  const c = document.createElementNS(SVGNS, 'circle');
  c.setAttribute('r', R * 0.55);
  c.setAttribute('fill', '#ffffff');
  c.setAttribute('stroke', '#1e232b');
  c.setAttribute('stroke-width', '2');
  g.append(c);
  makeDraggable(svg, g, ball, onChange);
  return g;
}

export function renderTokens(svg, layerEl, scene, onChange) {
  layerEl.replaceChildren();
  for (const player of scene.players) {
    layerEl.appendChild(playerGroup(svg, player, onChange));
  }
  layerEl.appendChild(ballGroup(svg, scene.ball, onChange));
}
```

- [ ] **Step 2: Wire tokens into `js/app.js`**

Replace the contents of `js/app.js` with:

```javascript
// app.js — entry point. Owns the current scene and wires modules together.
import { createScene } from './scene.js';
import { renderField } from './field.js';
import { renderTokens } from './tokens.js';

const board = document.getElementById('board');
const layerField = document.getElementById('layer-field');
const layerTokens = document.getElementById('layer-tokens');

let scene = createScene({ preset: '11v11', teamA: 11, teamB: 11, half: false });

function render() {
  renderField(board, layerField, scene.field);
  renderTokens(board, layerTokens, scene, () => {/* positions already updated in model */});
}

render();
console.log('[goalpad] loaded');
```

- [ ] **Step 3: Verify in the browser**

Reload the page. Expected: 22 blue/orange numbered players plus a white ball. Dragging any token with mouse (or finger on a touch device) moves it and it stays where dropped. The page itself does not scroll or zoom while dragging.

- [ ] **Step 4: Commit**

```bash
git add js/tokens.js js/app.js
git commit -m "feat: draggable player and ball tokens on the pitch"
```

---

## Task 5: Setup panel (field size, team counts, add/remove players)

**Files:**
- Modify: `index.html` (add the setup panel markup)
- Modify: `styles.css` (panel styling)
- Modify: `js/app.js` (open/apply the panel)

**Interfaces:**
- Consumes: `createScene`, `defaultPlayers`, `fieldViewBox` from `scene.js`.
- Produces: a Setup overlay that rebuilds `scene` from chosen preset/counts/half and re-renders.

- [ ] **Step 1: Add the panel markup to `index.html`**

Insert immediately after the closing `</footer>` (before the `<script>` tag):

```html
  <div id="panel-setup" class="panel" hidden>
    <div class="panel-card">
      <h2>Setup</h2>
      <label>Field / game size
        <select id="setup-preset">
          <option value="11v11">11 v 11</option>
          <option value="9v9">9 v 9</option>
          <option value="7v7">7 v 7</option>
          <option value="custom">Custom (small-sided grid)</option>
        </select>
      </label>
      <label>Team A players <input id="setup-teamA" type="number" min="1" max="11" value="11"></label>
      <label>Team B players <input id="setup-teamB" type="number" min="1" max="11" value="11"></label>
      <label><input id="setup-half" type="checkbox"> Half pitch</label>
      <p class="panel-note">Changing the setup rebuilds the board with default positions.</p>
      <div class="panel-actions">
        <button id="setup-cancel" type="button">Cancel</button>
        <button id="setup-apply" type="button">Apply</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 2: Add panel styles to `styles.css`** (append to end of file)

```css
.panel {
  position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.5); z-index: 10;
}
.panel[hidden] { display: none; }
.panel-card {
  background: #2a303a; padding: 20px; border-radius: 12px;
  width: min(92vw, 380px); display: flex; flex-direction: column; gap: 12px;
}
.panel-card h2 { margin: 0 0 4px; }
.panel-card label { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.panel-card select, .panel-card input[type="number"] {
  font-size: 16px; padding: 8px; border-radius: 6px; border: none; min-width: 120px;
}
.panel-note { font-size: 13px; opacity: 0.7; margin: 0; }
.panel-actions { display: flex; justify-content: flex-end; gap: 8px; }
.saved-list { list-style: none; padding: 0; margin: 0; max-height: 40vh; overflow: auto; }
.saved-list li { display: flex; justify-content: space-between; gap: 8px; padding: 6px 0; }
```

- [ ] **Step 3: Wire the panel in `js/app.js`**

Replace the contents of `js/app.js` with:

```javascript
// app.js — entry point. Owns the current scene and wires modules together.
import { createScene } from './scene.js';
import { renderField } from './field.js';
import { renderTokens } from './tokens.js';

const board = document.getElementById('board');
const layerField = document.getElementById('layer-field');
const layerTokens = document.getElementById('layer-tokens');

let scene = createScene({ preset: '11v11', teamA: 11, teamB: 11, half: false });

function render() {
  renderField(board, layerField, scene.field);
  renderTokens(board, layerTokens, scene, () => {});
}

// ---- Setup panel ----
const panelSetup = document.getElementById('panel-setup');
const elPreset = document.getElementById('setup-preset');
const elTeamA = document.getElementById('setup-teamA');
const elTeamB = document.getElementById('setup-teamB');
const elHalf = document.getElementById('setup-half');

function openSetup() {
  elPreset.value = scene.field.preset;
  elTeamA.value = scene.field.teamA;
  elTeamB.value = scene.field.teamB;
  elHalf.checked = scene.field.half;
  panelSetup.hidden = false;
}
function closeSetup() { panelSetup.hidden = true; }

// Presets lock team counts to equal sizes; custom allows independent counts.
const PRESET_COUNTS = { '11v11': 11, '9v9': 9, '7v7': 7 };
elPreset.addEventListener('change', () => {
  const n = PRESET_COUNTS[elPreset.value];
  const custom = elPreset.value === 'custom';
  elTeamA.disabled = elTeamB.disabled = !custom;
  if (!custom) { elTeamA.value = n; elTeamB.value = n; }
});

document.getElementById('btn-setup').addEventListener('click', openSetup);
document.getElementById('setup-cancel').addEventListener('click', closeSetup);
document.getElementById('setup-apply').addEventListener('click', () => {
  const field = {
    preset: elPreset.value,
    teamA: Math.max(1, Math.min(11, Number(elTeamA.value) || 1)),
    teamB: Math.max(1, Math.min(11, Number(elTeamB.value) || 1)),
    half: elHalf.checked,
  };
  scene = createScene(field, scene.name);
  closeSetup();
  render();
});

render();
console.log('[goalpad] loaded');
```

- [ ] **Step 4: Verify in the browser**

Reload. Tap **Setup**. Choose **7 v 7** → Apply: the pitch shrinks to a 7-a-side size with 7 players per team. Reopen, choose **Custom**, set Team A = 2, Team B = 1 → Apply: a small grid with a 2v1. Reopen, toggle **Half pitch** on 11v11 → Apply: only half the pitch length renders.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css js/app.js
git commit -m "feat: setup panel for field size, team counts, and small-sided scenarios"
```

---

## Task 6: Annotation tools (arrow, pen, cone, text, delete)

**Files:**
- Create: `js/tools.js`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `clientToSvg` from `tokens.js`; `scene.annotations`.
- Produces:
  - `renderAnnotations(layerEl, scene)` — draws all annotations from the model.
  - `initTools(svg, layerEl, scene, getTool, onChange)` — installs pointer handlers on the SVG that create/delete annotations based on the active tool; calls `onChange()` after any change.

- [ ] **Step 1: Implement `js/tools.js`**

```javascript
// tools.js — DOM: annotation tools drawing into scene.annotations.
// Annotation shapes (stored in viewBox units):
//   { type:'arrow', x1,y1,x2,y2 }
//   { type:'pen', points:[{x,y},...] }
//   { type:'cone', x,y }
//   { type:'text', x,y, text }
import { clientToSvg } from './tokens.js';

const SVGNS = 'http://www.w3.org/2000/svg';

function el(name, attrs) {
  const node = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// Shared arrowhead marker, added once to the annotations layer.
function ensureMarker(layerEl) {
  if (layerEl.querySelector('#arrowhead')) return;
  const defs = document.createElementNS(SVGNS, 'defs');
  const marker = el('marker', {
    id: 'arrowhead', markerWidth: '8', markerHeight: '8',
    refX: '6', refY: '3', orient: 'auto', markerUnits: 'strokeWidth',
  });
  marker.appendChild(el('path', { d: 'M0,0 L6,3 L0,6 Z', fill: '#ffe14d' }));
  defs.appendChild(marker);
  layerEl.appendChild(defs);
}

function drawAnnotation(layerEl, a, index) {
  if (a.type === 'arrow') {
    const line = el('line', {
      x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2,
      stroke: '#ffe14d', 'stroke-width': '4', 'stroke-linecap': 'round',
      'marker-end': 'url(#arrowhead)',
    });
    line.dataset.annIndex = index;
    layerEl.appendChild(line);
  } else if (a.type === 'pen') {
    const d = a.points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
    const path = el('path', { d, fill: 'none', stroke: '#ffe14d', 'stroke-width': '4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    path.dataset.annIndex = index;
    layerEl.appendChild(path);
  } else if (a.type === 'cone') {
    const tri = el('path', { d: `M${a.x},${a.y - 12} L${a.x - 10},${a.y + 8} L${a.x + 10},${a.y + 8} Z`, fill: '#ff9f1c', stroke: '#5a3a00', 'stroke-width': '1.5' });
    tri.dataset.annIndex = index;
    layerEl.appendChild(tri);
  } else if (a.type === 'text') {
    const t = el('text', { x: a.x, y: a.y, fill: '#ffffff', 'font-size': '20', 'font-weight': '700', 'text-anchor': 'middle' });
    t.textContent = a.text;
    t.dataset.annIndex = index;
    layerEl.appendChild(t);
  }
}

export function renderAnnotations(layerEl, scene) {
  layerEl.replaceChildren();
  ensureMarker(layerEl);
  scene.annotations.forEach((a, i) => drawAnnotation(layerEl, a, i));
}

export function initTools(svg, layerEl, scene, getTool, onChange) {
  let draft = null; // in-progress annotation

  svg.addEventListener('pointerdown', (e) => {
    const tool = getTool();
    if (tool === 'select') return; // handled by token drag
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    svg.setPointerCapture(e.pointerId);

    if (tool === 'arrow') {
      draft = { type: 'arrow', x1: x, y1: y, x2: x, y2: y };
    } else if (tool === 'pen') {
      draft = { type: 'pen', points: [{ x: Math.round(x), y: Math.round(y) }] };
    } else if (tool === 'cone') {
      scene.annotations.push({ type: 'cone', x: Math.round(x), y: Math.round(y) });
      onChange();
    } else if (tool === 'text') {
      const text = window.prompt('Label text:');
      if (text) { scene.annotations.push({ type: 'text', x: Math.round(x), y: Math.round(y), text }); onChange(); }
    } else if (tool === 'delete') {
      const idx = e.target.dataset && e.target.dataset.annIndex;
      if (idx != null) { scene.annotations.splice(Number(idx), 1); onChange(); }
    }
  });

  svg.addEventListener('pointermove', (e) => {
    if (!draft) return;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    if (draft.type === 'arrow') { draft.x2 = x; draft.y2 = y; }
    else if (draft.type === 'pen') { draft.points.push({ x: Math.round(x), y: Math.round(y) }); }
    // Live preview: temporarily append, then let onChange re-render on release.
    renderAnnotations(layerEl, { annotations: [...scene.annotations, draft] });
  });

  const finish = (e) => {
    if (!draft) return;
    try { svg.releasePointerCapture(e.pointerId); } catch {}
    if (draft.type === 'arrow') {
      const moved = Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) > 5;
      if (moved) scene.annotations.push({ ...draft, x1: Math.round(draft.x1), y1: Math.round(draft.y1), x2: Math.round(draft.x2), y2: Math.round(draft.y2) });
    } else if (draft.type === 'pen' && draft.points.length > 1) {
      scene.annotations.push(draft);
    }
    draft = null;
    onChange();
  };
  svg.addEventListener('pointerup', finish);
  svg.addEventListener('pointercancel', finish);
}
```

- [ ] **Step 2: Wire tools into `js/app.js`**

Make three edits to `js/app.js`:

(a) Add imports below the existing imports:

```javascript
import { renderAnnotations, initTools } from './tools.js';
```

(b) Add the annotations layer handle and current-tool state near the other `const` layer handles:

```javascript
const layerAnnotations = document.getElementById('layer-annotations');
let currentTool = 'select';
```

(c) Replace the `render()` function and add tool-button wiring + `initTools`:

```javascript
function render() {
  renderField(board, layerField, scene.field);
  renderAnnotations(layerAnnotations, scene);
  renderTokens(board, layerTokens, scene, () => {});
}

// Tool selection.
document.querySelectorAll('.tool').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentTool = btn.dataset.tool;
    document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    // Tokens only drag in select mode; ignore pointer events on them otherwise.
    layerTokens.style.pointerEvents = currentTool === 'select' ? 'auto' : 'none';
  });
});

initTools(board, layerAnnotations, scene, () => currentTool, () => renderAnnotations(layerAnnotations, scene));
```

Note: `initTools` binds to the current `scene`. Because `scene` is reassigned in the Setup panel, move the `initTools(...)` call and the render into a single place is not required for v1 — but you MUST re-point tools after a setup rebuild. Add this line at the END of the `setup-apply` click handler, right after `render();`:

```javascript
  initTools(board, layerAnnotations, scene, () => currentTool, () => renderAnnotations(layerAnnotations, scene));
```

- [ ] **Step 3: Verify in the browser**

Reload. Select **Arrow**, drag on the pitch → a yellow arrow with a head appears. **Pen** → freehand stroke follows your finger/mouse. **Cone** → tap drops an orange triangle. **Text** → tap, type a label, it appears. Switch to **Delete**, tap an annotation → it disappears. Switch back to **Select** → players drag again and annotations are inert.

- [ ] **Step 4: Commit**

```bash
git add js/tools.js js/app.js
git commit -m "feat: annotation tools — arrows, pen, cones, text, delete"
```

---

## Task 7: Step snapshot + interpolation logic (pure)

**Files:**
- Create: `js/steps.js`
- Create: `test/steps.test.js`

**Interfaces:**
- Consumes: a `scene` object (reads `players`, `ball`).
- Produces:
  - `captureStep(scene)` → `{ players:[{id,x,y}], ball:{x,y} }`.
  - `ease(t)` → smoothstep eased value in `[0,1]`.
  - `interpolateSteps(a, b, t)` → `{ players:[{id,x,y}], ball:{x,y} }` linearly blended by raw `t`.

- [ ] **Step 1: Write failing tests at `test/steps.test.js`**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureStep, ease, interpolateSteps } from '../js/steps.js';

test('captureStep snapshots player and ball coords by id', () => {
  const scene = { players: [{ id: 'A1', x: 10, y: 20 }, { id: 'B1', x: 30, y: 40 }], ball: { x: 5, y: 6 } };
  const step = captureStep(scene);
  assert.deepEqual(step, { players: [{ id: 'A1', x: 10, y: 20 }, { id: 'B1', x: 30, y: 40 }], ball: { x: 5, y: 6 } });
});

test('captureStep is a deep copy (mutating scene does not change the step)', () => {
  const scene = { players: [{ id: 'A1', x: 10, y: 20 }], ball: { x: 0, y: 0 } };
  const step = captureStep(scene);
  scene.players[0].x = 999;
  assert.equal(step.players[0].x, 10);
});

test('ease is 0 at 0, 1 at 1, and 0.5 at midpoint', () => {
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.ok(Math.abs(ease(0.5) - 0.5) < 1e-9);
});

test('interpolateSteps blends coords linearly by t', () => {
  const a = { players: [{ id: 'A1', x: 0, y: 0 }], ball: { x: 0, y: 0 } };
  const b = { players: [{ id: 'A1', x: 100, y: 200 }], ball: { x: 10, y: 20 } };
  const mid = interpolateSteps(a, b, 0.5);
  assert.deepEqual(mid.players[0], { id: 'A1', x: 50, y: 100 });
  assert.deepEqual(mid.ball, { x: 5, y: 10 });
});

test('interpolateSteps keeps an id present only in the from-step', () => {
  const a = { players: [{ id: 'A1', x: 0, y: 0 }, { id: 'B1', x: 10, y: 10 }], ball: { x: 0, y: 0 } };
  const b = { players: [{ id: 'A1', x: 100, y: 0 }], ball: { x: 0, y: 0 } };
  const mid = interpolateSteps(a, b, 0.5);
  const b1 = mid.players.find(p => p.id === 'B1');
  assert.deepEqual(b1, { id: 'B1', x: 10, y: 10 }); // no target → stays put
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/steps.test.js`
Expected: FAIL — cannot import from `../js/steps.js`.

- [ ] **Step 3: Implement the pure portion of `js/steps.js`**

```javascript
// steps.js — PURE snapshot + interpolation (top of file, no DOM at import time).

export function captureStep(scene) {
  return {
    players: scene.players.map(p => ({ id: p.id, x: p.x, y: p.y })),
    ball: { x: scene.ball.x, y: scene.ball.y },
  };
}

// Smoothstep easing: slow-in, slow-out.
export function ease(t) {
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) { return a + (b - a) * t; }

export function interpolateSteps(a, b, t) {
  const targets = new Map(b.players.map(p => [p.id, p]));
  const players = a.players.map(p => {
    const to = targets.get(p.id) || p; // missing target → hold position
    return { id: p.id, x: lerp(p.x, to.x, t), y: lerp(p.y, to.y, t) };
  });
  const ball = {
    x: lerp(a.ball.x, b.ball.x, t),
    y: lerp(a.ball.y, b.ball.y, t),
  };
  return { players, ball };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/steps.test.js`
Expected: PASS — all 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add js/steps.js test/steps.test.js
git commit -m "feat: pure step snapshot and interpolation logic"
```

---

## Task 8: Steps UI + playback

**Files:**
- Modify: `js/steps.js` (append the browser playback/scrub controller)
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `captureStep`, `ease`, `interpolateSteps` from `steps.js`; `applyStep` from `scene.js`; `renderTokens` from `tokens.js`.
- Produces: `createStepController({ scene, applyPositions, onStepsChanged })` returning `{ addStep, play, scrubTo, next, prev, count }`.

- [ ] **Step 1: Append the playback controller to `js/steps.js`**

```javascript

// ---- Browser playback controller (uses requestAnimationFrame; no import-time DOM) ----
export function createStepController({ scene, applyPositions, onStepsChanged }) {
  const SEGMENT_MS = 800;
  let playing = false;

  function addStep() {
    scene.steps.push(captureStep(scene));
    onStepsChanged(scene.steps.length);
  }

  // pos is a fractional index across steps: 0 .. steps.length-1
  function scrubTo(pos) {
    const steps = scene.steps;
    if (steps.length === 0) return;
    if (steps.length === 1) { applyPositions(steps[0]); return; }
    const clamped = Math.max(0, Math.min(steps.length - 1, pos));
    const seg = Math.min(Math.floor(clamped), steps.length - 2);
    const t = clamped - seg;
    applyPositions(interpolateSteps(steps[seg], steps[seg + 1], t));
  }

  function play() {
    const steps = scene.steps;
    if (playing || steps.length < 2) return;
    playing = true;
    let seg = 0;
    let start = null;
    function frame(ts) {
      if (!playing) return;
      if (start == null) start = ts;
      const raw = Math.min(1, (ts - start) / SEGMENT_MS);
      applyPositions(interpolateSteps(steps[seg], steps[seg + 1], ease(raw)), seg + raw);
      if (raw < 1) {
        requestAnimationFrame(frame);
      } else if (seg < steps.length - 2) {
        seg += 1; start = null; requestAnimationFrame(frame);
      } else {
        playing = false;
      }
    }
    requestAnimationFrame(frame);
  }

  return {
    addStep,
    play,
    scrubTo,
    next() { /* index-based nav handled by app via scrubTo */ },
    prev() {},
    get count() { return scene.steps.length; },
  };
}
```

- [ ] **Step 2: Wire the steps bar in `js/app.js`**

Make these edits to `js/app.js`:

(a) Add imports:

```javascript
import { applyStep } from './scene.js';
import { createStepController } from './steps.js';
```

(b) Grab the steps-bar elements near the other DOM handles:

```javascript
const scrub = document.getElementById('scrub');
const stepLabel = document.getElementById('step-label');
```

(c) Add this block just before the final `render();` call. It defines how positions get applied during playback/scrub and builds the controller. Because `scene` is reassigned by Setup, wrap controller creation in a function and call it on load and after setup-apply:

```javascript
let steps = null;

function applyPositions(snapshot, fractionalIndex) {
  applyStep(scene, snapshot);         // write coords onto the model
  renderTokens(board, layerTokens, scene, () => {}); // redraw tokens at new coords
  if (fractionalIndex != null) {
    scrub.value = String(fractionalIndex);
    updateStepLabel(fractionalIndex);
  }
}

function updateStepLabel(pos) {
  const total = scene.steps.length;
  const shown = total === 0 ? 0 : Math.round(pos) + 1;
  stepLabel.textContent = `Step ${total === 0 ? 0 : shown} / ${total}`;
}

function refreshScrubRange() {
  const max = Math.max(0, scene.steps.length - 1);
  scrub.max = String(max);
  scrub.value = String(max);
  updateStepLabel(max);
}

function buildSteps() {
  steps = createStepController({
    scene,
    applyPositions,
    onStepsChanged: () => refreshScrubRange(),
  });
  refreshScrubRange();
}

document.getElementById('btn-add-step').addEventListener('click', () => steps.addStep());
document.getElementById('btn-play').addEventListener('click', () => steps.play());
scrub.addEventListener('input', () => steps.scrubTo(Number(scrub.value)));
document.getElementById('btn-step-prev').addEventListener('click', () => {
  const v = Math.max(0, Math.round(Number(scrub.value)) - 1);
  scrub.value = String(v); steps.scrubTo(v);
});
document.getElementById('btn-step-next').addEventListener('click', () => {
  const v = Math.min(Number(scrub.max), Math.round(Number(scrub.value)) + 1);
  scrub.value = String(v); steps.scrubTo(v);
});

buildSteps();
```

(d) At the end of the `setup-apply` handler (after the existing `initTools(...)` line), add:

```javascript
  buildSteps();
```

- [ ] **Step 3: Verify in the browser**

Reload. Arrange the players, tap **+ Add step** (label shows `Step 1 / 1`). Move several players and the ball, tap **+ Add step** again (`Step 2 / 2`). Tap **▶ Play** → all moved tokens glide smoothly from their step-1 to step-2 positions. Drag the scrubber slider → tokens move proportionally between steps. **◀ / ▶** jump whole steps.

- [ ] **Step 4: Commit**

```bash
git add js/steps.js js/app.js
git commit -m "feat: add-step, play, and scrub animation of tactics"
```

---

## Task 9: Persistence — serialize/deserialize + save/load/export/import

**Files:**
- Create: `js/storage.js`
- Create: `test/storage.test.js`
- Modify: `index.html` (Save/Load panel markup)
- Modify: `js/app.js`

**Interfaces:**
- Consumes: the `scene` object.
- Produces:
  - `serialize(scene)` → JSON string.
  - `deserialize(str)` → scene object with all arrays guaranteed present.
  - `saveNamed(name, scene)`, `listSaved()` → `string[]`, `loadNamed(name)` → scene | null, `deleteNamed(name)`.
  - `exportScene(scene)` (browser download), `importSceneFile(file)` → `Promise<scene>`.

- [ ] **Step 1: Write failing tests at `test/storage.test.js`**

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/storage.test.js`
Expected: FAIL — cannot import from `../js/storage.js`.

- [ ] **Step 3: Implement `js/storage.js`**

```javascript
// storage.js — PURE serialize/deserialize (top), browser persistence (bottom).
const KEY_PREFIX = 'goalpad:scene:';

export function serialize(scene) {
  return JSON.stringify(scene);
}

export function deserialize(str) {
  const raw = JSON.parse(str); // throws on invalid JSON
  return {
    name: raw.name || 'Untitled',
    field: raw.field,
    players: Array.isArray(raw.players) ? raw.players : [],
    ball: raw.ball || { x: 0, y: 0 },
    annotations: Array.isArray(raw.annotations) ? raw.annotations : [],
    steps: Array.isArray(raw.steps) ? raw.steps : [],
  };
}

// ---- Browser-only below (localStorage / DOM used inside functions only) ----

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

Run: `node --test test/storage.test.js`
Expected: PASS — all 3 tests passing. Then run the whole suite: `node --test` → all tests across scene/steps/storage/smoke pass.

- [ ] **Step 5: Add the Save/Load panel markup to `index.html`**

Insert after the `#panel-setup` div (before the `<script>`):

```html
  <div id="panel-saveload" class="panel" hidden>
    <div class="panel-card">
      <h2>Save / Load</h2>
      <label>Name <input id="save-name" type="text" placeholder="e.g. Overlap right"></label>
      <div class="panel-actions">
        <button id="save-current" type="button">Save</button>
        <button id="export-current" type="button">Export file</button>
        <label class="import-label">Import file
          <input id="import-file" type="file" accept="application/json" hidden>
        </label>
      </div>
      <h3>Saved plays</h3>
      <ul id="saved-list" class="saved-list"></ul>
      <div class="panel-actions">
        <button id="saveload-close" type="button">Close</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 6: Style the import label** (append to `styles.css`)

```css
.import-label { display: inline-flex; align-items: center; padding: 10px 14px; min-height: 44px; background: #3b4250; border-radius: 8px; cursor: pointer; }
.saved-list button { padding: 6px 10px; min-height: 36px; }
h3 { margin: 8px 0 0; }
```

- [ ] **Step 7: Wire persistence in `js/app.js`**

Make these edits:

(a) Add imports:

```javascript
import { saveNamed, listSaved, loadNamed, deleteNamed, exportScene, importSceneFile } from './storage.js';
```

(b) Add a helper to load a scene object into the app (rebuild everything). Place it after `buildSteps()` is defined:

```javascript
function loadScene(next) {
  scene = next;
  render();
  initTools(board, layerAnnotations, scene, () => currentTool, () => renderAnnotations(layerAnnotations, scene));
  buildSteps();
}
```

(c) Wire the panel near the other panel wiring:

```javascript
const panelSaveLoad = document.getElementById('panel-saveload');
const savedList = document.getElementById('saved-list');
const saveName = document.getElementById('save-name');

function refreshSavedList() {
  savedList.replaceChildren();
  for (const name of listSaved()) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = name;
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', () => {
      const s = loadNamed(name);
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
  scene.name = (saveName.value || scene.name || 'scene').trim();
  exportScene(scene);
});
document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  importSceneFile(file).then((s) => { loadScene(s); panelSaveLoad.hidden = true; })
    .catch(() => window.alert('Could not read that file.'));
  e.target.value = '';
});
```

- [ ] **Step 8: Verify in the browser**

Reload. Arrange a play, open **Save / Load**, name it "Test", tap **Save** → it appears in the list. Reload the whole page, open Save/Load, tap **Load** on "Test" → the play returns. Tap **Export file** → a `.json` downloads. Change the board, then **Import file** and pick that `.json` → the saved play loads. **Delete** removes it from the list.

- [ ] **Step 9: Commit**

```bash
git add js/storage.js test/storage.test.js index.html styles.css js/app.js
git commit -m "feat: save/load to localStorage plus JSON export/import"
```

---

## Task 10: iPad/touch polish + README + deploy note

**Files:**
- Modify: `styles.css`
- Modify: `index.html` (iOS web-app meta)
- Create: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: touch-friendly finishing + hosting instructions. No new logic.

- [ ] **Step 1: Add iOS/standalone meta to `index.html`** (inside `<head>`, after the viewport meta)

```html
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#1e232b">
```

- [ ] **Step 2: Harden touch behavior in `styles.css`** (append)

```css
#board { touch-action: none; -webkit-tap-highlight-color: transparent; }
.tool, button { -webkit-touch-callout: none; }
@media (max-width: 640px) {
  .brand { font-size: 16px; }
  .tool { padding: 8px 10px; font-size: 14px; }
  #stepsbar { flex-wrap: wrap; }
}
```

- [ ] **Step 3: Create `README.md`**

````markdown
# goalpad

A simple, touch-friendly soccer tactics board. Drag players and the ball on a
pitch, draw arrows/runs, and animate a play step by step. Runs entirely in the
browser — nothing is uploaded anywhere; saved plays live on your device.

## Use it

Open `index.html` through any static web server. Locally:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

(ES modules require `http://`, not opening the file directly.)

## Host on GitHub Pages

1. Push this folder to a GitHub repository.
2. Repo **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`.
3. Open the published URL on your iPad. Add it to the Home Screen for a full-screen app feel.

## What it does

- **Setup:** 11v11 / 9v9 / 7v7, or a custom small-sided grid (e.g. 2v1, 3v2).
- **Whiteboard:** drag players + ball; draw arrows, freehand, cones, and text.
- **Animate:** capture steps, press Play to glide between them, scrub with the slider.
- **Save:** name plays (stored on the device); export/import as `.json` to back up or move.

## Develop

Pure logic modules are unit-tested with Node's built-in runner:

```bash
node --test
```
````

- [ ] **Step 4: Verify**

Run `node --test` → all tests pass. Reload the site in the browser: on a narrow window the tool bar wraps and buttons stay tappable; dragging never scrolls the page. If you have an iPad, open the Pages URL and confirm finger dragging, drawing, and Play all work.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css README.md
git commit -m "feat: touch polish, iOS web-app meta, and README with deploy steps"
```

---

## Self-Review Notes

- **Spec coverage:** whiteboard drag (Task 4), arrows/pen/cones/text (Task 6), steps/play/scrub (Tasks 7–8), configurable + small-sided/asymmetric sizes (Tasks 2, 5), save-on-device + export/import (Task 9), SVG single surface + pointer events + no build step (Tasks 1, Global Constraints), iPad-first layout (Tasks 1, 10). All spec sections map to a task.
- **Annotations-fixed-during-playback** honored: `renderTokens` is redrawn during playback; annotations layer is untouched by the step controller.
- **Type consistency:** step snapshot shape `{ players:[{id,x,y}], ball:{x,y} }` is identical across `captureStep`, `interpolateSteps`, `applyStep`, and the controller. `field` shape `{ preset, teamA, teamB, half }` is identical across `scene.js`, the Setup panel, and `deserialize`.
- **Known v1 simplification:** the custom grid uses a fixed 40×30 m size; individual add/remove of a single player is done via the Setup counts rather than tapping the board (kept simple per YAGNI; can add tap-to-add later).
