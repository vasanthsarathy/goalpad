# goalpad Redesign Stage 3b — Filmstrip + Undo/Redo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Build a frame filmstrip (tap-to-jump, long-press duplicate/delete, "+" to add) plus a Play button, and add snapshot-based undo/redo covering every Build action; fold in deferred cleanup.

**Architecture:** A pure `js/history.js` (undo/redo snapshot stacks) and a `js/filmstrip.js` (DOM), then one atomic integration: `app.js` routes every mutation through a `commit()` choke point (persist + record snapshot), adds `undo`/`redo`, and renders the filmstrip in Build; `index.html` gains ↶/↷ buttons and a `#filmbar`; `styles.css` styles them and drops dead rules; `storage.js` drops unused legacy exports. Watch's transport is unchanged.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, SVG, `node:test`. No build step.

## Global Constraints

- **History (pure `js/history.js`):** `createHistory(clone, cap = 50)` → `{ reset(state), record(state), undo(current), redo(current), canUndo(), canRedo() }`. `record` pushes the prior baseline (capped, oldest dropped) and clears redo; `undo`/`redo` move between stacks and return a **clone** of the restored state or `null`. Session-only; reset on opening a tactic.
- **Commit choke point:** every Build mutation calls `commit()` = record snapshot + autosave; `undo`/`redo` restore + autosave **without** recording. Rename uses plain persist (not undoable).
- **Filmstrip (Build):** numbered cells (`01`,`02`…), current cell 2px **red** (`#e10600`) underline; tap → jump; long-press → Duplicate·Delete popover; "+" cell adds a frame (`duplicateFrame`, copies positions, empty markup). A **Play** button previews in place. Watch keeps its scrub transport. `+Frame`/`🗑Frame` buttons removed.
- **Undo controls:** ↶/↷ in the Build top bar, disabled when the stack is empty; a two-finger tap on the board also undoes (Build-only, best-effort).
- Monochrome idiom (paper `#ffffff`, ink `#0a0a0a`, mute `#949494`, signal `#e10600`, square corners, engraved labels, ink hairlines). Tap targets `min-height: 40px`.
- **Cleanup:** remove dead CSS (`#team-toggle`/`.team`, `.saved-list`/`#lib-*`/`.import-label`, `#btn-del-step:disabled`, the removed watch show-hide of the frame buttons) and unused legacy exports `saveNamed`/`loadNamed`/`deleteNamed` (keep `listSaved`/`KEY_PREFIX`).
- No change to the scene model/playback/Home/library data; existing tests stay green.

---

## File Structure

```
js/history.js       # NEW: pure undo/redo snapshot stacks
test/history.test.js# NEW: history unit tests
js/filmstrip.js     # NEW: DOM filmstrip (cells + "+" + long-press menu)
js/app.js           # commit choke point, undo/redo, filmstrip wiring, drop frame-button handlers
index.html          # ↶/↷ buttons; split bottom bar (#stepsbar transport + #filmbar); drop +Frame/🗑Frame
styles.css          # filmstrip + undo styles + show-hide; remove dead rules
js/storage.js       # remove saveNamed/loadNamed/deleteNamed
```

---

## Task 1: Pure undo/redo history

**Files:**
- Create: `js/history.js`
- Create: `test/history.test.js`

**Interfaces:**
- Produces: `createHistory(clone, cap = 50)` → `{ reset, record, undo, redo, canUndo, canRedo }`.

- [ ] **Step 1: Write the failing tests** — create `test/history.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistory } from '../js/history.js';

const clone = (o) => JSON.parse(JSON.stringify(o));

test('reset clears the stacks', () => {
  const h = createHistory(clone);
  h.reset({ n: 0 });
  assert.equal(h.canUndo(), false);
  assert.equal(h.canRedo(), false);
});

test('record then undo returns the prior state; redo replays forward', () => {
  const h = createHistory(clone);
  h.reset({ n: 0 });
  h.record({ n: 1 });
  h.record({ n: 2 });
  assert.equal(h.canUndo(), true);
  assert.deepEqual(h.undo({ n: 2 }), { n: 1 });
  assert.deepEqual(h.undo({ n: 1 }), { n: 0 });
  assert.equal(h.canUndo(), false);
  assert.deepEqual(h.redo({ n: 0 }), { n: 1 });
  assert.deepEqual(h.redo({ n: 1 }), { n: 2 });
  assert.equal(h.canRedo(), false);
});

test('undo on an empty stack returns null', () => {
  const h = createHistory(clone);
  h.reset({ n: 0 });
  assert.equal(h.undo({ n: 0 }), null);
});

test('a new record after undo clears the redo stack', () => {
  const h = createHistory(clone);
  h.reset({ n: 0 });
  h.record({ n: 1 });
  h.undo({ n: 1 });
  assert.equal(h.canRedo(), true);
  h.record({ n: 9 });
  assert.equal(h.canRedo(), false);
});

test('returned states are clones (mutating them does not corrupt history)', () => {
  const h = createHistory(clone);
  h.reset({ n: 0 });
  h.record({ n: 1 });
  const u = h.undo({ n: 1 });
  u.n = 42;
  assert.deepEqual(h.redo({ n: 42 }), { n: 1 });
});

test('respects the cap on the undo stack', () => {
  const h = createHistory(clone, 3);
  h.reset({ n: 0 });
  for (let i = 1; i <= 10; i++) h.record({ n: i });
  let count = 0;
  while (h.undo({ n: -1 })) count++;
  assert.equal(count, 3);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/history.test.js`
Expected: FAIL — `createHistory` is not exported.

- [ ] **Step 3: Create `js/history.js`**

```javascript
// history.js — PURE snapshot undo/redo stacks. No DOM. The caller supplies a clone(state) fn.
export function createHistory(clone, cap = 50) {
  let baseline = null;
  const undoStack = [];
  const redoStack = [];
  return {
    reset(state) { baseline = clone(state); undoStack.length = 0; redoStack.length = 0; },
    record(state) {
      undoStack.push(baseline);
      if (undoStack.length > cap) undoStack.shift();
      redoStack.length = 0;
      baseline = clone(state);
    },
    undo(current) {
      if (!undoStack.length) return null;
      redoStack.push(clone(current));
      baseline = undoStack.pop();
      return clone(baseline);
    },
    redo(current) {
      if (!redoStack.length) return null;
      undoStack.push(clone(current));
      baseline = redoStack.pop();
      return clone(baseline);
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/history.test.js` then `node --test`.
Expected: PASS — history tests pass; full suite green.

- [ ] **Step 5: Commit**

```bash
git add js/history.js test/history.test.js
git commit -m "feat: pure snapshot undo/redo history"
```

---

## Task 2: Filmstrip module

**Files:**
- Create: `js/filmstrip.js`

**Interfaces:**
- Produces: `renderFilmstrip(el, { count, current, onJump, onAdd, onDuplicate, onDelete })` — renders `count` numbered cells (current underlined) + a "+" cell; tap → `onJump(i)`; long-press → a Duplicate/Delete popover calling `onDuplicate(i)`/`onDelete(i)`; "+" → `onAdd()`.

- [ ] **Step 1: Create `js/filmstrip.js`**

```javascript
// filmstrip.js — DOM: Build frame filmstrip (numbered cells + "+"), with a long-press Duplicate/Delete menu.
const LONG_PRESS_MS = 450;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function renderFilmstrip(root, { count, current, onJump, onAdd, onDuplicate, onDelete }) {
  closeMenu();
  root.replaceChildren();
  let currentCell = null;
  for (let i = 0; i < count; i++) {
    const cell = el('button', 'film-cell', String(i + 1).padStart(2, '0'));
    cell.type = 'button';
    if (i === current) { cell.classList.add('current'); currentCell = cell; }
    let timer = null, longFired = false;
    cell.addEventListener('pointerdown', () => {
      longFired = false;
      timer = setTimeout(() => { longFired = true; openMenu(cell, i, onDuplicate, onDelete); }, LONG_PRESS_MS);
    });
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
    cell.addEventListener('pointerup', cancel);
    cell.addEventListener('pointerleave', cancel);
    cell.addEventListener('pointercancel', cancel);
    cell.addEventListener('click', () => { if (!longFired) onJump(i); });
    root.appendChild(cell);
  }
  const add = el('button', 'film-add', '+');
  add.type = 'button';
  add.addEventListener('click', () => onAdd());
  root.appendChild(add);
  if (currentCell) currentCell.scrollIntoView({ inline: 'nearest', block: 'nearest' });
}

let menuEl = null;
function closeMenu() {
  if (menuEl) { menuEl.remove(); menuEl = null; document.removeEventListener('pointerdown', outside, true); }
}
function outside(e) { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }
function openMenu(anchor, i, onDuplicate, onDelete) {
  closeMenu();
  menuEl = el('div', 'film-menu');
  const mk = (label, fn) => {
    const b = el('button', 'film-menu-item', label); b.type = 'button';
    b.addEventListener('click', () => { closeMenu(); fn(i); });
    menuEl.append(b);
  };
  mk('Duplicate', onDuplicate);
  mk('Delete', onDelete);
  const r = anchor.getBoundingClientRect();
  menuEl.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 148)) + 'px';
  menuEl.style.bottom = (window.innerHeight - r.top + 6) + 'px';
  document.body.append(menuEl);
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
}
```

- [ ] **Step 2: Verify**

Run: `node --check js/filmstrip.js` (no output) and `node --test` (full suite green — no logic changed). The module is inert until `app.js` wires it in Task 3.

- [ ] **Step 3: Commit**

```bash
git add js/filmstrip.js
git commit -m "feat: Build frame filmstrip module"
```

---

## Task 3: Integration — commit/undo/redo, filmstrip wiring, cleanup

**Files:**
- Modify: `index.html`
- Rewrite: `js/app.js`
- Rewrite: `styles.css`
- Modify: `js/storage.js`

**Interfaces:**
- Consumes: `createHistory` (Task 1), `renderFilmstrip` (Task 2); existing scene/tools/tokens/steps/storage/home.

- [ ] **Step 1: Edit `index.html`** — two changes, nothing else:

(a) Replace the `.top-actions` block with (adds ↶/↷):
```html
      <div class="top-actions">
        <button id="btn-edit" type="button">Edit</button>
        <button id="btn-undo" type="button" aria-label="Undo">↶</button>
        <button id="btn-redo" type="button" aria-label="Redo">↷</button>
        <button id="btn-setup" type="button">Setup</button>
        <button id="btn-done" type="button">Done</button>
      </div>
```

(b) Replace the entire `<footer id="stepsbar">…</footer>` with the transport (no +Frame/🗑Frame) plus a new `#filmbar`:
```html
    <footer id="stepsbar">
      <button id="btn-step-prev" type="button">◀</button>
      <input id="scrub" type="range" min="0" max="0" step="0.01" value="0">
      <button id="btn-step-next" type="button">▶</button>
      <span id="step-label">1 / 1</span>
      <button id="btn-play" type="button">▶ Play</button>
    </footer>
    <footer id="filmbar">
      <div id="filmstrip"></div>
      <button id="btn-play-build" type="button">▶ Play</button>
    </footer>
```

- [ ] **Step 2: Rewrite `js/app.js`** (replace entire file)

```javascript
// app.js — shell (Home + Watch/Build + autosave) with Build tools, selection, filmstrip, and undo/redo.
import { createScene, duplicateFrame, deleteFrame, addPlayer, addCone, removePiece, pieceById } from './scene.js';
import { renderField } from './field.js';
import { renderTokens, setTokenPositions } from './tokens.js';
import { renderMarkup, initTools } from './tools.js';
import { createStepController, activeMarkupIndex } from './steps.js';
import { deserialize, exportScene, importSceneFile,
         newTactic, saveMine, listMine, loadMine, deleteMine, migrateLegacyPlays } from './storage.js';
import { LIBRARY } from './library.js';
import { renderHome } from './home.js';
import { createHistory } from './history.js';
import { renderFilmstrip } from './filmstrip.js';

const homeEl = document.getElementById('home');
const editorEl = document.getElementById('editor');
const docTitle = document.getElementById('doc-title');
const board = document.getElementById('board');
const layerField = document.getElementById('layer-field');
const layerAnnotations = document.getElementById('layer-annotations');
const layerTokens = document.getElementById('layer-tokens');
const importInput = document.getElementById('import-file');
const filmstripEl = document.getElementById('filmstrip');
const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');

let scene = createScene({ preset: '11v11', teamA: 11, teamB: 11, half: 'full' });
let index = 0;
let armed = null;      // null | 'chip:A|B|ball|cone' | 'ink:arrow|run|pen|text'
let selected = null;   // null | {type:'piece',id} | {type:'ink',index}
let selChip = null;
let currentDocId = null;
let currentName = 'Untitled';

const clone = (s) => JSON.parse(JSON.stringify(s));
const history = createHistory(clone);

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
    onChange: commit,
    onRemove: (id) => { removePiece(scene, id); clearSelection(); commit(); },
  });
  renderMarkup(layerAnnotations, frame(), selInkIndex());
  refreshScrubRange();
  if (mode() === 'build') {
    renderFilmstrip(filmstripEl, {
      count: scene.frames.length,
      current: index,
      onJump: (i) => settleTo(i),
      onAdd: addFrame,
      onDuplicate: dupFrame,
      onDelete: delFrame,
    });
  }
}

// ---- Persistence + undo history ----
function persist() {
  if (!currentDocId) return;
  scene.name = currentName;
  saveMine({ id: currentDocId, name: currentName, scene, updatedAt: Date.now() });
}
function commit() { history.record(scene); refreshUndoUI(); persist(); }
function refreshUndoUI() {
  btnUndo.disabled = !history.canUndo();
  btnRedo.disabled = !history.canRedo();
}
function undo() {
  const s = history.undo(scene);
  if (!s) return;
  scene = s; index = Math.min(index, scene.frames.length - 1);
  dropSelection(); render(); persist(); refreshUndoUI();
}
function redo() {
  const s = history.redo(scene);
  if (!s) return;
  scene = s; index = Math.min(index, scene.frames.length - 1);
  dropSelection(); render(); persist(); refreshUndoUI();
}
btnUndo.addEventListener('click', undo);
btnRedo.addEventListener('click', redo);
// two-finger tap → undo (Build only; best-effort)
let twoFinger = false, tfStart = 0;
board.addEventListener('touchstart', (e) => { twoFinger = e.touches.length === 2; tfStart = e.timeStamp; });
board.addEventListener('touchend', (e) => {
  if (twoFinger && e.touches.length === 0 && (e.timeStamp - tfStart) < 400 && mode() === 'build') undo();
  twoFinger = false;
});

initTools(board, layerAnnotations, {
  getScene: () => scene,
  getFrame: () => frame(),
  getArmed: armedObj,
  getMode: mode,
  onSceneChange: () => { render(); commit(); },
  onMarkupChange: () => { renderMarkup(layerAnnotations, frame(), selInkIndex()); commit(); },
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
function dropSelection() { selected = null; closeSelChip(); }
function clearSelection() { dropSelection(); render(); }

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
  render(); commit(); openSelChipForPiece(id);
}
function deletePiece(id) { removePiece(scene, id); clearSelection(); commit(); }
function deleteInk(i) { frame().markup.splice(i, 1); clearSelection(); commit(); }

// ---- Steps / playback ----
const scrub = document.getElementById('scrub');
const stepLabel = document.getElementById('step-label');

function updateStepLabel(pos) { stepLabel.textContent = `${Math.round(pos) + 1} / ${scene.frames.length}`; }
function refreshScrubRange() {
  scrub.max = String(Math.max(0, scene.frames.length - 1));
  scrub.value = String(index);
  updateStepLabel(index);
}
function applyPositions(positionsMap, pos) {
  setTokenPositions(layerTokens, positionsMap);
  const mi = Math.max(0, Math.min(scene.frames.length - 1, activeMarkupIndex(pos)));
  renderMarkup(layerAnnotations, scene.frames[mi]);
  scrub.value = String(pos);
  updateStepLabel(pos);
}
function settleTo(i) { dropSelection(); index = Math.max(0, Math.min(scene.frames.length - 1, Math.round(i))); render(); }

const steps = createStepController({ getScene: () => scene, applyPositions, onDone: (i) => settleTo(i) });

// ---- Frame ops (filmstrip) ----
function addFrame() { dropSelection(); index = duplicateFrame(scene, index); render(); commit(); }
function dupFrame(i) { dropSelection(); index = duplicateFrame(scene, i); render(); commit(); }
function delFrame(i) { dropSelection(); if (deleteFrame(scene, i)) { index = Math.min(index, scene.frames.length - 1); render(); commit(); } }

document.getElementById('btn-play').addEventListener('click', () => { dropSelection(); steps.play(); });
document.getElementById('btn-play-build').addEventListener('click', () => { dropSelection(); steps.play(); });
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
    dropSelection(); render(); commit();
  }
});

// ---- Navigation / surfaces ----
function showHome() {
  dropSelection();
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
  history.reset(scene); refreshUndoUI();
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
  persist();
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

- [ ] **Step 3: Rewrite `styles.css`** (replace entire file — cleaned + filmstrip/undo styles)

```css
/* Jost — self-hosted */
@font-face { font-family: 'Jost'; font-weight: 300; font-style: normal; font-display: swap; src: url('fonts/jost-300.woff2') format('woff2'); }
@font-face { font-family: 'Jost'; font-weight: 400; font-style: normal; font-display: swap; src: url('fonts/jost-400.woff2') format('woff2'); }
@font-face { font-family: 'Jost'; font-weight: 500; font-style: normal; font-display: swap; src: url('fonts/jost-500.woff2') format('woff2'); }

* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  display: flex; flex-direction: column; height: 100vh;
  font-family: 'Jost', 'Space Grotesk', Futura, system-ui, sans-serif; font-weight: 400;
  overflow: hidden; touch-action: none;
  -webkit-user-select: none; user-select: none;
  background: #ffffff; color: #0a0a0a;
  -webkit-font-smoothing: antialiased;
}
#topbar, #toolbar, #stepsbar, #filmbar {
  display: flex; align-items: center; gap: 16px;
  padding: 10px 16px; background: #ffffff; flex: 0 0 auto;
}
#topbar { justify-content: space-between; border-bottom: 1px solid #0a0a0a; }
#toolbar { justify-content: center; flex-wrap: wrap; gap: 22px; border-top: 1px solid #0a0a0a; }
#stepsbar { gap: 16px; border-top: 1px solid #0a0a0a; }
#filmbar { gap: 12px; border-top: 1px solid #0a0a0a; }
.brand { font-weight: 300; font-size: 16px; letter-spacing: 0.1em; text-transform: lowercase; color: #0a0a0a; }
.brand .dot { display: inline-block; width: 5px; height: 5px; background: #e10600; border-radius: 50%; margin-left: 3px; vertical-align: baseline; }
.top-actions { display: flex; gap: 22px; }
#stage { flex: 1 1 auto; min-height: 0; display: flex; }
#board { width: 100%; height: 100%; display: block; background: #ffffff; touch-action: none; -webkit-tap-highlight-color: transparent; }
#scrub { flex: 1 1 auto; accent-color: #e10600; }

button, .tool {
  font-family: inherit; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 500;
  padding: 8px 0; min-height: 40px;
  border: none; border-bottom: 2px solid transparent; background: transparent; color: #949494; cursor: pointer;
}
.tool[aria-pressed="true"] { color: #0a0a0a; border-bottom-color: #0a0a0a; }
button:active { opacity: 0.6; }
#step-label { min-width: 84px; text-align: center; font-variant-numeric: tabular-nums; color: #949494; font-size: 12px; letter-spacing: 0.04em; text-transform: none; border: none; }
.top-actions button { color: #949494; }

.panel { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(10,10,10,0.28); z-index: 10; }
.panel[hidden] { display: none; }
.panel-card { background: #ffffff; padding: 24px; border: 1px solid #0a0a0a; border-radius: 0; width: min(92vw, 380px); display: flex; flex-direction: column; gap: 16px; }
.panel-card h2 { margin: 0; font-weight: 400; font-size: 20px; letter-spacing: 0.01em; color: #0a0a0a; }
.panel-card label { display: flex; justify-content: space-between; align-items: center; gap: 12px; color: #0a0a0a; font-size: 14px; }
.panel-card select, .panel-card input[type="number"], .panel-card input[type="text"] { font-family: inherit; font-size: 14px; padding: 8px; border-radius: 0; border: 1px solid #0a0a0a; min-width: 120px; background: #fff; color: #0a0a0a; }
.panel-note { font-size: 12.5px; color: #949494; margin: 0; }
.panel-actions { display: flex; justify-content: flex-end; gap: 8px; }
.panel-actions button { border: 1px solid #0a0a0a; border-radius: 0; background: #fff; color: #0a0a0a; padding: 8px 12px; min-height: 40px; border-bottom: 1px solid #0a0a0a; }

@media (max-width: 640px) {
  .brand { font-size: 15px; }
  #toolbar { gap: 14px; }
}

/* ---- surfaces ---- */
#home, #editor { flex: 1 1 auto; min-height: 0; }
#home { display: flex; flex-direction: column; overflow-y: auto; }
#editor { display: flex; flex-direction: column; }
#home[hidden], #editor[hidden] { display: none; }

/* ---- home ---- */
.home-head { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #0a0a0a; }
.home-actions { display: flex; gap: 22px; }
.home-action { color: #0a0a0a; }
.shelf { padding: 8px 16px 16px; }
.shelf-label { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #949494; font-weight: 500; margin: 16px 0 8px; }
.group-label { font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #949494; font-weight: 500; margin: 12px 0 6px; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
.card { display: flex; align-items: flex-end; min-height: 68px; padding: 12px; border: 1px solid #0a0a0a; border-radius: 0; background: #ffffff; text-transform: none; letter-spacing: normal; }
.card:active { background: #fafafa; }
.card-name { font-size: 13px; font-weight: 400; color: #0a0a0a; text-align: left; }
.empty { font-size: 14px; color: #949494; padding: 8px 0; }

/* ---- card menu ---- */
.card-menu { position: fixed; z-index: 20; background: #ffffff; border: 1px solid #0a0a0a; border-radius: 0; display: flex; flex-direction: column; min-width: 160px; }
.menu-item { text-align: left; padding: 10px 14px; min-height: 40px; color: #0a0a0a; border-bottom: 1px solid #ececec; }
.menu-item:last-child { border-bottom: none; }

/* ---- editor contextual top bar ---- */
.doc-title { flex: 1; text-align: center; font-size: 14px; color: #0a0a0a; text-transform: none; letter-spacing: normal; }
#editor #topbar button { color: #0a0a0a; }
#editor[data-mode="build"] .doc-title { cursor: pointer; }
#btn-undo, #btn-redo { font-size: 16px; }
#btn-undo:disabled, #btn-redo:disabled { opacity: 0.3; cursor: default; }

/* ---- watch/build show-hide ---- */
#editor[data-mode="watch"] #toolbar { display: none; }
#editor[data-mode="watch"] #btn-setup,
#editor[data-mode="watch"] #btn-done,
#editor[data-mode="watch"] #btn-undo,
#editor[data-mode="watch"] #btn-redo { display: none; }
#editor[data-mode="build"] #btn-edit { display: none; }
#editor[data-mode="watch"] #filmbar { display: none; }
#editor[data-mode="build"] #stepsbar { display: none; }

/* ---- Build chips + selection chip ---- */
.chip { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 6px; border: none; border-bottom: 2px solid transparent; background: transparent; cursor: pointer; }
.chip[aria-pressed="true"] { border-bottom-color: #0a0a0a; }
.chip svg { display: block; }
.tool-divider { width: 1px; align-self: stretch; background: #0a0a0a; margin: 8px 4px; }
.sel-chip { position: fixed; z-index: 25; background: #ffffff; border: 1px solid #0a0a0a; border-radius: 0; display: flex; }
.sel-item { text-align: left; padding: 8px 14px; min-height: 40px; color: #0a0a0a; border-right: 1px solid #ececec; }
.sel-item:last-child { border-right: none; }

/* ---- Build filmstrip ---- */
#filmstrip { display: flex; gap: 6px; overflow-x: auto; flex: 1 1 auto; }
.film-cell { font-size: 12px; font-variant-numeric: tabular-nums; color: #949494; min-height: 40px; padding: 8px 10px; border: none; border-bottom: 2px solid transparent; background: transparent; letter-spacing: 0.04em; text-transform: none; }
.film-cell.current { color: #0a0a0a; border-bottom-color: #e10600; }
.film-add { font-size: 16px; color: #0a0a0a; min-height: 40px; padding: 8px 12px; border: none; background: transparent; }
.film-menu { position: fixed; z-index: 25; background: #ffffff; border: 1px solid #0a0a0a; border-radius: 0; display: flex; flex-direction: column; min-width: 140px; }
.film-menu-item { text-align: left; padding: 10px 14px; min-height: 40px; color: #0a0a0a; border-bottom: 1px solid #ececec; }
.film-menu-item:last-child { border-bottom: none; }
```

- [ ] **Step 4: Remove the dead legacy exports from `js/storage.js`** — delete these three functions (keep `serialize`/`deserialize`, `listSaved`, `KEY_PREFIX`, the Mine layer, `exportScene`/`importSceneFile`, and `migrateLegacyPlays`):

```javascript
export function saveNamed(name, scene) {
  localStorage.setItem(KEY_PREFIX + name, serialize({ ...scene, name }));
}
```
```javascript
export function loadNamed(name) {
  const str = localStorage.getItem(KEY_PREFIX + name);
  return str ? deserialize(str) : null;
}
```
```javascript
export function deleteNamed(name) {
  localStorage.removeItem(KEY_PREFIX + name);
}
```
(Remove exactly those three exported functions. Do not touch `listSaved` — `migrateLegacyPlays` still uses it — or any other export.)

- [ ] **Step 5: Verify**

Run: `node --check js/app.js` (no output) and `node --test` (full suite green — the removed `saveNamed`/`loadNamed`/`deleteNamed` are not referenced by any test or by `app.js`; grep `js/` and `test/` to confirm zero references before/after). Grep `index.html` to confirm `#btn-undo`/`#btn-redo`/`#filmbar`/`#filmstrip`/`#btn-play-build` are present and `#btn-add-step`/`#btn-del-step` are gone. Grep `styles.css` to confirm no `#team-toggle`/`.team`/`.saved-list`/`.lib-`/`.import-label` rules remain.

- [ ] **Step 6: Commit**

```bash
git add index.html js/app.js styles.css js/storage.js
git commit -m "feat: Build filmstrip + undo/redo; retire +Frame/Delete buttons; cleanup dead code"
```

---

## Task 4: Browser verification (controller)

**Run by the controller** with a **no-store** static server; hard-reload first. Confirm in **Build**:

1. **Filmstrip:** one cell per frame with the current cell **red-underlined**; tap a cell → jumps (board updates); the **"+"** cell adds a frame; long-press a cell → **Duplicate · Delete** (delete can't drop below one frame); the **Play** button previews the animation in place.
2. **Undo/redo:** ↶ and ↷ are disabled with empty history; after a stamp / move / delete / draw / add-frame, ↶ undoes it (and ↷ replays) — verify each of those five action types; a **two-finger tap** on the board undoes; ↶/↷ enable/disable correctly.
3. **Persistence:** an undone state persists (‹ Library then reopen shows the undone result); opening a **different** tactic resets history (↶ disabled).
4. **Watch unchanged:** the scrub transport (Play / scrub / step / `N / M`) still works; no filmstrip or ↶/↷ in Watch.
5. **Cleanup:** no visual regressions (Setup panel, Home cards, chips, selection chip all still styled); no console errors.

Fix any defect (dispatch a fix subagent) before completing.

---

## Self-Review Notes

- **Spec coverage:** pure history (Task 1); filmstrip module (Task 2); filmstrip wiring + undo/redo + commit choke point + two-finger + ↶/↷ + Play-in-Build + retire +Frame/🗑Frame + storage/CSS cleanup (Task 3); browser verification (Task 4). All spec sections map to tasks.
- **Type consistency:** `createHistory(clone, cap)` API and `renderFilmstrip(el, {count,current,onJump,onAdd,onDuplicate,onDelete})` are defined in Tasks 1–2 and called with exactly those shapes in Task 3's app.js. `commit()` (record+persist) vs `persist()` (save-only) are used consistently: mutations → `commit`, undo/redo/rename → `persist`. Filmstrip callbacks `addFrame`/`dupFrame`/`delFrame` are function declarations (hoisted) referenced inside `render()`.
- **Atomicity:** the new markup (↶/↷, `#filmbar`), the app.js that references it, the CSS that shows/hides it, and the storage export removals all ship in **Task 3** together — no commit leaves app.js referencing a removed element or a removed export (the Stage 1/2/3a lesson). Tasks 1–2 add inert-until-wired modules.
- **No re-render during interaction:** filmstrip re-renders only inside `render()` (called at pointerup/settle/mutation), never during a cell's own long-press timer; the long-press menu closes before its action re-renders. Token/ink interaction unchanged from 3a.
- **History correctness:** `commit` records the post-mutation scene as baseline after pushing the prior; `undo`/`redo` restore a clone and `persist` it without re-recording; `history.reset` runs on every editor entry (openCard/setup-new/import via `enterEditor`), so history is per-session. Undo is Build-only (the ↶/↷ buttons are hidden in Watch and two-finger checks `mode()==='build'`).
- **Deferred:** none — this stage folds in the previously-deferred CSS/export cleanup.
