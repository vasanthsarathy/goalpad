# goalpad Home & Nav (Part A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Launch goalpad into an editable persistent scratchpad, make the `goalpad` logo the home button, add a Help guide, and restructure the top bar (Library / Help / Save) — with the existing Library reached via a button instead of being the landing.

**Architecture:** A persistent scratchpad scene lives in `localStorage['goalpad:scratch']`; `currentDocId==='scratch'` routes autosave there. The app launches into the editor on the scratchpad (Build). The old `#home` (Library) surface is kept but reached via a Library button with a Close; a new Help panel is added. Part B rebuilds the Library itself.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, SVG, localStorage, `node:test`. No build step.

## Global Constraints

- **Scratchpad:** stored in `localStorage['goalpad:scratch']`; autosaves on every edit; first run = an empty pitch (default **7v7 full**, 0 players + ball, 1 frame, name "Scratchpad").
- **`currentDocId`:** `'scratch'` → autosave to the scratch slot; a uuid → a Mine record; `null` → template preview (no autosave).
- **Nav:** the `goalpad●` logo (top-left) is the **home** button → loads the scratchpad in Build. **Library** and **Help** buttons in the top bar (both modes). The old "‹ Library" back button is removed.
- **Top bar — Build:** `goalpad●` · title✎ · Library · Help · Setup · ↶ ↷ · Save · Done. **Watch:** `goalpad●` · title · Library · Help · Edit.
- **Save** copies the current board into Mine as a named play (deep copy); the board stays put. **New/Clear** ("Empty pitch") lives in the Setup sheet and resets the scratchpad after a confirm.
- Monochrome idiom (paper `#ffffff`, ink `#0a0a0a`, mute `#949494`, signal `#e10600`, square corners, engraved labels, ink hairlines); tap targets `min-height: 40px`.
- No change to the scene model beyond `emptyScratchScene`, playback, or the Build editor. Existing tests stay green.

---

## File Structure

```
js/scene.js          # + emptyScratchScene() pure factory
js/storage.js        # + loadScratch()/saveScratch() over goalpad:scratch
test/scene.test.js   # + emptyScratchScene test
js/home.js           # + onClose callback → a Close button on the Library surface
js/app.js            # launch→scratchpad; logo→home; Library/Help/Save/New wiring; scratch autosave routing
index.html           # new top bar; #panel-help; Setup "Empty pitch" button
styles.css           # logo button, Help panel, Save show-hide
```

---

## Task 1: Scratchpad helpers

**Files:**
- Modify: `js/scene.js`
- Modify: `js/storage.js`
- Modify: `test/scene.test.js`

**Interfaces:**
- Produces: `emptyScratchScene()` (scene.js) → a fresh empty scene; `loadScratch()` (storage.js) → the persisted scratch scene or `null`; `saveScratch(scene)` (storage.js).

- [ ] **Step 1: Write the failing test** — append to `test/scene.test.js`:

```javascript
import { emptyScratchScene } from '../js/scene.js';

test('emptyScratchScene: 7v7 full, no players, ball, one frame, named Scratchpad', () => {
  const s = emptyScratchScene();
  assert.equal(s.field.preset, '7v7');
  assert.equal(s.field.half, 'full');
  assert.equal(s.name, 'Scratchpad');
  assert.equal(s.frames.length, 1);
  assert.equal(s.pieces.filter((p) => p.kind === 'player').length, 0);
  assert.ok(s.pieces.some((p) => p.kind === 'ball'));
});
```
(`test/scene.test.js` already imports `test`/`assert`/`createScene`/`addBall`; add only the `emptyScratchScene` import.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/scene.test.js`
Expected: FAIL — `emptyScratchScene` is not exported.

- [ ] **Step 3: Add `emptyScratchScene` to `js/scene.js`** — append at the end:

```javascript
export function emptyScratchScene() {
  return createScene({ preset: '7v7', teamA: 0, teamB: 0, half: 'full', name: 'Scratchpad' });
}
```

- [ ] **Step 4: Add the scratch slot to `js/storage.js`** — append at the end:

```javascript
// ---- Scratchpad (the home board) ----
const SCRATCH_KEY = 'goalpad:scratch';

export function saveScratch(scene) {
  localStorage.setItem(SCRATCH_KEY, serialize(scene));
}

export function loadScratch() {
  const str = localStorage.getItem(SCRATCH_KEY);
  if (!str) return null;
  try { return deserialize(str); } catch { return null; }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test test/scene.test.js` then `node --test` (full suite).
Expected: PASS — new test passes; full suite green. (`loadScratch`/`saveScratch` use localStorage and are browser-verified, not unit-tested.)

- [ ] **Step 6: Commit**

```bash
git add js/scene.js js/storage.js test/scene.test.js
git commit -m "feat: scratchpad scene factory + storage slot"
```

---

## Task 2: Shell — scratchpad home, logo, Library/Help/Save nav

**Files:**
- Modify: `index.html`
- Rewrite: `js/app.js`
- Modify: `js/home.js`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `emptyScratchScene` (Task 1), `loadScratch`/`saveScratch` (Task 1); existing scene/tools/tokens/steps/storage/history/filmstrip/home modules.

- [ ] **Step 1: Edit `index.html`** — three changes:

(a) Replace the entire `<header id="topbar">…</header>` with:
```html
    <header id="topbar">
      <button id="btn-home" class="brand" type="button">goalpad<span class="dot"></span></button>
      <span id="doc-title" class="doc-title"></span>
      <div class="top-actions">
        <button id="btn-library" type="button">Library</button>
        <button id="btn-help" type="button">Help</button>
        <button id="btn-edit" type="button">Edit</button>
        <button id="btn-setup" type="button">Setup</button>
        <button id="btn-undo" type="button" aria-label="Undo">↶</button>
        <button id="btn-redo" type="button" aria-label="Redo">↷</button>
        <button id="btn-save" type="button">Save</button>
        <button id="btn-done" type="button">Done</button>
      </div>
    </header>
```

(b) In `#panel-setup`, replace its `.panel-actions` block with (adds "Empty pitch"):
```html
      <div class="panel-actions">
        <button id="btn-empty-pitch" type="button">Empty pitch</button>
        <button id="setup-cancel" type="button">Cancel</button>
        <button id="setup-apply" type="button">Apply</button>
      </div>
```

(c) Add the Help panel immediately before `<input id="import-file" …>`:
```html
  <div id="panel-help" class="panel" hidden>
    <div class="panel-card help-card">
      <h2>How to use goalpad</h2>
      <div class="help-body">
        <h3>The board</h3>
        <p>goalpad opens on your <b>scratchpad</b> — a working board that's always here and saves itself. Tap the <b>goalpad</b> logo any time to come back to it. Use <b>Setup → Empty pitch</b> to start it fresh.</p>
        <h3>Placing pieces</h3>
        <p>In Build, the row of chips is: solid disc (Team A), open disc (Team B), red dot (ball), triangle (cone). <b>Tap a chip</b> to arm it, then tap the pitch to drop pieces; or <b>drag a chip</b> onto the pitch. Drag a piece to move it; drag it off the pitch to remove it. The team is the chip you pick.</p>
        <h3>Selecting &amp; deleting</h3>
        <p>With no chip armed, <b>tap a piece or mark</b> to select it — a ring and a small <b>Duplicate / Delete</b> chip appear. Tap empty space to deselect.</p>
        <h3>Drawing</h3>
        <p><b>Arrow</b> is a pass, <b>Run</b> is a dashed off-ball run, <b>Pen</b> is freehand, <b>Text</b> adds a label. Arm one and drag on the pitch.</p>
        <h3>Frames &amp; animation</h3>
        <p>The <b>filmstrip</b> at the bottom holds your frames. Tap a frame to jump to it, tap <b>+</b> to add one (it copies the current positions), long-press a frame to duplicate or delete it. <b>Play</b> animates through them. <b>↶ / ↷</b> undo and redo.</p>
        <h3>Watch vs Build</h3>
        <p><b>Build</b> is for editing; <b>Done</b> switches to <b>Watch</b> to preview (just the pitch and playback). <b>Edit</b> switches back.</p>
        <h3>Library</h3>
        <p><b>Library</b> holds built-in tactics &amp; drills plus the plays you save. Tap <b>Save</b> to keep the current board in your Library with a name. Open a play to load it; built-in ones make a copy when you edit.</p>
      </div>
      <div class="panel-actions">
        <button id="help-close" type="button">Close</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 2: Add the `onClose` Close button in `js/home.js`** — in `renderHome`, (a) add `onClose` to the destructured callbacks, and (b) append a Close button to the header actions. Change the header-actions block:
```javascript
  const actions = el('div', 'home-actions');
  const newBtn = el('button', 'home-action', 'New'); newBtn.type = 'button';
  newBtn.addEventListener('click', () => onNew());
  const importBtn = el('button', 'home-action', 'Import'); importBtn.type = 'button';
  importBtn.addEventListener('click', () => onImport());
  actions.append(newBtn, importBtn);
```
to:
```javascript
  const actions = el('div', 'home-actions');
  const newBtn = el('button', 'home-action', 'New'); newBtn.type = 'button';
  newBtn.addEventListener('click', () => onNew());
  const importBtn = el('button', 'home-action', 'Import'); importBtn.type = 'button';
  importBtn.addEventListener('click', () => onImport());
  const closeBtn = el('button', 'home-action', 'Close'); closeBtn.type = 'button';
  closeBtn.addEventListener('click', () => onClose());
  actions.append(newBtn, importBtn, closeBtn);
```
and change the destructure line at the top of `renderHome` to include `onClose`:
```javascript
  const { templates, mine, onOpen, onNew, onImport, onRename, onDuplicate, onExport, onDelete, onClose } = cbs;
```

- [ ] **Step 3: Rewrite `js/app.js`** (replace entire file)

```javascript
// app.js — shell: scratchpad home + Library/Help nav + Watch/Build editor + autosave + undo/redo.
import { createScene, duplicateFrame, deleteFrame, addPlayer, addCone, removePiece, pieceById, emptyScratchScene } from './scene.js';
import { renderField } from './field.js';
import { renderTokens, setTokenPositions } from './tokens.js';
import { renderMarkup, initTools } from './tools.js';
import { createStepController, activeMarkupIndex } from './steps.js';
import { deserialize, exportScene, importSceneFile,
         newTactic, saveMine, listMine, loadMine, deleteMine, migrateLegacyPlays,
         loadScratch, saveScratch } from './storage.js';
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

let scene = emptyScratchScene();
let index = 0;
let armed = null;      // null | 'chip:A|B|ball|cone' | 'ink:arrow|run|pen|text'
let selected = null;   // null | {type:'piece',id} | {type:'ink',index}
let selChip = null;
let currentDocId = 'scratch';   // 'scratch' | Mine uuid | null (template preview)
let currentName = 'Scratchpad';

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
      count: scene.frames.length, current: index,
      onJump: (i) => settleTo(i), onAdd: addFrame, onDuplicate: dupFrame, onDelete: delFrame,
    });
  } else {
    filmstripEl.replaceChildren();
  }
}

// ---- Persistence + undo history ----
function persist() {
  if (currentDocId === 'scratch') { saveScratch(scene); return; }
  if (!currentDocId) return;
  scene.name = currentName;
  saveMine({ id: currentDocId, name: currentName, scene, updatedAt: Date.now() });
}
function commit() { history.record(scene); refreshUndoUI(); persist(); }
function refreshUndoUI() { btnUndo.disabled = !history.canUndo(); btnRedo.disabled = !history.canRedo(); }
function undo() {
  const s = history.undo(scene); if (!s) return;
  scene = s; index = Math.min(index, scene.frames.length - 1);
  dropSelection(); render(); persist(); refreshUndoUI();
}
function redo() {
  const s = history.redo(scene); if (!s) return;
  scene = s; index = Math.min(index, scene.frames.length - 1);
  dropSelection(); render(); persist(); refreshUndoUI();
}
btnUndo.addEventListener('click', undo);
btnRedo.addEventListener('click', redo);
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
  onMarkupChange: (added) => { renderMarkup(layerAnnotations, frame(), selInkIndex()); if (added) commit(); },
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
  selChip = document.createElement('div'); selChip.className = 'sel-chip';
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

function addFrame() { dropSelection(); index = duplicateFrame(scene, index); render(); commit(); }
function dupFrame(i) { dropSelection(); index = duplicateFrame(scene, i); render(); commit(); }
function delFrame(i) { dropSelection(); if (deleteFrame(scene, i)) { if (i < index) index -= 1; index = Math.min(index, scene.frames.length - 1); render(); commit(); } }

document.getElementById('btn-play').addEventListener('click', () => { dropSelection(); steps.play(); });
document.getElementById('btn-play-build').addEventListener('click', () => { dropSelection(); steps.play(); });
scrub.addEventListener('input', () => steps.scrubTo(Number(scrub.value)));
scrub.addEventListener('change', () => settleTo(Number(scrub.value)));
document.getElementById('btn-step-prev').addEventListener('click', () => { settleTo(index - 1); });
document.getElementById('btn-step-next').addEventListener('click', () => { settleTo(index + 1); });

// ---- Setup panel (New Library play + in-Build pitch change + Empty pitch) ----
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
  if (setupMode === 'new') showLibrary();
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
document.getElementById('btn-empty-pitch').addEventListener('click', () => {
  if (!window.confirm('Empty the pitch? This clears your scratchpad.')) return;
  scene = emptyScratchScene();
  currentDocId = 'scratch'; currentName = 'Scratchpad'; index = 0;
  saveScratch(scene);
  panelSetup.hidden = true;
  enterEditor('build');
});

// ---- Navigation / surfaces ----
function openScratch() {
  scene = loadScratch() || emptyScratchScene();
  currentDocId = 'scratch'; currentName = 'Scratchpad'; index = 0;
  enterEditor('build');
}
function showLibrary() {
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
    onClose: closeLibrary,
  });
}
function closeLibrary() { homeEl.hidden = true; editorEl.hidden = false; }

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
    if (!t) { showLibrary(); return; }
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
function saveToLibrary() {
  const seed = currentName === 'Scratchpad' ? '' : currentName;
  const name = (window.prompt('Save to Library as…', seed) || '').trim();
  if (!name) return;
  saveMine(newTactic(name, clone(scene)));
  window.alert(`Saved “${name}” to your Library.`);
}

document.getElementById('btn-home').addEventListener('click', openScratch);
document.getElementById('btn-library').addEventListener('click', showLibrary);
document.getElementById('btn-help').addEventListener('click', () => { document.getElementById('panel-help').hidden = false; });
document.getElementById('help-close').addEventListener('click', () => { document.getElementById('panel-help').hidden = true; });
document.getElementById('btn-edit').addEventListener('click', onEdit);
document.getElementById('btn-done').addEventListener('click', () => setMode('watch'));
document.getElementById('btn-setup').addEventListener('click', () => openSetup('edit'));
document.getElementById('btn-save').addEventListener('click', saveToLibrary);
docTitle.addEventListener('click', () => { if (mode() === 'build') renameCurrent(); });

// ---- Card-menu actions ----
function renameTactic(item) {
  const name = (window.prompt('Rename tactic', item.name) || '').trim();
  if (!name) return;
  const t = loadMine(item.id); if (!t) return;
  t.name = name; t.scene.name = name; t.updatedAt = Date.now();
  saveMine(t);
  showLibrary();
}
function duplicateTactic(item) {
  const s = sceneOf(item); if (!s) return;
  saveMine(newTactic((item.name || 'Untitled') + ' (copy)', s));
  showLibrary();
}
function exportTactic(item) {
  const s = sceneOf(item); if (!s) return;
  exportScene({ ...s, name: item.name });
}
function deleteTactic(item) {
  if (!window.confirm(`Delete "${item.name}"?`)) return;
  deleteMine(item.id);
  showLibrary();
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
openScratch();
console.log('[goalpad] loaded');
```

- [ ] **Step 4: Append styles to `styles.css`**

```css
/* ---- home logo button + Help + Save show-hide (Part A) ---- */
.brand { border: none; background: none; padding: 0; min-height: 0; border-bottom: none; cursor: pointer; }
#editor[data-mode="watch"] #btn-save { display: none; }
.help-card { width: min(94vw, 560px); max-height: 82vh; }
.help-body { overflow-y: auto; }
.help-body h3 { margin: 16px 0 4px; font-weight: 500; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #0a0a0a; }
.help-body p { margin: 0; font-size: 14px; line-height: 1.5; color: #0a0a0a; }
.help-body b { font-weight: 500; }
```

- [ ] **Step 5: Verify**

Run: `node --check js/app.js` and `node --check js/home.js` (no output), and `node --test` (full suite green — no pure logic changed beyond Task 1). Grep `index.html` to confirm `#btn-home`, `#btn-library`, `#btn-help`, `#btn-save`, `#btn-empty-pitch`, `#panel-help` are present and `#btn-back` is gone; grep `js/app.js` to confirm no `btn-back`/`showHome(` reference remains and `openScratch`/`saveScratch`/`loadScratch`/`'scratch'` are present.

- [ ] **Step 6: Commit**

```bash
git add index.html js/app.js js/home.js styles.css
git commit -m "feat: scratchpad home, logo home button, Library/Help/Save nav"
```

---

## Task 3: Browser verification (controller)

**Run by the controller** with a **no-store** static server; hard-reload first. Confirm:

1. **Launch → scratchpad in Build:** opens on an empty 7v7 pitch (ball, no players) with the chip toolbar + filmstrip; the top bar shows `goalpad●` · title (Scratchpad ✎) · Library · Help · Setup · ↶ ↷ · Save · Done.
2. **Scratch persists:** stamp a couple of players / draw an arrow, then reload the page (hard) — the scratchpad comes back with your work.
3. **Logo → home:** open a Library play (below), then tap the `goalpad` logo → returns to the scratchpad as you left it.
4. **Library button + Close:** Library opens the browse surface (Templates + Mine cards for now); Close returns to the editor with the current board intact; tapping a play loads it (Watch).
5. **Save:** on the scratchpad, tap Save → name it → it appears in the Library (Mine); the board stays the scratchpad.
6. **New/Clear:** Setup → Empty pitch → confirm → the scratchpad resets to empty.
7. **Help:** Help opens the guide, reads correctly, Close dismisses.
8. **Regressions:** Watch/Build toggle, Setup pitch change, undo/redo, filmstrip, chips/selection/ink all still work; no console errors.

Fix any defect (dispatch a fix subagent) before completing.

---

## Self-Review Notes

- **Spec coverage (Part A):** scratchpad slot + emptyScratchScene (Task 1); launch→scratchpad, logo→home, Library-via-button + Close, Help panel, Save-to-Library, New/Clear in Setup, top-bar restructure, scratch autosave routing (Task 2); browser verification (Task 3). All Part-A spec items map to tasks.
- **Type consistency:** `emptyScratchScene()`, `loadScratch()`, `saveScratch(scene)` defined in Task 1 and imported/called in Task 2's app.js. `renderHome` gains `onClose` in both home.js (Task 2 step 2) and the app.js call site. `currentDocId==='scratch'` routing is consistent between `persist()` and the flows. `clone(scene)` deep-copies for Save so the saved play doesn't alias the live scratch.
- **Atomicity:** the new top-bar markup, the app.js that references it (`btn-home`/`btn-library`/`btn-help`/`btn-save`/`btn-empty-pitch`), the home.js `onClose`, and the CSS all ship in Task 2 together — no commit leaves app.js referencing a removed/absent element (the recurring lesson). Task 1 adds inert-until-wired helpers.
- **Part B (deferred):** the Library surface is still the existing card UI, reached via the button; Part B rebuilds it with search/tags/icon+label and the tag editor.
