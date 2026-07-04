# goalpad Redesign Stage 3a — Build Tools & Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Build's tool-per-button model with piece chips (tap-to-stamp / drag-to-place), an ink taxonomy incl. a dashed Run tool, tap-to-select with a contextual Duplicate/Delete chip, and drag-off-pitch to remove.

**Architecture:** A pure `addBall` scene helper, then one atomic interaction rework: `tokens.js` gains Build-gated tap/drag/drag-off + a selection ring (new options-object signature); `tools.js` switches to an `armed` model that stamps pieces or draws ink and selects/deselects marks (new options), plus a `run` markup type; `app.js` owns `armed`/`selected`, wires the chips/ink and the contextual selection chip; `index.html` swaps the toolbar; `styles.css` adds chip + selection-chip styles. Watch stays view-only; Home/modes/autosave unchanged. The filmstrip and undo/redo are Stage 3b.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, SVG, `node:test`. No build step.

## Global Constraints

- **`armed`** ∈ `null` | `'chip:A|B|ball|cone'` | `'ink:arrow|run|pen|text'`; **`selected`** ∈ `null` | `{type:'piece',id}` | `{type:'ink',index}`. All piece/ink interaction is **Build-only** (`mode==='build'`); Watch is view-only.
- **Chips:** tap toggles stamp-arming (active shows the 2px ink underline); drag from a chip onto the board places one where released. Team = chip (A solid, B open). **Ball is singular** (its chip adds a ball only if none exists).
- **Selection:** tap a piece (neutral) → 2px ink ring + contextual chip (player/cone: Duplicate·Delete; ball: Delete). Tap a mark → dashed selection box + Delete chip. Tap empty / arm / act → deselect. Drag a piece off the field viewBox bounds → remove.
- **Run** markup: `{type:'run',x1,y1,x2,y2}`, rendered as a **dashed** ink line (`stroke-dasharray:7 6`) with the open-chevron arrowhead; Arrow stays solid.
- Monochrome idiom (paper `#ffffff`, ink `#0a0a0a`, signal `#e10600`, square corners, engraved labels, ink hairlines). Tap targets `min-height:40px`.
- No filmstrip, no undo/redo (Stage 3b); Build keeps the current steps bar. No change to Watch/Home/autosave/playback/library data beyond `addBall`. Existing tests stay green.

---

## File Structure

```
js/scene.js        # + addBall(scene,x,y) pure helper
test/scene.test.js # + addBall tests
js/tokens.js       # REWRITE: options-object signature; Build tap/drag/drag-off; selection ring
js/tools.js        # REWRITE: armed model (stamp/draw/select-ink/deselect); run markup; selection box
js/app.js          # REWRITE: armed/selected state; chip+ink wiring; contextual selection chip
index.html         # toolbar → 4 chips + divider + 4 ink buttons
styles.css         # + .chip, .tool-divider, .sel-chip/.sel-item
```

---

## Task 1: `addBall` scene helper

**Files:**
- Modify: `js/scene.js`
- Modify: `test/scene.test.js`

**Interfaces:**
- Produces: `addBall(scene, x, y)` — appends `{id:'ball',kind:'ball'}` with a position in every frame **only if no ball exists**; returns `'ball'` or `null`.

- [ ] **Step 1: Write the failing tests** — append to `test/scene.test.js`:

```javascript
import { addBall } from '../js/scene.js';

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
```

Note: `test/scene.test.js` already imports `test`/`assert` and `createScene`; reuse them (do not duplicate those imports — add only the `addBall` import).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/scene.test.js`
Expected: FAIL — `addBall` is not exported.

- [ ] **Step 3: Add `addBall` to `js/scene.js`** — insert after `addCone`:

```javascript
export function addBall(scene, x, y) {
  if (scene.pieces.some((p) => p.kind === 'ball')) return null;
  scene.pieces.push({ id: 'ball', kind: 'ball' });
  for (const f of scene.frames) f.positions['ball'] = { x: Math.round(x), y: Math.round(y) };
  return 'ball';
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/scene.test.js` then `node --test`.
Expected: PASS — new tests pass; full suite green.

- [ ] **Step 5: Commit**

```bash
git add js/scene.js test/scene.test.js
git commit -m "feat: addBall scene helper (adds the ball only if absent)"
```

---

## Task 2: Build tools, selection & the Run tool (interaction rework)

**Files:**
- Rewrite: `js/tokens.js`
- Rewrite: `js/tools.js`
- Rewrite: `js/app.js`
- Modify: `index.html` (the `#toolbar` block only)
- Modify: `styles.css` (append)

**Interfaces:**
- Consumes: `addBall` (Task 1); `addPlayer`/`addCone`/`removePiece`/`pieceById` (existing `scene.js`).
- Produces: `renderTokens(svg, layerEl, scene, frame, { getMode, getArmed, selectedId, onSelect, onChange, onRemove })`; `renderMarkup(layerEl, frame, selectedIndex?)`; `initTools(svg, markupLayer, { getScene, getFrame, getArmed, onSceneChange, onMarkupChange, onSelectInk, onDeselect })`.

- [ ] **Step 1: Rewrite `js/tokens.js`** (replace entire file)

```javascript
// tokens.js — DOM: value-based players / red-dot ball / ink cone.
// Build-only interaction: drag to move, tap (neutral) to select, drag off-pitch to remove; selection ring.
import { fieldViewBox } from './scene.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const INK = '#0a0a0a';
const PAPER = '#ffffff';
const SIGNAL = '#e10600';
const R = 13.5;
const TAP_MOVE = 4; // viewBox units: a pointerup under this is a tap, not a drag

export function clientToSvg(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: p.x, y: p.y };
}

function el(name, attrs) {
  const n = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

function shapeFor(piece) {
  if (piece.kind === 'player') {
    const solid = piece.team === 'A';
    const c = el('circle', { r: R, fill: solid ? INK : PAPER, stroke: solid ? 'none' : INK, 'stroke-width': solid ? '0' : '1.5' });
    const t = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Jost, Space Grotesk, Futura, sans-serif', 'font-size': '13', 'font-weight': '500', fill: solid ? PAPER : INK });
    t.textContent = String(piece.number);
    return [c, t];
  }
  if (piece.kind === 'ball') return [el('circle', { r: 8, fill: SIGNAL })];
  return [el('path', { d: 'M0,-11 L-9,8 L9,8 Z', fill: 'none', stroke: INK, 'stroke-width': '1.5' })];
}

function makeInteractive(svg, group, scene, frame, id, opts) {
  let dragging = false, moved = false, startX = 0, startY = 0;
  group.addEventListener('pointerdown', (e) => {
    if (opts.getMode() !== 'build') return;
    dragging = true; moved = false;
    const p = clientToSvg(svg, e.clientX, e.clientY);
    startX = p.x; startY = p.y;
    group.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });
  group.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    if (Math.hypot(x - startX, y - startY) > TAP_MOVE) moved = true;
    frame.positions[id] = { x: Math.round(x), y: Math.round(y) };
    group.setAttribute('transform', `translate(${frame.positions[id].x}, ${frame.positions[id].y})`);
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    try { group.releasePointerCapture(e.pointerId); } catch {}
    const pos = frame.positions[id];
    const { w, h } = fieldViewBox(scene.field);
    if (pos && (pos.x < 0 || pos.x > w || pos.y < 0 || pos.y > h)) { opts.onRemove(id); return; }
    if (!moved) { if (opts.getArmed() === null) opts.onSelect(id); return; }
    opts.onChange();
  };
  group.addEventListener('pointerup', end);
  group.addEventListener('pointercancel', end);
}

export function renderTokens(svg, layerEl, scene, frame, opts) {
  layerEl.replaceChildren();
  for (const piece of scene.pieces) {
    const pos = frame.positions[piece.id] || { x: 0, y: 0 };
    const g = el('g', { transform: `translate(${pos.x}, ${pos.y})` });
    g.dataset.tokenId = piece.id;
    g.style.cursor = 'grab';
    for (const s of shapeFor(piece)) g.appendChild(s);
    if (piece.id === opts.selectedId) {
      const ringR = piece.kind === 'player' ? R + 6 : (piece.kind === 'ball' ? 14 : 16);
      g.appendChild(el('circle', { r: ringR, fill: 'none', stroke: INK, 'stroke-width': '2' }));
    }
    makeInteractive(svg, g, scene, frame, piece.id, opts);
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

- [ ] **Step 2: Rewrite `js/tools.js`** (replace entire file)

```javascript
// tools.js — DOM: markup rendering + the armed input model (stamp pieces / draw ink / select-deselect marks).
// Markup: {type:'arrow',x1,y1,x2,y2} {type:'run',x1,y1,x2,y2} {type:'pen',points:[{x,y}]} {type:'text',x,y,text}
import { clientToSvg } from './tokens.js';
import { addPlayer, addCone, addBall } from './scene.js';

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
  marker.appendChild(el('path', { d: 'M0,0 L6,3 L0,6', fill: 'none', stroke: '#0a0a0a', 'stroke-width': '1.2', 'stroke-linecap': 'round' }));
  defs.appendChild(marker);
  layerEl.appendChild(defs);
}

function drawOne(layerEl, a, index) {
  let node;
  if (a.type === 'arrow' || a.type === 'run') {
    node = el('line', { x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, stroke: '#0a0a0a', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'marker-end': 'url(#arrowhead)' });
    if (a.type === 'run') node.setAttribute('stroke-dasharray', '7 6');
  } else if (a.type === 'pen') {
    const d = a.points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
    node = el('path', { d, fill: 'none', stroke: '#0a0a0a', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  } else if (a.type === 'text') {
    node = el('text', { x: a.x, y: a.y, fill: '#0a0a0a', 'font-family': 'Jost, Space Grotesk, Futura, sans-serif', 'font-size': '20', 'font-weight': '500', 'text-anchor': 'middle' });
    node.textContent = a.text;
  }
  if (node) { node.dataset.annIndex = index; layerEl.appendChild(node); }
}

export function renderMarkup(layerEl, frame, selectedIndex = null) {
  layerEl.replaceChildren();
  ensureMarker(layerEl);
  frame.markup.forEach((a, i) => drawOne(layerEl, a, i));
  if (selectedIndex != null) {
    const target = layerEl.querySelector(`[data-ann-index="${selectedIndex}"]`);
    if (target) {
      try {
        const b = target.getBBox();
        const pad = 6;
        layerEl.appendChild(el('rect', { x: b.x - pad, y: b.y - pad, width: b.width + 2 * pad, height: b.height + 2 * pad, fill: 'none', stroke: '#0a0a0a', 'stroke-width': '1', 'stroke-dasharray': '4 4' }));
      } catch { /* getBBox can throw on empty text; ignore */ }
    }
  }
}

function placePiece(scene, kind, x, y) {
  if (kind === 'A' || kind === 'B') addPlayer(scene, kind, x, y);
  else if (kind === 'cone') addCone(scene, x, y);
  else if (kind === 'ball') addBall(scene, x, y);
}

export function initTools(svg, markupLayer, { getScene, getFrame, getArmed, onSceneChange, onMarkupChange, onSelectInk, onDeselect }) {
  let draft = null;

  svg.addEventListener('pointerdown', (e) => {
    const armed = getArmed();
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);

    if (armed && armed.type === 'piece') {
      placePiece(getScene(), armed.kind, x, y);
      onSceneChange();
      return;
    }
    if (armed && armed.type === 'ink') {
      const tool = armed.tool;
      if (tool === 'text') {
        const text = window.prompt('Label text:');
        if (text) { getFrame().markup.push({ type: 'text', x: Math.round(x), y: Math.round(y), text }); onMarkupChange(); }
        return;
      }
      svg.setPointerCapture(e.pointerId);
      if (tool === 'arrow') draft = { type: 'arrow', x1: x, y1: y, x2: x, y2: y };
      else if (tool === 'run') draft = { type: 'run', x1: x, y1: y, x2: x, y2: y };
      else if (tool === 'pen') draft = { type: 'pen', points: [{ x: Math.round(x), y: Math.round(y) }] };
      return;
    }
    // neutral: select a tapped mark, else deselect
    const annEl = e.target.closest && e.target.closest('[data-ann-index]');
    if (annEl) onSelectInk(Number(annEl.dataset.annIndex));
    else onDeselect();
  });

  svg.addEventListener('pointermove', (e) => {
    if (!draft) return;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    if (draft.type === 'pen') draft.points.push({ x: Math.round(x), y: Math.round(y) });
    else { draft.x2 = x; draft.y2 = y; }
    renderMarkup(markupLayer, { markup: [...getFrame().markup, draft] });
  });

  const finish = (e) => {
    if (!draft) return;
    try { svg.releasePointerCapture(e.pointerId); } catch {}
    if (draft.type === 'arrow' || draft.type === 'run') {
      if (Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) > 5) {
        getFrame().markup.push({ type: draft.type, x1: Math.round(draft.x1), y1: Math.round(draft.y1), x2: Math.round(draft.x2), y2: Math.round(draft.y2) });
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

- [ ] **Step 3: Rewrite `js/app.js`** (replace entire file)

```javascript
// app.js — shell (Home + Watch/Build + autosave) with the Build tool/selection model.
import { createScene, duplicateFrame, deleteFrame, addPlayer, addCone, removePiece, pieceById } from './scene.js';
import { renderField } from './field.js';
import { renderTokens, setTokenPositions } from './tokens.js';
import { renderMarkup, initTools } from './tools.js';
import { createStepController, activeMarkupIndex } from './steps.js';
import { deserialize, exportScene, importSceneFile,
         newTactic, saveMine, listMine, loadMine, deleteMine, migrateLegacyPlays } from './storage.js';
import { LIBRARY } from './library.js';
import { renderHome } from './home.js';

const homeEl = document.getElementById('home');
const editorEl = document.getElementById('editor');
const docTitle = document.getElementById('doc-title');
const board = document.getElementById('board');
const layerField = document.getElementById('layer-field');
const layerAnnotations = document.getElementById('layer-annotations');
const layerTokens = document.getElementById('layer-tokens');
const importInput = document.getElementById('import-file');

let scene = createScene({ preset: '11v11', teamA: 11, teamB: 11, half: 'full' });
let index = 0;
let armed = null;      // null | 'chip:A|B|ball|cone' | 'ink:arrow|run|pen|text'
let selected = null;   // null | {type:'piece',id} | {type:'ink',index}
let selChip = null;
let currentDocId = null;
let currentName = 'Untitled';

const frame = () => scene.frames[index];
const mode = () => editorEl.dataset.mode;
function armedObj() {
  if (!armed) return null;
  const [t, k] = armed.split(':');
  return t === 'chip' ? { type: 'piece', kind: k } : { type: 'ink', tool: k };
}
const selInkIndex = () => (selected && selected.type === 'ink' ? selected.index : null);

function render() {
  renderField(board, layerField, scene.field);
  renderTokens(board, layerTokens, scene, frame(), {
    getMode: mode,
    getArmed: armedObj,
    selectedId: selected && selected.type === 'piece' ? selected.id : null,
    onSelect: selectPiece,
    onChange: autosave,
    onRemove: (id) => { removePiece(scene, id); clearSelection(); autosave(); },
  });
  renderMarkup(layerAnnotations, frame(), selInkIndex());
  refreshScrubRange();
}

function autosave() {
  if (!currentDocId) return;
  scene.name = currentName;
  saveMine({ id: currentDocId, name: currentName, scene, updatedAt: Date.now() });
}

initTools(board, layerAnnotations, {
  getScene: () => scene,
  getFrame: () => frame(),
  getArmed: armedObj,
  onSceneChange: () => { render(); autosave(); },
  onMarkupChange: () => { renderMarkup(layerAnnotations, frame(), selInkIndex()); autosave(); },
  onSelectInk: (i) => selectInk(i),
  onDeselect: () => clearSelection(),
});

// ---- Toolbar: chips + ink (arm/disarm) ----
function armClick(key) { armed = (armed === key) ? null : key; clearSelection(); refreshArmedUI(); }
function refreshArmedUI() {
  document.querySelectorAll('#toolbar .chip').forEach((b) => b.setAttribute('aria-pressed', String(armed === 'chip:' + b.dataset.chip)));
  document.querySelectorAll('#toolbar .tool').forEach((b) => b.setAttribute('aria-pressed', String(armed === 'ink:' + b.dataset.ink)));
}
document.querySelectorAll('#toolbar .chip').forEach((b) => b.addEventListener('click', () => armClick('chip:' + b.dataset.chip)));
document.querySelectorAll('#toolbar .tool').forEach((b) => b.addEventListener('click', () => armClick('ink:' + b.dataset.ink)));

// ---- Selection + contextual chip ----
function selectPiece(id) { selected = { type: 'piece', id }; render(); openSelChipForPiece(id); }
function selectInk(i) { selected = { type: 'ink', index: i }; render(); openSelChipForInk(i); }
function clearSelection() { selected = null; closeSelChip(); render(); }

function openSelChipForPiece(id) {
  const p = pieceById(scene, id);
  const g = layerTokens.querySelector(`[data-token-id="${id}"]`);
  if (!g) return;
  const items = (p && p.kind === 'ball')
    ? [['Delete', () => deletePiece(id)]]
    : [['Duplicate', () => duplicatePiece(id)], ['Delete', () => deletePiece(id)]];
  openSelChip(g, items);
}
function openSelChipForInk(i) {
  const node = layerAnnotations.querySelector(`[data-ann-index="${i}"]`);
  if (!node) return;
  openSelChip(node, [['Delete', () => deleteInk(i)]]);
}
function openSelChip(anchorEl, items) {
  closeSelChip();
  selChip = document.createElement('div');
  selChip.className = 'sel-chip';
  for (const [label, fn] of items) {
    const b = document.createElement('button'); b.className = 'sel-item'; b.type = 'button'; b.textContent = label;
    b.addEventListener('click', fn);
    selChip.append(b);
  }
  const r = anchorEl.getBoundingClientRect();
  selChip.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 168)) + 'px';
  selChip.style.top = (r.bottom + 6) + 'px';
  document.body.append(selChip);
}
function closeSelChip() { if (selChip) { selChip.remove(); selChip = null; } }

function duplicatePiece(id) {
  const p = pieceById(scene, id); if (!p) return;
  const pos = frame().positions[id] || { x: 0, y: 0 };
  if (p.kind === 'player') addPlayer(scene, p.team, pos.x + 20, pos.y + 20);
  else if (p.kind === 'cone') addCone(scene, pos.x + 20, pos.y + 20);
  render(); autosave(); openSelChipForPiece(id);
}
function deletePiece(id) { removePiece(scene, id); clearSelection(); autosave(); }
function deleteInk(i) { frame().markup.splice(i, 1); clearSelection(); autosave(); }

// ---- Steps / playback (unchanged from Stage 2) ----
const scrub = document.getElementById('scrub');
const stepLabel = document.getElementById('step-label');
const btnDel = document.getElementById('btn-del-step');

function updateStepLabel(pos) { stepLabel.textContent = `${Math.round(pos) + 1} / ${scene.frames.length}`; }
function refreshScrubRange() {
  scrub.max = String(Math.max(0, scene.frames.length - 1));
  scrub.value = String(index);
  updateStepLabel(index);
  btnDel.disabled = scene.frames.length <= 1;
}
function applyPositions(positionsMap, pos) {
  setTokenPositions(layerTokens, positionsMap);
  const mi = Math.max(0, Math.min(scene.frames.length - 1, activeMarkupIndex(pos)));
  renderMarkup(layerAnnotations, scene.frames[mi]);
  scrub.value = String(pos);
  updateStepLabel(pos);
}
function settleTo(i) { index = Math.max(0, Math.min(scene.frames.length - 1, Math.round(i))); render(); }

const steps = createStepController({ getScene: () => scene, applyPositions, onDone: (i) => settleTo(i) });

document.getElementById('btn-add-step').addEventListener('click', () => { index = duplicateFrame(scene, index); render(); autosave(); });
btnDel.addEventListener('click', () => { if (deleteFrame(scene, index)) { index = Math.min(index, scene.frames.length - 1); render(); autosave(); } });
document.getElementById('btn-play').addEventListener('click', () => steps.play());
scrub.addEventListener('input', () => steps.scrubTo(Number(scrub.value)));
scrub.addEventListener('change', () => settleTo(Number(scrub.value)));
document.getElementById('btn-step-prev').addEventListener('click', () => { settleTo(index - 1); });
document.getElementById('btn-step-next').addEventListener('click', () => { settleTo(index + 1); });

// ---- Setup panel (New sheet + in-Build pitch change) ----
const panelSetup = document.getElementById('panel-setup');
const elPreset = document.getElementById('setup-preset');
const elHalf = document.getElementById('setup-half');
const elTeamA = document.getElementById('setup-teamA');
const elTeamB = document.getElementById('setup-teamB');
const PRESET_COUNTS = { '11v11': 11, '9v9': 9, '7v7': 7 };
let setupMode = 'new';

function openSetup(m) {
  setupMode = m;
  elPreset.value = scene.field.preset;
  elHalf.value = scene.field.half;
  const custom = elPreset.value === 'custom';
  if (!custom) { elTeamA.value = elTeamB.value = PRESET_COUNTS[scene.field.preset]; }
  elTeamA.disabled = elTeamB.disabled = !custom;
  panelSetup.hidden = false;
}
elPreset.addEventListener('change', () => {
  const custom = elPreset.value === 'custom';
  elTeamA.disabled = elTeamB.disabled = !custom;
  if (!custom) { elTeamA.value = PRESET_COUNTS[elPreset.value]; elTeamB.value = PRESET_COUNTS[elPreset.value]; }
});
document.getElementById('setup-cancel').addEventListener('click', () => {
  panelSetup.hidden = true;
  if (setupMode === 'new') showHome();
});
document.getElementById('setup-apply').addEventListener('click', () => {
  scene = createScene({
    preset: elPreset.value, half: elHalf.value,
    teamA: Math.max(0, Math.min(11, Number(elTeamA.value) || 0)),
    teamB: Math.max(0, Math.min(11, Number(elTeamB.value) || 0)),
    name: currentName,
  });
  index = 0;
  panelSetup.hidden = true;
  if (setupMode === 'new') {
    const t = newTactic(currentName, scene);
    currentDocId = t.id; currentName = t.name;
    saveMine(t);
    enterEditor('build');
  } else {
    render(); autosave();
  }
});

// ---- Navigation / surfaces ----
function showHome() {
  editorEl.hidden = true;
  homeEl.hidden = false;
  renderHome(homeEl, {
    templates: LIBRARY,
    mine: listMine(),
    onOpen: openCard,
    onNew: startNew,
    onImport: () => importInput.click(),
    onRename: renameTactic,
    onDuplicate: duplicateTactic,
    onExport: exportTactic,
    onDelete: deleteTactic,
  });
}

function enterEditor(m) {
  homeEl.hidden = true;
  editorEl.hidden = false;
  setMode(m);
}

function setMode(m) {
  editorEl.dataset.mode = m;
  docTitle.textContent = currentName + (m === 'build' ? ' ✎' : '');
  armed = null; selected = null; closeSelChip(); refreshArmedUI();
  render();
}

function sceneOf(item) {
  if (item.scene) return deserialize(JSON.stringify(item.scene));
  const t = loadMine(item.id);
  return t ? t.scene : null;
}

// ---- Flows ----
function startNew() {
  currentDocId = null; currentName = 'Untitled';
  scene = createScene({ preset: '11v11', teamA: 11, teamB: 11, half: 'full' }); index = 0;
  openSetup('new');
}
function openCard(kind, item) {
  if (kind === 'template') {
    scene = deserialize(JSON.stringify(item.scene));
    currentDocId = null; currentName = item.name;
  } else {
    const t = loadMine(item.id);
    if (!t) { showHome(); return; }
    scene = t.scene; currentDocId = t.id; currentName = t.name;
  }
  index = 0;
  enterEditor('watch');
}
function onEdit() {
  if (!currentDocId) {
    const t = newTactic(currentName + ' (copy)', scene);
    currentDocId = t.id; currentName = t.name;
    saveMine(t);
  }
  setMode('build');
}
function renameCurrent() {
  const name = (window.prompt('Name this tactic', currentName) || '').trim();
  if (!name) return;
  currentName = name; scene.name = name;
  docTitle.textContent = currentName + ' ✎';
  autosave();
}

document.getElementById('btn-edit').addEventListener('click', onEdit);
document.getElementById('btn-done').addEventListener('click', () => setMode('watch'));
document.getElementById('btn-back').addEventListener('click', showHome);
document.getElementById('btn-setup').addEventListener('click', () => openSetup('edit'));
docTitle.addEventListener('click', () => { if (mode() === 'build') renameCurrent(); });

// ---- Card-menu actions ----
function renameTactic(item) {
  const name = (window.prompt('Rename tactic', item.name) || '').trim();
  if (!name) return;
  const t = loadMine(item.id); if (!t) return;
  t.name = name; t.scene.name = name; t.updatedAt = Date.now();
  saveMine(t);
  showHome();
}
function duplicateTactic(item) {
  const s = sceneOf(item); if (!s) return;
  saveMine(newTactic((item.name || 'Untitled') + ' (copy)', s));
  showHome();
}
function exportTactic(item) {
  const s = sceneOf(item); if (!s) return;
  exportScene({ ...s, name: item.name });
}
function deleteTactic(item) {
  if (!window.confirm(`Delete "${item.name}"?`)) return;
  deleteMine(item.id);
  showHome();
}

importInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  importSceneFile(file).then((s) => {
    const t = newTactic(s.name || 'Imported', s);
    saveMine(t);
    scene = t.scene; currentDocId = t.id; currentName = t.name; index = 0;
    enterEditor('watch');
  }).catch(() => window.alert('Could not read that file.'));
  e.target.value = '';
});

// ---- Launch ----
migrateLegacyPlays();
showHome();
console.log('[goalpad] loaded');
```

- [ ] **Step 4: Replace the `#toolbar` block in `index.html`** — swap the existing `<nav id="toolbar">…</nav>` for:

```html
    <nav id="toolbar">
      <button class="chip" data-chip="A" type="button" aria-label="Team A player"><svg viewBox="-16 -16 32 32" width="24" height="24"><circle r="12" fill="#0a0a0a"></circle></svg></button>
      <button class="chip" data-chip="B" type="button" aria-label="Team B player"><svg viewBox="-16 -16 32 32" width="24" height="24"><circle r="12" fill="#ffffff" stroke="#0a0a0a" stroke-width="1.5"></circle></svg></button>
      <button class="chip" data-chip="ball" type="button" aria-label="Ball"><svg viewBox="-16 -16 32 32" width="24" height="24"><circle r="7" fill="#e10600"></circle></svg></button>
      <button class="chip" data-chip="cone" type="button" aria-label="Cone"><svg viewBox="-16 -16 32 32" width="24" height="24"><path d="M0,-11 L-9,8 L9,8 Z" fill="none" stroke="#0a0a0a" stroke-width="1.5"></path></svg></button>
      <span class="tool-divider"></span>
      <button class="tool" data-ink="arrow" type="button">Arrow</button>
      <button class="tool" data-ink="run" type="button">Run</button>
      <button class="tool" data-ink="pen" type="button">Pen</button>
      <button class="tool" data-ink="text" type="button">Text</button>
    </nav>
```

- [ ] **Step 5: Append chip + selection-chip styles to `styles.css`**

```css
/* ---- Build chips + selection chip ---- */
.chip { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 6px; border: none; border-bottom: 2px solid transparent; background: transparent; cursor: pointer; }
.chip[aria-pressed="true"] { border-bottom-color: #0a0a0a; }
.chip svg { display: block; }
.tool-divider { width: 1px; align-self: stretch; background: #0a0a0a; margin: 8px 4px; }
.sel-chip { position: fixed; z-index: 25; background: #ffffff; border: 1px solid #0a0a0a; border-radius: 0; display: flex; }
.sel-item { text-align: left; padding: 8px 14px; min-height: 40px; color: #0a0a0a; border-right: 1px solid #ececec; }
.sel-item:last-child { border-right: none; }
```

- [ ] **Step 6: Verify**

Run: `node --check js/tokens.js`, `node --check js/tools.js`, `node --check js/app.js` (no output), and `node --test` (full suite green — no pure logic changed beyond Task 1). Grep `index.html` to confirm the toolbar has `data-chip` chips + `data-ink` buttons and no `data-tool`/`data-team`/`btn-library` remain; grep `js/app.js` to confirm no `currentTool`/`currentTeam`/`getTeam` remain.

- [ ] **Step 7: Commit**

```bash
git add js/tokens.js js/tools.js js/app.js index.html styles.css
git commit -m "feat: Build piece chips, selection + contextual chip, Run tool, drag-off-pitch delete"
```

---

## Task 3: Browser verification (controller)

**Run by the controller.** Serve (a **no-store** static server to avoid ES-module cache staleness) and drive `http://localhost:8000`, hard-reloading first. Confirm in **Build**:

1. **Chips stamp:** arming each chip (2px underline) then tapping empty pitch places — A solid disc, B open disc, a **single** ball (second ball-chip tap does nothing when a ball exists), a cone triangle. Drag-from-chip drops a piece where released.
2. **Selection:** with nothing armed, tap a piece → 2px ring + **Duplicate·Delete** chip (ball → **Delete** only); Duplicate adds an offset copy; Delete removes. Tap a mark → dashed box + **Delete** chip. Tap empty → deselect.
3. **Drag-off-pitch:** drag a piece past the touchline and release → it's removed.
4. **Ink:** Arrow draws a **solid** pass; **Run** draws a **dashed** run; both animate on Play; Pen and Text still work.
5. **Autosave/persistence:** stamp/select-delete/duplicate/draw, then ‹ Library and reopen (or reload) — changes persisted.
6. **Watch stays view-only:** open a card → Watch shows no chips; tapping/dragging pieces does nothing; no selection.
7. No console errors (a synthetic-pointer `setPointerCapture` message from test injection is not an app error).

Fix any defect (dispatch a fix subagent) before completing.

---

## Self-Review Notes

- **Spec coverage:** `addBall` (Task 1); chips stamp/drag-place + team=chip + ball-singular (Task 2 tools/app/index); ink taxonomy + Run dashed (Task 2 tools); selection ring + contextual Duplicate/Delete chip + mark Delete + deselect (Task 2 tokens/tools/app); drag-off-pitch remove (Task 2 tokens); remove Select/Player/A-B/Delete (Task 2 index/app); monochrome chip/sel styles (Task 2 styles); browser verification (Task 3). All spec sections map to tasks.
- **Type consistency:** `renderTokens(svg,layerEl,scene,frame,{getMode,getArmed,selectedId,onSelect,onChange,onRemove})` and `initTools(svg,markupLayer,{getScene,getFrame,getArmed,onSceneChange,onMarkupChange,onSelectInk,onDeselect})` are defined in Task 2 and called with exactly those keys in the same app.js. `renderMarkup(layerEl,frame,selectedIndex?)` — the optional 3rd arg; existing playback call (`applyPositions`) passes 2 args (selectedIndex defaults null). `armedObj()` maps the `armed` string to the `{type,kind|tool}` object both modules expect. `data-chip`/`data-ink` in markup match the app wiring.
- **Atomicity:** the new `renderTokens`/`initTools` signatures, the `armed` toolbar markup, and the app.js that drives them all ship in **Task 2** together — no commit leaves app.js calling an old signature or referencing removed buttons (the Stage 1/2 lesson).
- **No re-render during token interaction:** token move updates the transform directly (no render); render() is only called at pointerup paths (select/remove) or from svg-level handlers (stamp/deselect), never mid-drag.
- **Watch safety:** token interaction is gated on `mode()==='build'`; `setMode` clears `armed`/`selected`; the toolbar is hidden by CSS in watch, so nothing can be armed there.
- **Deferred (Stage 3b / prior triage):** filmstrip, undo/redo; plus the orphaned dead CSS (`.saved-list`/`#lib-*`/`.team`) — fold cleanup into 3b.
