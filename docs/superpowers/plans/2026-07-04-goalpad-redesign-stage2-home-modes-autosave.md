# goalpad Redesign Stage 2 — Home + Watch/Build Modes + Autosave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn goalpad into a shell with a Library home screen (Templates + Mine card shelves) and two document modes — Watch (view) and Build (edit) — backed by continuous autosave that replaces the Save/Load panel.

**Architecture:** A new pure/persistence layer (`storage.js` Mine CRUD + one-time migration), a new DOM view module (`home.js`) that renders the home surface and card menus, and an `app.js` rewrite that becomes the shell: it owns `surface` (home/editor), `mode` (watch/build), the open Mine tactic id, and autosaves on every edit. The scene model, playback, and the board's editing tools are unchanged. `index.html` gains a `#home` surface and an `#editor` wrapper with a contextual top bar; the Save/Load and modal Library panels are removed.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, SVG, localStorage, `node:test`. No build step, no runtime dependencies.

## Global Constraints

- **Tactic record:** `{ id, name, scene, updatedAt }`; `id = crypto.randomUUID()` (string); `updatedAt = Date.now()`; `scene.name` kept equal to `name`. Stored at `localStorage['goalpad:mine:<id>']`.
- **Templates** = the read-only `LIBRARY` presets; opening/editing one never mutates it.
- **Autosave** writes the Mine record on every mutating action in Build; **no Save button, no unsaved state, no Save/Load panel.**
- **Watch is view-only:** no toolbar, no + Frame / 🗑 Frame, no piece dragging. **Build** shows Stage 1's toolbar + steps bar.
- **Fork-on-Edit:** editing a Template creates a new Mine tactic "<name> (copy)" and edits the copy.
- **Migration:** one-time, flag `goalpad:migrated:mine-v1`; legacy `goalpad:scene:<name>` entries are copied into Mine and left in place; invalid ones skipped.
- Visuals stay in the Stage 1 monochrome idiom (paper `#ffffff`, ink `#0a0a0a`, mute `#949494`, signal `#e10600`, square corners, engraved uppercase labels, ink hairlines). No scene-model/playback/library-data changes; existing tests stay green.

---

## File Structure

```
js/storage.js       # + Mine CRUD (saveMine/listMine/loadMine/deleteMine), newTactic, migrateLegacyPlays, validLegacyEntries
test/storage.test.js# + tests for newTactic + validLegacyEntries (pure)
js/home.js          # NEW: renderHome(root, callbacks) — Templates+Mine cards, +New/Import, long-press menu
styles.css          # + home surface, cards, card menu, editor layout, contextual top bar, watch/build show-hide
index.html          # NEW body: #home + #editor(contextual top bar, board, toolbar, steps); remove saveload+modal library panels
js/app.js           # REWRITE: shell — surfaces, modes, flows, autosave, migration
```

---

## Task 1: Mine store + migration (storage.js)

**Files:**
- Modify: `js/storage.js`
- Modify: `test/storage.test.js`

**Interfaces:**
- Consumes: `serialize`/`deserialize` (same file); `createScene` from `scene.js` (tests only).
- Produces: `newTactic(name, scene) → {id,name,scene,updatedAt}`; `validLegacyEntries(entries) → [{name,scene}]`; `saveMine(tactic)`; `listMine() → [{id,name,updatedAt}]` newest-first; `loadMine(id) → {id,name,scene,updatedAt}|null`; `deleteMine(id)`; `migrateLegacyPlays() → count`.

- [ ] **Step 1: Write the failing tests** — append to `test/storage.test.js`:

```javascript
import { newTactic, validLegacyEntries, serialize as ser } from '../js/storage.js';
import { createScene } from '../js/scene.js';

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
    { name: 'good', str: ser(scene) },
    { name: 'bad', str: '{not valid json}' },
    { name: 'legacy', str: JSON.stringify({ foo: 1 }) },
  ];
  const out = validLegacyEntries(entries);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, 'good');
  assert.equal(out[0].scene.field.preset, '9v9');
});
```

Note: `test/storage.test.js` already imports `test`/`assert` and `serialize`/`deserialize`; if `serialize` is already imported there, reuse it and drop the `serialize as ser` alias (use whatever name is already in scope). Do not duplicate existing imports.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/storage.test.js`
Expected: FAIL — `newTactic`/`validLegacyEntries` are not exported.

- [ ] **Step 3: Add the Mine layer to `js/storage.js`** — append at the end of the file:

```javascript
// ---- Mine (saved tactics) + migration ----
const MINE_PREFIX = 'goalpad:mine:';
const MIGRATED_FLAG = 'goalpad:migrated:mine-v1';

function freshId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// pure: build a tactic record from a name + scene
export function newTactic(name, scene) {
  const n = (name || 'Untitled').trim() || 'Untitled';
  return { id: freshId(), name: n, scene: { ...scene, name: n }, updatedAt: Date.now() };
}

// pure: given legacy [{name, str}], return [{name, scene}] for entries that deserialize
export function validLegacyEntries(entries) {
  const out = [];
  for (const e of entries) {
    try { out.push({ name: e.name, scene: deserialize(e.str) }); } catch { /* skip invalid */ }
  }
  return out;
}

export function saveMine(tactic) {
  localStorage.setItem(MINE_PREFIX + tactic.id, JSON.stringify(tactic));
}

export function listMine() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(MINE_PREFIX)) continue;
    try {
      const rec = JSON.parse(localStorage.getItem(key));
      if (rec && rec.id && rec.scene) out.push({ id: rec.id, name: rec.name || 'Untitled', updatedAt: rec.updatedAt || 0 });
    } catch { /* skip corrupt */ }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadMine(id) {
  const str = localStorage.getItem(MINE_PREFIX + id);
  if (!str) return null;
  const rec = JSON.parse(str);
  return { id: rec.id, name: rec.name || 'Untitled', updatedAt: rec.updatedAt || 0, scene: deserialize(JSON.stringify(rec.scene)) };
}

export function deleteMine(id) { localStorage.removeItem(MINE_PREFIX + id); }

// one-time: copy legacy goalpad:scene:<name> plays into Mine
export function migrateLegacyPlays() {
  if (localStorage.getItem(MIGRATED_FLAG)) return 0;
  const entries = [];
  for (const name of listSaved()) {
    const str = localStorage.getItem(KEY_PREFIX + name);
    if (str) entries.push({ name, str });
  }
  const valid = validLegacyEntries(entries);
  for (const { name, scene } of valid) saveMine(newTactic(name, scene));
  localStorage.setItem(MIGRATED_FLAG, '1');
  return valid.length;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/storage.test.js` then `node --test` (full suite).
Expected: PASS — new storage tests pass; full suite green.

- [ ] **Step 5: Commit**

```bash
git add js/storage.js test/storage.test.js
git commit -m "feat: Mine tactic store + one-time legacy migration"
```

---

## Task 2: Home surface module + styles

**Files:**
- Create: `js/home.js`
- Modify: `styles.css` (additions only — do not edit existing rules)

**Interfaces:**
- Consumes: nothing from other JS at import (pure DOM); called by `app.js` (Task 3).
- Produces: `renderHome(root, { templates, mine, onOpen, onNew, onImport, onRename, onDuplicate, onExport, onDelete })`. `templates` = `LIBRARY` array (`{id,name,group,description,scene}`); `mine` = `listMine()` array (`{id,name,updatedAt}`). `onOpen(kind, item)` with kind `'template'|'mine'`; menu callbacks each receive the single `item`.

- [ ] **Step 1: Create `js/home.js`**

```javascript
// home.js — DOM: the Library home surface (Templates + Mine cards) with a long-press card menu.
const LONG_PRESS_MS = 450;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function renderHome(root, cbs) {
  const { templates, mine, onOpen, onNew, onImport, onRename, onDuplicate, onExport, onDelete } = cbs;
  closeMenu();
  root.replaceChildren();

  // header: wordmark + New / Import
  const head = el('div', 'home-head');
  const brand = el('span', 'brand');
  brand.append(document.createTextNode('goalpad'), el('span', 'dot'));
  const actions = el('div', 'home-actions');
  const newBtn = el('button', 'home-action', 'New'); newBtn.type = 'button';
  newBtn.addEventListener('click', () => onNew());
  const importBtn = el('button', 'home-action', 'Import'); importBtn.type = 'button';
  importBtn.addEventListener('click', () => onImport());
  actions.append(newBtn, importBtn);
  head.append(brand, actions);
  root.append(head);

  // Templates shelf, grouped
  const tShelf = el('div', 'shelf');
  tShelf.append(el('div', 'shelf-label', 'Templates'));
  const groups = [];
  for (const t of templates) if (!groups.includes(t.group)) groups.push(t.group);
  for (const g of groups) {
    tShelf.append(el('div', 'group-label', g));
    const grid = el('div', 'card-grid');
    for (const t of templates.filter((x) => x.group === g)) {
      grid.append(card(t.name, () => onOpen('template', t),
        (anchor) => openMenu(anchor, [['Duplicate', () => onDuplicate(t)], ['Export', () => onExport(t)]])));
    }
    tShelf.append(grid);
  }
  root.append(tShelf);

  // Mine shelf
  const mShelf = el('div', 'shelf');
  mShelf.append(el('div', 'shelf-label', 'Mine'));
  if (!mine.length) {
    mShelf.append(el('div', 'empty', 'No saved tactics yet — tap New'));
  } else {
    const grid = el('div', 'card-grid');
    for (const m of mine) {
      grid.append(card(m.name, () => onOpen('mine', m),
        (anchor) => openMenu(anchor, [
          ['Rename', () => onRename(m)], ['Duplicate', () => onDuplicate(m)],
          ['Export', () => onExport(m)], ['Delete', () => onDelete(m)],
        ])));
    }
    mShelf.append(grid);
  }
  root.append(mShelf);
}

function card(name, onTap, onLong) {
  const b = el('button', 'card'); b.type = 'button';
  b.append(el('span', 'card-name', name));
  let timer = null, longFired = false;
  const start = () => { longFired = false; timer = setTimeout(() => { longFired = true; onLong(b); }, LONG_PRESS_MS); };
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  b.addEventListener('pointerdown', start);
  b.addEventListener('pointerup', cancel);
  b.addEventListener('pointerleave', cancel);
  b.addEventListener('pointercancel', cancel);
  b.addEventListener('click', () => { if (!longFired) onTap(); });
  return b;
}

let menuEl = null;
function closeMenu() {
  if (menuEl) { menuEl.remove(); menuEl = null; document.removeEventListener('pointerdown', outside, true); }
}
function outside(e) { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }
function openMenu(anchor, items) {
  closeMenu();
  menuEl = el('div', 'card-menu');
  for (const [label, fn] of items) {
    const item = el('button', 'menu-item', label); item.type = 'button';
    item.addEventListener('click', () => { closeMenu(); fn(); });
    menuEl.append(item);
  }
  const r = anchor.getBoundingClientRect();
  menuEl.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 168)) + 'px';
  menuEl.style.top = (r.bottom + 4) + 'px';
  document.body.append(menuEl);
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
}
```

- [ ] **Step 2: Append the home + editor styles to `styles.css`** (additions only)

```css
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

/* ---- watch/build show-hide ---- */
#editor[data-mode="watch"] #toolbar { display: none; }
#editor[data-mode="watch"] #btn-add-step,
#editor[data-mode="watch"] #btn-del-step { display: none; }
#editor[data-mode="watch"] #btn-setup,
#editor[data-mode="watch"] #btn-done { display: none; }
#editor[data-mode="build"] #btn-edit { display: none; }
```

- [ ] **Step 3: Verify**

Run: `node --check js/home.js` (no output) and `node --test` (full suite green — no logic changed). The home module + styles are inert until `app.js` (Task 3) renders into `#home`.

- [ ] **Step 4: Commit**

```bash
git add js/home.js styles.css
git commit -m "feat: Library home surface module + home/editor styles"
```

---

## Task 3: App shell — surfaces, modes, flows, autosave (index.html + app.js)

**Files:**
- Rewrite: `index.html` (body)
- Rewrite: `js/app.js`

**Interfaces:**
- Consumes: `renderHome` (Task 2); `newTactic`/`saveMine`/`listMine`/`loadMine`/`deleteMine`/`migrateLegacyPlays`/`deserialize`/`exportScene`/`importSceneFile` (Task 1 + existing); `LIBRARY`; existing scene/field/tokens/tools/steps modules.

- [ ] **Step 1: Replace the `<body>` of `index.html`** (keep `<head>` unchanged)

```html
<body>
  <div id="home"></div>

  <div id="editor" hidden>
    <header id="topbar">
      <button id="btn-back" class="nav" type="button">‹ Library</button>
      <span id="doc-title" class="doc-title"></span>
      <div class="top-actions">
        <button id="btn-edit" type="button">Edit</button>
        <button id="btn-setup" type="button">Setup</button>
        <button id="btn-done" type="button">Done</button>
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
      <button class="tool" data-tool="select" aria-pressed="true">Select</button>
      <button class="tool" data-tool="add">Player</button>
      <span id="team-toggle">
        <button class="team" data-team="A" aria-pressed="true">A</button>
        <button class="team" data-team="B">B</button>
      </span>
      <button class="tool" data-tool="cone">Cone</button>
      <button class="tool" data-tool="arrow">Arrow</button>
      <button class="tool" data-tool="pen">Pen</button>
      <button class="tool" data-tool="text">Text</button>
      <button class="tool" data-tool="delete">Delete</button>
    </nav>

    <footer id="stepsbar">
      <button id="btn-step-prev" type="button">◀</button>
      <input id="scrub" type="range" min="0" max="0" step="0.01" value="0">
      <button id="btn-step-next" type="button">▶</button>
      <span id="step-label">1 / 1</span>
      <button id="btn-add-step" type="button">+ Frame</button>
      <button id="btn-del-step" type="button">🗑 Frame</button>
      <button id="btn-play" type="button">▶ Play</button>
    </footer>
  </div>

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
      <label>Pitch
        <select id="setup-half">
          <option value="full">Full</option>
          <option value="left">Left half</option>
          <option value="right">Right half</option>
        </select>
      </label>
      <label>Team A players <input id="setup-teamA" type="number" min="0" max="11" value="11"></label>
      <label>Team B players <input id="setup-teamB" type="number" min="0" max="11" value="11"></label>
      <p class="panel-note">Set both counts to 0 for an empty pitch. Changing the setup rebuilds the board.</p>
      <div class="panel-actions">
        <button id="setup-cancel" type="button">Cancel</button>
        <button id="setup-apply" type="button">Apply</button>
      </div>
    </div>
  </div>

  <input id="import-file" type="file" accept="application/json" hidden>

  <script type="module" src="js/app.js"></script>
</body>
```

- [ ] **Step 2: Rewrite `js/app.js`** (replace the entire file)

```javascript
// app.js — shell: Library home + Watch/Build editor modes + continuous autosave.
import { createScene, duplicateFrame, deleteFrame } from './scene.js';
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
let currentTool = 'select';
let currentTeam = 'A';
let currentDocId = null;   // Mine id, or null for a template preview
let currentName = 'Untitled';

const frame = () => scene.frames[index];

function render() {
  renderField(board, layerField, scene.field);
  renderTokens(board, layerTokens, scene, frame(), () => currentTool, autosave);
  renderMarkup(layerAnnotations, frame());
  refreshScrubRange();
}

function autosave() {
  if (!currentDocId) return;          // template preview → nothing to save yet
  scene.name = currentName;
  saveMine({ id: currentDocId, name: currentName, scene, updatedAt: Date.now() });
}

// ---- Tools (bound once; live state via accessors) ----
initTools(board, layerAnnotations, {
  getScene: () => scene,
  getFrame: () => frame(),
  getTool: () => currentTool,
  getTeam: () => currentTeam,
  onSceneChange: () => { renderTokens(board, layerTokens, scene, frame(), () => currentTool, autosave); autosave(); },
  onMarkupChange: () => { renderMarkup(layerAnnotations, frame()); autosave(); },
});

document.querySelectorAll('.tool').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentTool = btn.dataset.tool;
    document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  });
});
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
let setupMode = 'new';   // 'new' | 'edit'

function openSetup(mode) {
  setupMode = mode;
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

function enterEditor(mode) {
  homeEl.hidden = true;
  editorEl.hidden = false;
  setMode(mode);
  render();
}

function setMode(mode) {
  editorEl.dataset.mode = mode;
  docTitle.textContent = currentName + (mode === 'build' ? ' ✎' : '');
  if (mode === 'build') {
    currentTool = 'select';
    document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === 'select')));
  } else {
    currentTool = 'watch';   // non-'select' → piece dragging is disabled
  }
}

function sceneOf(item) {
  if (item.scene) return deserialize(JSON.stringify(item.scene)); // template
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
  if (!currentDocId) {                       // fork the template preview
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
docTitle.addEventListener('click', () => { if (editorEl.dataset.mode === 'build') renameCurrent(); });

// ---- Card-menu actions (operate on Home items) ----
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

- [ ] **Step 3: Verify**

Run: `node --check js/app.js` (no output) and `node --test` (full suite green). Grep `index.html` to confirm no `panel-saveload` / `panel-library` / `btn-library` / `btn-saveload` remain, and that `#home`, `#editor`, `#btn-back`, `#btn-edit`, `#btn-done`, `#doc-title`, `#import-file` are present.

- [ ] **Step 4: Commit**

```bash
git add index.html js/app.js
git commit -m "feat: app shell — Library home, Watch/Build modes, autosave (retire Save/Load)"
```

---

## Task 4: Browser verification (controller)

**Run by the controller.** Serve (`py -m http.server 8000`) and drive `http://localhost:8000`. Confirm:

1. **Launch → Home:** the app opens on the Library home — wordmark + New/Import, a **Templates** shelf (14 preset cards grouped by group) and a **Mine** shelf (empty state, or migrated plays). No board is shown.
2. **+ New:** opens the Setup sheet; Apply creates a new "Untitled" tactic and lands in **Build** (toolbar + steps visible); Cancel returns Home.
3. **Watch vs Build:** open a card → **Watch** — top bar `‹ Library · title · Edit`; only the transport (Play/scrub/step) below; the toolbar and + Frame/🗑 Frame are hidden; **dragging a piece does nothing**. Press **Edit** → **Build** — toolbar + steps appear, `Setup`/`Done` show; dragging a piece moves it. **Done** → Watch.
4. **Autosave:** in Build, move a piece / add a frame / draw an arrow, then **‹ Library** and reopen the same Mine card — the change persisted. Reload the page — it still persists.
5. **Fork-on-Edit:** open a **Template** → Watch → **Edit** → a new "<name> (copy)" appears in Mine and is what you're editing; reopen the original Template — it is unchanged.
6. **Card menu:** long-press a Mine card → Rename / Duplicate / Export / Delete all work (Rename & Delete update Home; Duplicate adds a "(copy)"; Export downloads JSON). Long-press a Template card → Duplicate / Export only.
7. **Import:** header **Import** → pick a previously exported JSON → it appears in Mine and opens in Watch.
8. **Migration:** if legacy `goalpad:scene:*` plays existed, they appear as Mine cards after first load (one-time).
9. **Title rename:** in Build, tap the title → rename prompt updates the title and Mine.
10. No console errors; Home and both modes are in the Stage 1 monochrome look (square cards, engraved labels, ink hairlines).

Fix any defect (dispatch a fix subagent) before completing.

---

## Self-Review Notes

- **Spec coverage:** Mine model + CRUD + migration (Task 1); Home surface (Templates+Mine cards, +New/Import, long-press menu) (Task 2 view + Task 3 wiring); Watch/Build modes + contextual chrome + disable-Watch-drag (Task 2 CSS + Task 3); autosave on every mutating action (Task 3); flows new/open/fork/rename/duplicate/export/delete/import (Task 3); Save/Load + modal Library retired (Task 3 index.html + app.js); migration on launch (Task 3); browser verification (Task 4). All spec sections map to tasks.
- **Type consistency:** `renderHome(root, {templates, mine, onOpen, onNew, onImport, onRename, onDuplicate, onExport, onDelete})` matches between Task 2 (definition) and Task 3 (call). `onOpen(kind, item)`, menu callbacks `(item)`. Tactic record `{id,name,scene,updatedAt}` identical across storage + app. `item` for a template carries `.scene`; for a Mine card carries `.id` (no scene) — `sceneOf` handles both. The board's render/tools/steps signatures are unchanged; the only new render arg is `autosave` in place of the old no-op `() => {}`.
- **Atomicity:** `index.html` (removes old panels/buttons) ships in the SAME task (3) as the `app.js` rewrite that stops referencing them, so no commit leaves a dangling reference (the Stage 1 lesson). Task 2 adds an unused module + inert styles; Task 1 adds unused-until-Task-3 storage functions — both are safe standalone.
- **Testing:** `newTactic` + `validLegacyEntries` are pure (node-testable); localStorage CRUD + all UI/flows are browser-verified (Task 4). Existing serialize/deserialize/scene/steps/library tests stay green.
