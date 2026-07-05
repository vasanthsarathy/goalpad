# goalpad Library Redesign (Part B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Library from a big card grid into a compact, searchable, tag-filterable browser — a search box, situational tag chips, and Tactics ↗ / Drills △ / Mine ★ grouped icon+label lists, with user-editable tags on saved plays.

**Architecture:** Built-in tags are **derived** from each preset's name/group/description by a pure `deriveTags()` (no per-preset data edit); Mine records carry explicit `tags` (user-editable). Pure `normalizeTags()`/`filterLibrary()` do the filtering (tested). `home.js` becomes `renderLibrary()` — search + tag chips + grouped icon rows — replacing the card grid; `app.js` wires the new callbacks (tag editor, Save-with-tags). No scene-model/editor/Part-A change.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, SVG, localStorage, `node:test`. No build step.

## Global Constraints

- **Tags:** built-ins derive tags via `deriveTags(preset)` from name/group/description (situational labels: 2v1/3v2/…, corner/throw-in/free-kick, attack/defence, possession/finishing/warm-up, overlap/switch/…, small-sided, rondo, passing, 1v1); every preset gets ≥1 tag (category fallback). Mine records carry a `tags: string[]` (user-editable, normalized: trim/lowercase/dedupe).
- **Filtering** (pure): `filterLibrary(items, {query, tags})` → items whose name/description/tags contain `query` (substring, case-insensitive) **AND** include **every** tag in `tags` (AND). `normalizeTags(str)` splits on commas → trim/lowercase/dedupe/drop-empties.
- **Layout:** search box; a wrapping row of tag chips (toggle, active = ink border); grouped compact rows under **TACTICS (↗)** / **DRILLS (△)** / **MINE (★)**, each row = icon + name + tags (mute), `min-height: 40px`; tactics/drills sub-grouped by their `group`. Tap a row → open (Watch; templates fork on Edit). Long-press → menu (template: Duplicate/Export; Mine: Rename/Tags/Duplicate/Export/Delete). +New / Import / Close in the header.
- Monochrome idiom (paper `#ffffff`, ink `#0a0a0a`, mute `#949494`, signal `#e10600`, square corners, engraved labels, ink hairlines). No new colours (tactic/drill distinction is the ↗/△ glyph).
- No change to the scene model, the Build editor, or the Part-A scratchpad/nav. Existing tests stay green.

---

## File Structure

```
js/library.js        # + deriveTags(preset) pure helper
js/storage.js        # + normalizeTags/filterLibrary; newTactic(tags); Mine records carry tags
test/library.test.js # + deriveTags tests
test/storage.test.js # + normalizeTags/filterLibrary/newTactic-tags tests
js/home.js           # REWRITE: renderLibrary — search + tag chips + grouped icon rows
js/app.js            # wire renderLibrary + tag editor + Save-with-tags + duplicate-keeps-tags
styles.css           # + search/chips/rows/section styles
```

---

## Task 1: Tags + filtering (pure)

**Files:**
- Modify: `js/library.js`
- Modify: `js/storage.js`
- Modify: `test/library.test.js`
- Modify: `test/storage.test.js`

**Interfaces:**
- Produces: `deriveTags(preset)` (library.js) → `string[]` (≥1); `normalizeTags(str)` (storage.js) → `string[]`; `filterLibrary(items, {query, tags})` (storage.js) → filtered `items`; `newTactic(name, scene, tags = [])` now returns a record with `tags`; `listMine()`/`loadMine()` include `tags`.

- [ ] **Step 1: Write the failing tests**

Append to `test/library.test.js`:
```javascript
import { deriveTags } from '../js/library.js';

test('deriveTags returns a non-empty string array for every preset', () => {
  for (const p of LIBRARY) {
    const t = deriveTags(p);
    assert.ok(Array.isArray(t) && t.length > 0, `${p.id} has tags`);
    assert.ok(t.every((x) => typeof x === 'string'), `${p.id} tag types`);
  }
});

test('deriveTags picks situational labels from name/group', () => {
  const twoVone = LIBRARY.find((p) => p.id === 'tac-2v1');
  assert.ok(deriveTags(twoVone).includes('2v1'), '2v1');
  assert.ok(deriveTags(twoVone).includes('attack'), 'attack');
  const corner = LIBRARY.find((p) => p.id === 'tac-corner');
  assert.ok(deriveTags(corner).includes('corner'), 'corner');
});
```

Append to `test/storage.test.js`:
```javascript
import { normalizeTags, filterLibrary } from '../js/storage.js';

test('normalizeTags trims, lowercases, dedupes, drops empties', () => {
  assert.deepEqual(normalizeTags('Corner, 2v1 , corner,, Attack'), ['corner', '2v1', 'attack']);
  assert.deepEqual(normalizeTags(''), []);
  assert.deepEqual(normalizeTags(null), []);
});

test('filterLibrary: query matches name, description, or tags', () => {
  const items = [
    { name: '2v1 attack', description: '', tags: ['2v1', 'attack'] },
    { name: 'Rondo', description: 'keep ball', tags: ['possession'] },
  ];
  assert.equal(filterLibrary(items, { query: '2v1' }).length, 1);
  assert.equal(filterLibrary(items, { query: 'keep' }).length, 1);
  assert.equal(filterLibrary(items, { query: 'possession' }).length, 1);
  assert.equal(filterLibrary(items, {}).length, 2);
});

test('filterLibrary: tag chips filter with AND', () => {
  const items = [
    { name: 'a', tags: ['corner', 'attack'] },
    { name: 'b', tags: ['corner'] },
    { name: 'c', tags: ['attack'] },
  ];
  assert.equal(filterLibrary(items, { tags: ['corner'] }).length, 2);
  assert.equal(filterLibrary(items, { tags: ['corner', 'attack'] }).length, 1);
});

test('newTactic carries a tags array (default empty)', () => {
  const scene = createScene({ preset: '7v7', teamA: 1, teamB: 1, half: 'full' });
  assert.deepEqual(newTactic('x', scene).tags, []);
  assert.deepEqual(newTactic('x', scene, ['a', 'b']).tags, ['a', 'b']);
});
```
(`test/library.test.js` already imports `test`/`assert`/`LIBRARY`; `test/storage.test.js` already imports `test`/`assert`/`createScene`/`newTactic`/`serialize`/`deserialize`. Add only the shown new imports; reuse the existing ones — do not duplicate.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/library.test.js test/storage.test.js`
Expected: FAIL — `deriveTags`/`normalizeTags`/`filterLibrary` not exported (and `newTactic` has no `.tags`).

- [ ] **Step 3: Add `deriveTags` to `js/library.js`** — append at the end:

```javascript
// Derive situational tags for a built-in preset from its name/group/description.
const TAG_RULES = [
  ['2v1', /\b2\s*-?\s*v\s*-?\s*1\b/], ['3v2', /\b3\s*-?\s*v\s*-?\s*2\b/], ['3v3', /\b3\s*-?\s*v\s*-?\s*3\b/],
  ['4v4', /\b4\s*-?\s*v\s*-?\s*4\b/], ['5v2', /\b5\s*-?\s*v\s*-?\s*2\b/], ['1v1', /\b1\s*-?\s*v\s*-?\s*1\b/],
  ['small-sided', /small.?sided/],
  ['corner', /corner/], ['throw-in', /throw/], ['free-kick', /free.?kick/], ['set-piece', /set.?piece/],
  ['attack', /attack/], ['defence', /defen[cs]e|defend/],
  ['possession', /possession|keep.?ball/], ['rondo', /rondo/],
  ['finishing', /finish|shoot|shot|scor/], ['warm-up', /warm.?up/],
  ['pressing', /press/], ['transition', /transition/],
  ['overlap', /overlap/], ['give-and-go', /give.?and.?go|one.?two/], ['switch', /switch/],
  ['third-man', /third.?man/], ['passing', /passing|\bpass\b/], ['dribbling', /dribbl/],
  ['crossing', /cross/], ['wide', /\bwide\b|wing|flank/],
];

export function deriveTags(preset) {
  const hay = `${preset.name} ${preset.group} ${preset.description || ''}`.toLowerCase();
  const tags = [];
  for (const [tag, re] of TAG_RULES) if (re.test(hay) && !tags.includes(tag)) tags.push(tag);
  if (!tags.length) tags.push(preset.category === 'drills' ? 'drill' : 'tactic');
  return tags;
}
```

- [ ] **Step 4: Add tags + filtering to `js/storage.js`**

(a) Change `newTactic` to accept `tags`:
```javascript
export function newTactic(name, scene, tags = []) {
  const n = (name || 'Untitled').trim() || 'Untitled';
  return { id: freshId(), name: n, scene: { ...scene, name: n }, updatedAt: Date.now(), tags: Array.isArray(tags) ? tags : [] };
}
```

(b) In `listMine`, include `tags` in each pushed row — change the push line to:
```javascript
      if (rec && rec.id && rec.scene) out.push({ id: rec.id, name: rec.name || 'Untitled', updatedAt: rec.updatedAt || 0, tags: rec.tags || [] });
```

(c) In `loadMine`, include `tags` in the returned record — change the return to:
```javascript
    return { id: rec.id, name: rec.name || 'Untitled', updatedAt: rec.updatedAt || 0, tags: rec.tags || [], scene: deserialize(JSON.stringify(rec.scene)) };
```

(d) Append the pure filter helpers at the end of the file:
```javascript
// ---- Library search / tags ----
export function normalizeTags(str) {
  return [...new Set((str || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

export function filterLibrary(items, opts = {}) {
  const q = (opts.query || '').trim().toLowerCase();
  const tags = opts.tags || [];
  return items.filter((it) => {
    const itags = it.tags || [];
    if (tags.length && !tags.every((t) => itags.includes(t))) return false;
    if (!q) return true;
    const hay = `${it.name || ''} ${it.description || ''} ${itags.join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test test/library.test.js test/storage.test.js` then `node --test` (full suite).
Expected: PASS — new tests pass; full suite green.

- [ ] **Step 6: Commit**

```bash
git add js/library.js js/storage.js test/library.test.js test/storage.test.js
git commit -m "feat: derived preset tags + Mine tags + pure library search/filter"
```

---

## Task 2: The Library browser (renderLibrary) + wiring

**Files:**
- Rewrite: `js/home.js`
- Modify: `js/app.js`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `deriveTags` (library.js), `filterLibrary` (storage.js) in home.js; `normalizeTags` (storage.js), `renderLibrary` (home.js) in app.js.
- Produces: `renderLibrary(root, { library, mine, onOpen, onNew, onImport, onClose, onRename, onDuplicate, onExport, onDelete, onEditTags })`.

- [ ] **Step 1: Rewrite `js/home.js`** (replace entire file)

```javascript
// home.js — DOM: the Library browser (search + tag chips + Tactics/Drills/Mine icon rows).
import { deriveTags } from './library.js';
import { filterLibrary } from './storage.js';

const LONG_PRESS_MS = 450;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function renderLibrary(root, cbs) {
  const { library, mine, onOpen, onNew, onImport, onClose, onRename, onDuplicate, onExport, onDelete, onEditTags } = cbs;
  closeMenu();

  const items = [
    ...library.map((t) => ({ kind: 'template', ref: t, name: t.name, description: t.description, tags: deriveTags(t), category: t.category, group: t.group })),
    ...mine.map((m) => ({ kind: 'mine', ref: m, name: m.name, description: '', tags: m.tags || [], category: 'mine', group: 'Mine' })),
  ];
  const allTags = [...new Set(items.flatMap((i) => i.tags))].sort();
  let query = '';
  const active = new Set();

  root.replaceChildren();

  // header: wordmark + New / Import / Close
  const head = el('div', 'home-head');
  const brand = el('span', 'brand'); brand.append(document.createTextNode('goalpad'), el('span', 'dot'));
  const actions = el('div', 'home-actions');
  for (const [label, fn] of [['New', onNew], ['Import', onImport], ['Close', onClose]]) {
    const b = el('button', 'home-action', label); b.type = 'button'; b.addEventListener('click', () => fn());
    actions.append(b);
  }
  head.append(brand, actions);
  root.append(head);

  // search
  const search = el('input', 'lib-search'); search.type = 'search'; search.placeholder = 'Search tactics, drills, tags…';
  search.addEventListener('input', () => { query = search.value; renderResults(); });
  root.append(search);

  // tag chips
  const chipRow = el('div', 'lib-chips');
  for (const tag of allTags) {
    const c = el('button', 'lib-chip', tag); c.type = 'button'; c.setAttribute('aria-pressed', 'false');
    c.addEventListener('click', () => {
      if (active.has(tag)) active.delete(tag); else active.add(tag);
      c.setAttribute('aria-pressed', String(active.has(tag)));
      renderResults();
    });
    chipRow.append(c);
  }
  root.append(chipRow);

  // results
  const results = el('div', 'lib-results');
  root.append(results);

  const sectionOf = (i) => (i.kind === 'mine' ? 'MINE' : (i.category === 'drills' ? 'DRILLS' : 'TACTICS'));
  const iconOf = (i) => (i.kind === 'mine' ? '★' : (i.category === 'drills' ? '△' : '↗'));

  function rowFor(item) {
    const b = el('button', 'lib-row'); b.type = 'button';
    b.append(el('span', 'lib-icon', iconOf(item)), el('span', 'lib-nm', item.name), el('span', 'lib-tags', item.tags.join(' · ')));
    const menuItems = item.kind === 'mine'
      ? [['Rename', () => onRename(item.ref)], ['Tags', () => onEditTags(item.ref)], ['Duplicate', () => onDuplicate(item.ref)], ['Export', () => onExport(item.ref)], ['Delete', () => onDelete(item.ref)]]
      : [['Duplicate', () => onDuplicate(item.ref)], ['Export', () => onExport(item.ref)]];
    wireRow(b, () => onOpen(item.kind, item.ref), (anchor) => openMenu(anchor, menuItems));
    return b;
  }

  function renderResults() {
    const filtered = filterLibrary(items, { query, tags: [...active] });
    results.replaceChildren();
    for (const section of ['TACTICS', 'DRILLS', 'MINE']) {
      const secItems = filtered.filter((i) => sectionOf(i) === section);
      if (!secItems.length) continue;
      results.append(el('div', 'lib-section', section));
      const groups = [];
      for (const i of secItems) if (!groups.includes(i.group)) groups.push(i.group);
      for (const g of groups) {
        if (section !== 'MINE') results.append(el('div', 'lib-group', g));
        for (const item of secItems.filter((x) => x.group === g)) results.append(rowFor(item));
      }
    }
    if (!filtered.length) results.append(el('div', 'empty', 'No matches'));
  }

  renderResults();
}

function wireRow(b, onTap, onLong) {
  let timer = null, longFired = false;
  b.addEventListener('pointerdown', () => { longFired = false; timer = setTimeout(() => { longFired = true; onLong(b); }, LONG_PRESS_MS); });
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  b.addEventListener('pointerup', cancel);
  b.addEventListener('pointerleave', cancel);
  b.addEventListener('pointercancel', cancel);
  b.addEventListener('click', () => { if (!longFired) onTap(); });
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

- [ ] **Step 2: Wire it in `js/app.js`** — four edits:

(a) Change the home import + add `normalizeTags`:
```javascript
import { renderHome } from './home.js';
```
to:
```javascript
import { renderLibrary } from './home.js';
```
and add `normalizeTags` to the storage import list (append it to the existing `from './storage.js'` import).

(b) In `showLibrary`, call `renderLibrary` with the new callbacks — replace the `renderHome(homeEl, {...})` call with:
```javascript
  renderLibrary(homeEl, {
    library: LIBRARY,
    mine: listMine(),
    onOpen: openCard,
    onNew: startNew,
    onImport: () => importInput.click(),
    onClose: closeLibrary,
    onRename: renameTactic,
    onDuplicate: duplicateTactic,
    onExport: exportTactic,
    onDelete: deleteTactic,
    onEditTags: editTags,
  });
```

(c) Add the `editTags` handler and give `duplicateTactic` the tags — replace the existing `duplicateTactic` function and add `editTags` after it:
```javascript
function duplicateTactic(item) {
  const s = sceneOf(item); if (!s) return;
  saveMine(newTactic((item.name || 'Untitled') + ' (copy)', s, item.tags || []));
  showLibrary();
}
function editTags(item) {
  const input = window.prompt('Tags (comma-separated)', (item.tags || []).join(', '));
  if (input === null) return;
  const t = loadMine(item.id); if (!t) return;
  t.tags = normalizeTags(input); t.updatedAt = Date.now();
  saveMine(t);
  showLibrary();
}
```

(d) Give `saveToLibrary` an optional tags prompt — replace it with:
```javascript
function saveToLibrary() {
  const seed = currentName === 'Scratchpad' ? '' : currentName;
  const name = (window.prompt('Save to Library as…', seed) || '').trim();
  if (!name) return;
  const tags = normalizeTags(window.prompt('Tags (comma-separated, optional)', '') || '');
  saveMine(newTactic(name, clone(scene), tags));
  window.alert(`Saved “${name}” to your Library.`);
}
```

- [ ] **Step 3: Append the Library styles to `styles.css`**

```css
/* ---- Library browser (Part B) ---- */
.lib-search { margin: 8px 16px 4px; padding: 10px; border: 1px solid #0a0a0a; border-radius: 0; font-family: inherit; font-size: 14px; background: #fff; color: #0a0a0a; }
.lib-chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 16px; }
.lib-chip { font-size: 12px; letter-spacing: 0.02em; text-transform: none; color: #949494; padding: 6px 10px; min-height: 32px; border: 1px solid #ececec; background: #fff; border-radius: 0; }
.lib-chip[aria-pressed="true"] { color: #0a0a0a; border-color: #0a0a0a; }
.lib-results { padding: 0 16px 24px; }
.lib-section { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #0a0a0a; font-weight: 500; margin: 18px 0 6px; border-bottom: 1px solid #0a0a0a; padding-bottom: 4px; }
.lib-group { font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: #949494; margin: 10px 0 2px; }
.lib-row { display: flex; align-items: baseline; gap: 12px; width: 100%; text-align: left; padding: 8px 2px; min-height: 40px; border: none; border-bottom: 1px solid #f0f0f0; background: none; text-transform: none; letter-spacing: normal; }
.lib-icon { width: 16px; flex: 0 0 auto; color: #0a0a0a; font-size: 14px; }
.lib-nm { font-size: 14px; color: #0a0a0a; }
.lib-tags { font-size: 11px; color: #949494; margin-left: auto; text-align: right; }
```

- [ ] **Step 4: Verify**

Run: `node --check js/home.js` and `node --check js/app.js` (no output), and `node --test` (full suite green). Grep `js/app.js` to confirm `renderLibrary`/`onEditTags`/`editTags`/`normalizeTags` present and no `renderHome` reference remains; grep `js/home.js` to confirm it exports `renderLibrary` (not `renderHome`).

- [ ] **Step 5: Commit**

```bash
git add js/home.js js/app.js styles.css
git commit -m "feat: Library browser — search, tag chips, Tactics/Drills/Mine icon rows"
```

---

## Task 3: Browser verification (controller)

**Run by the controller** with a **no-store** static server; hard-reload first. Open the Library (top-bar **Library** button) and confirm:

1. **Layout:** a search box, a wrapping row of tag chips, and grouped rows under **TACTICS (↗)** / **DRILLS (△)** / **MINE (★)**, each row showing the icon + name + its tags; rows are compact (far denser than the old cards).
2. **Search:** typing "2v1" narrows to the 2v1 plays; "corner" to corners; a play name also matches — live as you type.
3. **Tag chips:** tapping `[corner]` filters to corner plays (chip shows active/ink); adding `[attack]` narrows to plays with **both** (AND); tapping again clears.
4. **Open:** tapping a row loads that play into the editor (Watch); a built-in forks a copy on Edit; a Mine play edits in place.
5. **Mine tags:** long-press a Mine row → **Tags** → enter "pressing, u12" → the row now shows those tags and they filter (chip + search); Rename / Duplicate / Export / Delete still work; a template long-press shows Duplicate / Export only.
6. **Save with tags:** from a board, top-bar **Save** → name + tags prompt → the new Mine play appears with those tags.
7. **Empty state:** a search with no matches shows "No matches"; an empty Mine shows nothing under MINE (section hidden).
8. No console errors; the Close button returns to the editor.

Fix any defect (dispatch a fix subagent) before completing.

---

## Self-Review Notes

- **Spec coverage (Part B):** derived built-in tags + Mine tags + `normalizeTags`/`filterLibrary` (Task 1); search box + tag chips (AND) + Tactics ↗ / Drills △ / Mine ★ grouped icon rows + row menus + tag editor + Save-with-tags (Task 2); browser verification (Task 3). All Part-B spec items map to tasks. (Spec's "stored curated tags on presets" is implemented as `deriveTags` — same searchable result, no 58-preset data edit.)
- **Type consistency:** `deriveTags(preset)→string[]`, `filterLibrary(items,{query,tags})`, `normalizeTags(str)→string[]`, `newTactic(name,scene,tags)` defined in Task 1 and consumed in Task 2 (home.js imports deriveTags+filterLibrary; app.js imports normalizeTags+renderLibrary). `renderLibrary`'s callback set matches app.js's `showLibrary` call exactly. `onOpen(kind, ref)` passes the raw template/Mine object, matching `openCard(kind, item)`'s expectations (template has `.scene`, Mine has `.id`).
- **Atomicity:** home.js exports `renderLibrary` (renamed from `renderHome`) and app.js's import + call switch together in Task 2 — no commit leaves app.js importing a missing `renderHome`. Task 1 adds inert-until-used pure helpers; `migrateLegacyPlays`'s `newTactic(name, scene)` call still works (tags default `[]`).
- **Deferred cleanup:** the old `.card`/`.card-grid`/`.card-name`/`.shelf`/`.group-label` CSS rules become dead once home.js stops rendering cards; harmless, left for a later sweep.
