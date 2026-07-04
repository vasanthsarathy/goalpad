# goalpad Tactics & Drills Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a batteries-included library of animated, ready-made tactics and drills the coach can browse (Tactics/Drills tabs, grouped list) and load onto the board as an editable scene.

**Architecture:** Presets are normal goalpad scenes bundled read-only in a pure data module `js/library.js`; a unit test validates every preset; a Library panel (top-bar button) browses them and loads a deep copy via the existing `loadScene`. No changes to the scene model, frames, playback, or save/load. Engine + UI are subagent-coded; the animated content is authored and tuned by the controller in the browser (gated by the validation test).

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, SVG, `node:test`. No build step, no runtime dependencies.

## Global Constraints

- A preset entry is `{ id, name, category, group, description, scene }`; `category` ∈ {`"tactics"`,`"drills"`}; ids unique.
- `scene` is the exact goalpad shape: `{ name, field:{preset,half}, pieces:[{id,kind,team?,number?}], frames:[{positions:{[id]:{x,y}}, markup:[...]}] }`. Multi-frame (≥1 frame; animated presets have several). Every frame has a position for every piece.
- Presets are read-only; loading uses a **deep copy** (`JSON.parse(JSON.stringify(scene))`) through the existing `loadScene(next)`.
- The Library panel is styled in the existing black-and-white identity (white `.panel-card`, hairline `#ECEEF1`, ink `#1B1F27`, grey `#8A9099`, Space Grotesk, text-first tabs: inactive grey, active ink + underline).
- Initial content: **9 tactics + 5 drills** (final counts). No behavior/logic changes; existing tests stay green; new `test/library.test.js` validates all presets.
- Coordinates are in the field's viewBox units (custom = 400×300; half = length/2 × width; 11v11 = 1050×680).

---

## File Structure

```
js/library.js         # NEW: LIBRARY array + the preset scenes (data)
test/library.test.js  # NEW: validates every preset
js/app.js             # Library button + panel wiring (tabs, grouped list, load deep-copy)
index.html            # Library top-bar button + #panel-library markup
styles.css            # Library panel/tab/row styling
```

---

## Task 1: Library data module + validation test (with 2 seed presets)

**Files:**
- Create: `js/library.js`
- Create: `test/library.test.js`

**Interfaces:**
- Consumes: `serialize`/`deserialize` from `storage.js` (tests only).
- Produces: `export const LIBRARY` — array of `{ id, name, category, group, description, scene }`.

- [ ] **Step 1: Write the failing test — `test/library.test.js`**

```javascript
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/library.test.js`
Expected: FAIL — cannot import from `../js/library.js` (module not found).

- [ ] **Step 3: Create `js/library.js` with the 2 seed presets**

```javascript
// library.js — PURE data: bundled read-only preset scenes (tactics & drills).
// A preset's `scene` is a normal goalpad scene; loading copies it onto the board.

export const LIBRARY = [
  {
    id: 'tac-2v1',
    name: '2v1 attack',
    category: 'tactics',
    group: 'Small-sided',
    description: 'Draw the defender, slip the pass',
    scene: {
      name: '2v1 attack',
      field: { preset: 'custom', half: 'full' },
      pieces: [
        { id: 'A1', kind: 'player', team: 'A', number: 1 },
        { id: 'A2', kind: 'player', team: 'A', number: 2 },
        { id: 'B1', kind: 'player', team: 'B', number: 1 },
        { id: 'ball', kind: 'ball' },
      ],
      frames: [
        { positions: { A1: { x: 90, y: 150 }, A2: { x: 90, y: 90 }, B1: { x: 240, y: 150 }, ball: { x: 100, y: 155 } }, markup: [] },
        { positions: { A1: { x: 180, y: 150 }, A2: { x: 200, y: 90 }, B1: { x: 215, y: 150 }, ball: { x: 190, y: 155 } }, markup: [{ type: 'arrow', x1: 195, y1: 148, x2: 205, y2: 98 }] },
        { positions: { A1: { x: 180, y: 150 }, A2: { x: 235, y: 80 }, B1: { x: 215, y: 150 }, ball: { x: 225, y: 85 } }, markup: [{ type: 'arrow', x1: 245, y1: 78, x2: 360, y2: 150 }] },
      ],
    },
  },
  {
    id: 'drl-rondo',
    name: 'Rondo 5v2',
    category: 'drills',
    group: 'Possession',
    description: 'Keep-ball circle, two in the middle',
    scene: {
      name: 'Rondo 5v2',
      field: { preset: 'custom', half: 'full' },
      pieces: [
        { id: 'A1', kind: 'player', team: 'A', number: 1 },
        { id: 'A2', kind: 'player', team: 'A', number: 2 },
        { id: 'A3', kind: 'player', team: 'A', number: 3 },
        { id: 'A4', kind: 'player', team: 'A', number: 4 },
        { id: 'A5', kind: 'player', team: 'A', number: 5 },
        { id: 'B1', kind: 'player', team: 'B', number: 1 },
        { id: 'B2', kind: 'player', team: 'B', number: 2 },
        { id: 'ball', kind: 'ball' },
      ],
      frames: [
        { positions: { A1: { x: 200, y: 45 }, A2: { x: 305, y: 110 }, A3: { x: 265, y: 240 }, A4: { x: 135, y: 240 }, A5: { x: 95, y: 110 }, B1: { x: 180, y: 150 }, B2: { x: 230, y: 150 }, ball: { x: 200, y: 62 } }, markup: [] },
        { positions: { A1: { x: 200, y: 45 }, A2: { x: 305, y: 110 }, A3: { x: 265, y: 240 }, A4: { x: 135, y: 240 }, A5: { x: 95, y: 110 }, B1: { x: 245, y: 120 }, B2: { x: 210, y: 158 }, ball: { x: 297, y: 113 } }, markup: [{ type: 'arrow', x1: 205, y1: 55, x2: 292, y2: 108 }] },
        { positions: { A1: { x: 200, y: 45 }, A2: { x: 305, y: 110 }, A3: { x: 265, y: 240 }, A4: { x: 135, y: 240 }, A5: { x: 95, y: 110 }, B1: { x: 250, y: 178 }, B2: { x: 220, y: 185 }, ball: { x: 258, y: 222 } }, markup: [{ type: 'arrow', x1: 300, y1: 120, x2: 262, y2: 215 }] },
      ],
    },
  },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/library.test.js` then `node --test` (full suite).
Expected: PASS — library tests pass; full suite (scene/steps/storage/library) green.

- [ ] **Step 5: Commit**

```bash
git add js/library.js test/library.test.js
git commit -m "feat: library data module with validation test and two seed presets"
```

---

## Task 2: Library panel — browse & load

**Files:**
- Modify: `index.html`
- Modify: `js/app.js`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `LIBRARY` from `library.js`; the existing `loadScene(next)` in `app.js`.
- Produces: a working Library panel (button → tabs → grouped list → load).

- [ ] **Step 1: Add the Library button + panel to `index.html`**

(a) Add a Library button as the FIRST child of the top-bar `.top-actions` (before Setup):
```html
      <button id="btn-library" type="button">Library</button>
```

(b) Add the panel immediately after the existing `#panel-saveload` div (before the `<script>`):
```html
  <div id="panel-library" class="panel" hidden>
    <div class="panel-card">
      <h2>Library</h2>
      <div id="lib-tabs">
        <button class="lib-tab" type="button" data-cat="tactics" aria-pressed="true">Tactics</button>
        <button class="lib-tab" type="button" data-cat="drills">Drills</button>
      </div>
      <div id="lib-list"></div>
      <div class="panel-actions">
        <button id="library-close" type="button">Close</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 2: Wire the panel in `js/app.js`**

(a) Add the import with the other imports:
```javascript
import { LIBRARY } from './library.js';
```

(b) Add this block near the other panel wiring (e.g. after the Save/Load wiring). It relies on the existing `loadScene(next)` function:
```javascript
// ---- Library ----
const panelLibrary = document.getElementById('panel-library');
const libTabs = document.getElementById('lib-tabs');
const libList = document.getElementById('lib-list');
let currentLibCat = 'tactics';

function buildLibList() {
  libList.replaceChildren();
  const items = LIBRARY.filter((p) => p.category === currentLibCat);
  const groups = [];
  for (const p of items) if (!groups.includes(p.group)) groups.push(p.group);
  for (const grp of groups) {
    const label = document.createElement('div');
    label.className = 'lib-group';
    label.textContent = grp;
    libList.appendChild(label);
    for (const p of items.filter((x) => x.group === grp)) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'lib-row';
      const nm = document.createElement('span');
      nm.className = 'lib-nm';
      nm.textContent = p.name;
      const ds = document.createElement('span');
      ds.className = 'lib-ds';
      ds.textContent = p.description;
      row.append(nm, ds);
      row.addEventListener('click', () => {
        loadScene(JSON.parse(JSON.stringify(p.scene)));
        panelLibrary.hidden = true;
      });
      libList.appendChild(row);
    }
  }
}

libTabs.querySelectorAll('.lib-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentLibCat = btn.dataset.cat;
    libTabs.querySelectorAll('.lib-tab').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    buildLibList();
  });
});
document.getElementById('btn-library').addEventListener('click', () => { buildLibList(); panelLibrary.hidden = false; });
document.getElementById('library-close').addEventListener('click', () => { panelLibrary.hidden = true; });
```

- [ ] **Step 3: Style the panel in `styles.css`** (append)

```css
#lib-tabs { display: flex; gap: 20px; border-bottom: 1px solid #eceef1; }
.lib-tab { font-size: 13px; color: #8a9099; padding: 6px 0 10px; min-height: 0; }
.lib-tab[aria-pressed="true"] { color: #1b1f27; border-bottom: 1px solid #1b1f27; }
#lib-list { max-height: 52vh; overflow: auto; }
.lib-group { font-size: 10.5px; letter-spacing: 1.6px; text-transform: uppercase; color: #8a9099; margin: 14px 0 6px; font-weight: 500; }
.lib-row { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; width: 100%; text-align: left; padding: 9px 2px; border-bottom: 1px solid #f4f5f6; min-height: 40px; }
.lib-nm { font-size: 14px; font-weight: 500; color: #1b1f27; }
.lib-ds { font-size: 12px; color: #8a9099; text-align: right; }
```

- [ ] **Step 4: Verify**

Run: `node --check js/app.js` (no output) and `node --test` (full suite green — no logic changed). Browser verification of open/load is folded into Task 3 (controller), since only 2 seed presets exist yet.

- [ ] **Step 5: Commit**

```bash
git add index.html js/app.js styles.css
git commit -m "feat: Library panel with Tactics/Drills tabs and grouped preset list"
```

---

## Task 3: Author the remaining 12 presets (controller, browser-verified)

**This task is executed by the controller**, not a subagent: each preset is an animated scene whose coordinates must be tuned by eye (rendered + played in the browser). The unit test from Task 1 is the correctness gate (every preset must stay valid); the browser is the quality gate (it must look and play sensibly).

**Files:**
- Modify: `js/library.js` (append 12 preset entries)
- Modify: `test/library.test.js` (add the final count assertion)

For each preset below: choose the `field`, define the `pieces`, author 3 frames of positions that animate the described movement, and add per-frame green `arrow` markup for the key actions (and short ink `text` labels where useful). After authoring each, load it in the running app and press Play to confirm it reads correctly; adjust coordinates until it does. Keep `node --test test/library.test.js` green after every addition.

**Design briefs (each `category` / `group`, then the movement):**

1. **3v2 attack** — tactics / Small-sided. Custom field. 3 blue (A1–A3), 2 red (B1–B2), ball. F0: attackers spread across the middle third vs two defenders; F1: the ball-carrier drives to commit a defender while the others hold width; F2: the free man receives the through-ball and advances. Arrows: the committing run and the through-ball.
2. **Overlap** — tactics / Attacking patterns. Left half. Winger A1 (ball, wide), full-back A2 (inside/behind), defender B1, plus a target A3 centrally. F0: winger on the ball, FB deep; F1: FB sprints the overlap outside the winger as the winger holds; F2: winger releases the FB overlapping, FB whips a cross to A3. Arrows: overlap run, cross.
3. **Give-and-go (one-two)** — tactics / Attacking patterns. Custom. A1 (ball), A2 (wall), B1 (defender). F0: A1 carries toward B1 with A2 to the side; F1: A1 plays A2 and bursts past B1; F2: A2 first-times it back into A1's path beyond B1. Arrows: pass, return.
4. **Third-man run** — tactics / Attacking patterns. Custom. A1 (ball), A2 (link), A3 (runner), B1. F0: A1 on the ball, A3 deep; F1: A1 sets it to A2 as A3 starts the run; F2: A2 releases A3 running beyond the line. Arrows: set pass, release pass, run.
5. **Switch of play** — tactics / Attacking patterns. Custom (use full width). A1 (ball, left), A2 (central), A3 (right, free), plus 1–2 red pressing left. F0: play congested on the left; F1: ball worked to A2 centrally; F2: long diagonal to A3 free on the right. Arrows: the switch diagonal.
6. **Corner — near post** — tactics / Set pieces. Right half (attacking the right goal). Taker A1 at the corner, near-post runner A2, far target A3, defender B1, keeper B2, ball at the corner arc. F0: setup; F1: A2 makes the near-post run; F2: driven delivery to the near post, flick-on across. Arrows: run, delivery.
7. **Attacking throw-in** — tactics / Set pieces. Right half near the touchline. Thrower A1 (on the line), receiver A2, support A3, marker B1. F0: A1 ready to throw, A2 marked; F1: A2 checks to the ball and receives, A3 shows; F2: A2 lays it to A3 who drives forward. Arrows: throw, lay-off.
8. **Free-kick — screen & shot** — tactics / Set pieces. Right half near goal. Striker A1 over the ball, screen runner A2, a wall of 3 red (B1–B3), keeper B4. F0: wall set, keeper positioned; F1: A2 runs across the front of the wall to screen the keeper's view; F2: A1 strikes past the screen into the far corner. Arrows: screen run, shot.
9. **Passing pattern — Y-drill** — drills / Possession. Custom. A1–A3 plus 2–3 cones forming a Y. F0: players at the base and arms of the Y with cones; F1: pass up to the top and lay it back; F2: switch/release out to the far arm. Arrows: each pass.
10. **Finishing drill** — drills / Finishing. Right half. Server A1, finisher A2, a cone, keeper B1, ball with the server. F0: finisher waiting, server with the ball; F1: server feeds into the box as the finisher makes the run; F2: finisher strikes on goal. Arrows: feed, shot.
11. **1v1 defending to goal** — drills / Defending. Custom with a small goal (two cones) on one side. Attacker A1 (ball), defender B1. F0: attacker faces the defender with the goal behind; F1: attacker drives at the defender who jockeys; F2: the engagement — defender shepherds the attacker wide / makes the tackle. Arrows: attacker's drive.
12. **Dynamic warm-up passing grid** — drills / Warm-up. Custom grid with 4 corner cones and 4 blue players. F0: a player on each side with the ball at one corner; F1: pass along a side and follow the pass (jog to the next corner); F2: the next pass-and-follow, ball moving around the grid. Arrows: pass-and-follow on each active side.

- [ ] **Step 1: Author each preset** — append its entry to `LIBRARY` in `js/library.js` with `category`, `group`, `description`, and the authored `scene`. After each, run `node --test test/library.test.js` (must stay green) and load+Play it in the running app; tune coordinates until it reads well.

- [ ] **Step 2: Add the final count assertion to `test/library.test.js`**

```javascript
test('library ships 9 tactics and 5 drills', () => {
  assert.equal(LIBRARY.filter((p) => p.category === 'tactics').length, 9);
  assert.equal(LIBRARY.filter((p) => p.category === 'drills').length, 5);
});
```

- [ ] **Step 3: Verify**

Run: `node --test` — full suite green, including `library ships 9 tactics and 5 drills`.

- [ ] **Step 4: Commit**

```bash
git add js/library.js test/library.test.js
git commit -m "feat: author the full tactics & drills library (9 tactics, 5 drills)"
```

---

## Task 4: Whole-library browser verification (controller)

**Run by the controller.** Serve (`py -m http.server 8000`) and drive `http://localhost:8000`. Confirm:

1. The **Library** button opens the panel; **Tactics** shows 9 presets grouped by Small-sided / Attacking patterns / Set pieces; **Drills** shows 5 grouped by Possession / Finishing / Defending / Warm-up.
2. Loading each preset drops it on the board and closes the panel; pressing **Play** animates it sensibly; the ball/pieces/markup read correctly for each of the 14.
3. A loaded preset is editable (drag a piece), and **Save/Load** still works on it; loading a preset then a saved scene both behave.
4. No console errors; the panel is styled in the black-and-white identity.

Fix any preset that looks wrong (adjust its coordinates in `js/library.js`, keeping the unit test green).

---

## Self-Review Notes

- **Spec coverage:** data module + format (Task 1), validation incl. per-frame position coverage + counts (Tasks 1, 3), deep-copy load via `loadScene` (Task 2), Library button + panel + Tactics/Drills tabs + grouped list (Task 2), black-and-white styling (Task 2), 9 tactics + 5 drills content with their groups (Tasks 1, 3), browser verification (Task 4). All spec sections map to tasks.
- **Type consistency:** preset entry shape `{id,name,category,group,description,scene}` and the scene shape are identical across `library.js`, the test, and the app loader; the app calls the existing `loadScene(next)` (unchanged) with a deep copy. `#panel-library`/`#lib-tabs`/`#lib-list`/`.lib-tab`/`.lib-group`/`.lib-row` ids/classes match between index.html (Task 2), app.js (Task 2), and styles.css (Task 2).
- **Content authored by controller:** the animated presets need visual tuning, so Task 3 is controller-executed with the per-preset design briefs above as the requirements and the unit test as the correctness gate — the writing-plans "complete code" bar is met for the engine/UI (Tasks 1–2); the content's exact coordinates are set live and validated by the test.
- **No model/logic changes** ⇒ existing 26 tests untouched; the new library test grows the suite.
