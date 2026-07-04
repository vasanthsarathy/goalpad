# goalpad Redesign Stage 1 — Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin goalpad to the monochrome "three shapes, two values, one colour" guidelines — value-based teams (solid ink vs open paper), a red-dot ball, ink cone/arrow/pen/text, Jost type, three line weights, square corners — on the current app structure.

**Architecture:** Purely visual. Render modules change — `field.js`, `tokens.js`, `tools.js` — plus `app.js` (remove the text-color chooser), `styles.css`/`index.html` (new theme, self-hosted Jost), and the `fonts/` directory. No scene-model / frames / playback / save-load / library changes, so existing tests stay green. Each JS change is `node --check`ed; the visual result is verified in the browser by the controller.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, SVG, self-hosted WOFF2. No build step, no runtime dependencies.

## Global Constraints (exact tokens)

- **Colours:** Paper `#FFFFFF`; Ink `#0A0A0A`; Mute `#949494`; Signal `#E10600` (ball + scrub playhead only).
- **Teams by value:** Team A = solid ink disc (fill `#0A0A0A`, number `#FFFFFF`); Team B = open disc (fill `#FFFFFF`, ink stroke `1.5`, number `#0A0A0A`). Ball = red dot (fill `#E10600`, r 8). Cone = ink triangle outline (fill none, stroke `1.5`).
- **Ink marks:** arrow/pen stroke `#0A0A0A` width `1.5`; arrowhead is an **open chevron** (unfilled ink stroke); text always ink `#0A0A0A` (no color chooser).
- **Line weights:** hairline `1` (pitch markings, UI dividers); line `1.5` (tokens, arrows, pen); active `2` (selected-tool underline).
- **Type:** Jost self-hosted (weights 300/400/500), stack `'Jost','Space Grotesk',Futura,system-ui,sans-serif`; wordmark 300 + red dot; token numbers 500.
- **Labels:** uppercase, 11px, letter-spacing `.14em`, weight 500; mute inactive, ink + 2px underline active. No button boxes.
- **Form:** square corners (radius 0) everywhere except circular tokens; no shadows/gradients; panels have a 1px ink border and a scrim backdrop. Tap targets `min-height: 40px`. `theme-color` `#FFFFFF`.
- No behavior/logic changes; existing `node --test` suite stays green.

---

## File Structure

```
fonts/                 # replace: Jost woff2 (300/400/500); remove Space Grotesk woff2
js/field.js            # ink hairline markings
js/tokens.js           # value-based players, red-dot ball, ink cone, Jost numbers
js/tools.js            # ink arrow/pen (open chevron), ink text, drop text-color
js/app.js              # remove currentTextColor + swatch wiring
styles.css             # new monochrome theme, Jost, engraved labels, square corners
index.html             # wordmark dot, A/B toggle, remove swatch row, theme-color
```

---

## Task 1: Theme foundation — Jost, monochrome stylesheet, chrome markup

**Files:**
- Create: `fonts/jost-300.woff2`, `fonts/jost-400.woff2`, `fonts/jost-500.woff2`
- Delete: `fonts/space-grotesk-300.woff2`, `fonts/space-grotesk-400.woff2`, `fonts/space-grotesk-500.woff2`
- Rewrite: `styles.css`
- Modify: `index.html`

- [ ] **Step 1: Swap the font files**

```bash
for w in 300 400 500; do
  curl -sSL "https://cdn.jsdelivr.net/fontsource/fonts/jost@latest/latin-$w-normal.woff2" -o "fonts/jost-$w.woff2"
done
rm -f fonts/space-grotesk-300.woff2 fonts/space-grotesk-400.woff2 fonts/space-grotesk-500.woff2
ls -l fonts/
```
Expected: three `jost-*.woff2` (each non-zero, roughly 15–30 KB); no `space-grotesk-*.woff2` remain. If any Jost download is 0 bytes or fails, STOP and report (do not commit empty fonts).

- [ ] **Step 2: Rewrite `styles.css`** (replace the entire file)

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
#topbar, #toolbar, #stepsbar {
  display: flex; align-items: center; gap: 16px;
  padding: 10px 16px; background: #ffffff; flex: 0 0 auto;
}
#topbar { justify-content: space-between; border-bottom: 1px solid #0a0a0a; }
#toolbar { justify-content: center; flex-wrap: wrap; gap: 22px; border-top: 1px solid #0a0a0a; }
#stepsbar { gap: 16px; border-top: 1px solid #0a0a0a; }
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

#team-toggle { display: inline-flex; gap: 12px; margin: 0 2px; }
.team { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 500; padding: 8px 0; min-height: 40px; border: none; border-bottom: 2px solid transparent; background: transparent; color: #949494; }
.team[aria-pressed="true"] { color: #0a0a0a; border-bottom-color: #0a0a0a; }

#btn-del-step:disabled { opacity: 0.35; }

.panel { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(10,10,10,0.28); z-index: 10; }
.panel[hidden] { display: none; }
.panel-card { background: #ffffff; padding: 24px; border: 1px solid #0a0a0a; border-radius: 0; width: min(92vw, 380px); display: flex; flex-direction: column; gap: 16px; }
.panel-card h2 { margin: 0; font-weight: 400; font-size: 20px; letter-spacing: 0.01em; color: #0a0a0a; }
.panel-card h3 { margin: 8px 0 0; font-weight: 500; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #0a0a0a; }
.panel-card label { display: flex; justify-content: space-between; align-items: center; gap: 12px; color: #0a0a0a; font-size: 14px; }
.panel-card select, .panel-card input[type="number"], .panel-card input[type="text"] { font-family: inherit; font-size: 14px; padding: 8px; border-radius: 0; border: 1px solid #0a0a0a; min-width: 120px; background: #fff; color: #0a0a0a; }
.panel-note { font-size: 12.5px; color: #949494; margin: 0; }
.panel-actions { display: flex; justify-content: flex-end; gap: 8px; }
.panel-actions button, .saved-list button, .import-label { border: 1px solid #0a0a0a; border-radius: 0; background: #fff; color: #0a0a0a; padding: 8px 12px; min-height: 40px; border-bottom: 1px solid #0a0a0a; }
.saved-list { list-style: none; padding: 0; margin: 0; max-height: 40vh; overflow: auto; }
.saved-list li { display: flex; justify-content: space-between; gap: 8px; padding: 8px 0; align-items: center; color: #0a0a0a; font-size: 14px; }
.import-label { display: inline-flex; align-items: center; cursor: pointer; }

#lib-tabs { display: flex; gap: 22px; border-bottom: 1px solid #0a0a0a; }
.lib-tab { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 500; color: #949494; padding: 6px 0 10px; min-height: 0; }
.lib-tab[aria-pressed="true"] { color: #0a0a0a; border-bottom-color: #0a0a0a; }
#lib-list { max-height: 52vh; overflow: auto; }
.lib-group { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #949494; margin: 16px 0 6px; font-weight: 500; }
.lib-row { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; width: 100%; text-align: left; padding: 9px 0; border-bottom: 1px solid #ececec; min-height: 40px; text-transform: none; letter-spacing: normal; font-size: 14px; font-weight: 400; }
.lib-nm { font-size: 14px; font-weight: 400; color: #0a0a0a; }
.lib-ds { font-size: 12px; color: #949494; text-align: right; }

@media (max-width: 640px) {
  .brand { font-size: 15px; }
  #toolbar { gap: 14px; }
}
```

- [ ] **Step 3: Edit `index.html`** — read the file first, then:

(a) Ensure the theme-color meta is white:
```html
  <meta name="theme-color" content="#ffffff">
```

(b) Give the wordmark a red dot — change the brand span to:
```html
    <span class="brand">goalpad<span class="dot"></span></span>
```

(c) Relabel the team toggle (teams are value now, not hue) — the two `.team` buttons become:
```html
      <button class="team" data-team="A" aria-pressed="true">A</button>
      <button class="team" data-team="B">B</button>
```
(Keep the `data-team` values `A`/`B` and the `aria-pressed` on A; only the visible text changes.)

(d) Delete the entire `<div id="text-colors" hidden> … </div>` swatch-row block (the Text color chooser is removed).

(Leave the tool buttons and their `data-tool` values unchanged — CSS uppercases the labels.)

- [ ] **Step 4: Verify**

Run: `node --test` (expect the full suite green — no JS changed). Confirm `fonts/` has three `jost-*.woff2` and no `space-grotesk-*`, and `styles.css` references `fonts/jost-*.woff2`; grep `index.html` to confirm the `#text-colors` block is gone and the wordmark has `<span class="dot">`.

- [ ] **Step 5: Commit**

```bash
git add fonts styles.css index.html
git commit -m "feat: monochrome theme with self-hosted Jost, engraved labels, square corners"
```

---

## Task 2: Pitch — ink hairline markings

**Files:**
- Rewrite: `js/field.js`

**Interfaces:**
- Consumes: `fieldViewBox(field)` from `scene.js`.
- Produces: `renderField(svg, layerEl, field)` (unchanged signature) — white ground + ink hairline markings.

- [ ] **Step 1: Rewrite `js/field.js`** (replace entire file)

```javascript
// field.js — DOM: white pitch with ink hairline markings.
import { fieldViewBox } from './scene.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const INK = '#0a0a0a';

function el(name, attrs) {
  const n = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

export function renderField(svg, layerEl, field) {
  const { w, h } = fieldViewBox(field);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  layerEl.replaceChildren();

  layerEl.appendChild(el('rect', { x: 0, y: 0, width: w, height: h, fill: '#ffffff' }));

  const g = el('g', { stroke: INK, 'stroke-width': '1', fill: 'none' });
  g.appendChild(el('rect', { x: 6, y: 6, width: w - 12, height: h - 12 }));

  const centreR = Math.min(w, h) * 0.09;
  const dot = (cx, cy) => el('circle', { cx, cy, r: 2.5, fill: INK, stroke: 'none' });

  const boxDepth = Math.min(w * 0.16, 165);
  const penH = Math.min(h * 0.6, 403);
  const goalH = Math.min(h * 0.3, 183);
  const goalDepth = Math.min(w * 0.05, 55);
  const drawGoal = (side) => {
    if (w <= 130) return;
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
    g.appendChild(el('line', { x1: w - 6, y1: 6, x2: w - 6, y2: h - 6 }));
    g.appendChild(el('circle', { cx: w - 6, cy: h / 2, r: centreR }));
    g.appendChild(dot(w - 6, h / 2));
    drawGoal('left');
  } else {
    g.appendChild(el('line', { x1: 6, y1: 6, x2: 6, y2: h - 6 }));
    g.appendChild(el('circle', { cx: 6, cy: h / 2, r: centreR }));
    g.appendChild(dot(6, h / 2));
    drawGoal('right');
  }

  layerEl.appendChild(g);
}
```

- [ ] **Step 2: Verify**

Run: `node --check js/field.js` (no output) and `node --test` (full suite green).

- [ ] **Step 3: Commit**

```bash
git add js/field.js
git commit -m "feat: ink hairline pitch markings"
```

---

## Task 3: Tokens — value-based players, red-dot ball, ink cone

**Files:**
- Rewrite: `js/tokens.js`

**Interfaces:**
- Consumes: scene pieces + a frame's `positions`.
- Produces: `clientToSvg`, `renderTokens(svg, layerEl, scene, frame, getTool, onChange)`, `setTokenPositions(layerEl, positionsMap)` — signatures unchanged; visuals updated.

- [ ] **Step 1: Rewrite `js/tokens.js`** (replace entire file)

```javascript
// tokens.js — DOM: value-based players (A solid ink / B open paper), red-dot ball, ink cone.
const SVGNS = 'http://www.w3.org/2000/svg';
const INK = '#0a0a0a';
const PAPER = '#ffffff';
const SIGNAL = '#e10600';
const R = 13.5; // player radius (viewBox units)

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
    const c = el('circle', {
      r: R,
      fill: solid ? INK : PAPER,
      stroke: solid ? 'none' : INK,
      'stroke-width': solid ? '0' : '1.5',
    });
    const t = el('text', {
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-family': 'Jost, Space Grotesk, Futura, sans-serif', 'font-size': '13', 'font-weight': '500',
      fill: solid ? PAPER : INK,
    });
    t.textContent = String(piece.number);
    return [c, t];
  }
  if (piece.kind === 'ball') {
    return [el('circle', { r: 8, fill: SIGNAL })];
  }
  // cone — ink triangle outline
  return [el('path', { d: 'M0,-11 L-9,8 L9,8 Z', fill: 'none', stroke: INK, 'stroke-width': '1.5' })];
}

function makeDraggable(svg, groupEl, frame, id, getTool, onChange) {
  let dragging = false;
  groupEl.addEventListener('pointerdown', (e) => {
    if (getTool() !== 'select') return;
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
    g.style.cursor = 'grab';
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

- [ ] **Step 2: Verify**

Run: `node --check js/tokens.js` (no output) and `node --test` (full suite green).

- [ ] **Step 3: Commit**

```bash
git add js/tokens.js
git commit -m "feat: value-based player discs, red-dot ball, ink cone"
```

---

## Task 4: Markup + remove the text-color chooser

**Files:**
- Modify: `js/tools.js`
- Modify: `js/app.js`

**Interfaces:**
- Produces: ink markup with an open-chevron arrowhead; text always ink; `initTools` no longer takes `getTextColor`.

- [ ] **Step 1: Recolor markup and simplify text in `js/tools.js`** — read the file first, then:

(a) In `ensureMarker`, make the arrowhead an **open ink chevron** (unfilled). Find the marker path append (currently a filled `#579870` triangle) and replace it with:
```javascript
  marker.appendChild(el('path', { d: 'M0,0 L6,3 L0,6', fill: 'none', stroke: '#0a0a0a', 'stroke-width': '1.2', 'stroke-linecap': 'round' }));
```

(b) Recolor the arrow `line` stroke and the pen `path` stroke in `drawOne` from `#579870` to `#0a0a0a` (two occurrences).

(c) In `drawOne`'s `text` branch, make text always ink and Jost — replace it with:
```javascript
  } else if (a.type === 'text') {
    node = el('text', { x: a.x, y: a.y, fill: '#0a0a0a', 'font-family': 'Jost, Space Grotesk, Futura, sans-serif', 'font-size': '20', 'font-weight': '500', 'text-anchor': 'middle' });
    node.textContent = a.text;
  }
```

(d) Remove `getTextColor` from the `initTools` options destructure — change:
```javascript
export function initTools(svg, markupLayer, { getScene, getFrame, getTool, getTeam, getTextColor, onSceneChange, onMarkupChange }) {
```
to:
```javascript
export function initTools(svg, markupLayer, { getScene, getFrame, getTool, getTeam, onSceneChange, onMarkupChange }) {
```

(e) In the `pointerdown` text branch, drop the stored color — change:
```javascript
      if (text) { getFrame().markup.push({ type: 'text', x: Math.round(x), y: Math.round(y), text, color: getTextColor() }); onMarkupChange(); }
```
to:
```javascript
      if (text) { getFrame().markup.push({ type: 'text', x: Math.round(x), y: Math.round(y), text }); onMarkupChange(); }
```

- [ ] **Step 2: Remove the text-color state and wiring in `js/app.js`** — read the file first, then:

(a) Delete the `let currentTextColor = '#1b1f27';` line.

(b) In the `initTools(board, layerAnnotations, { … })` call, delete the `getTextColor: () => currentTextColor,` line.

(c) In the tool-selection wiring, delete the swatch-row block and the show/hide line. Change:
```javascript
const textColors = document.getElementById('text-colors');
document.querySelectorAll('.tool').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentTool = btn.dataset.tool;
    document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    textColors.hidden = currentTool !== 'text';
  });
});
textColors.querySelectorAll('.swatch').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentTextColor = btn.dataset.color;
    textColors.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  });
});
```
to:
```javascript
document.querySelectorAll('.tool').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentTool = btn.dataset.tool;
    document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  });
});
```

- [ ] **Step 3: Verify**

Run: `node --check js/tools.js`, `node --check js/app.js` (no output), and `node --test` (full suite green). Grep to confirm zero `#579870` remain in `js/tools.js` and no `currentTextColor`/`text-colors` reference remains in `js/app.js`.

- [ ] **Step 4: Commit**

```bash
git add js/tools.js js/app.js
git commit -m "feat: ink markup with open-chevron arrowhead; remove text-color chooser"
```

---

## Task 5: Browser verification (controller)

**Run by the controller.** Serve (`py -m http.server 8000`) and drive `http://localhost:8000`. Confirm:

1. **Type:** Jost loaded (self-hosted, no network font request) — wordmark and labels render in it; the wordmark has a red dot.
2. **Pieces:** Team A = solid ink discs with white numbers; Team B = open (white) discs with ink stroke + ink numbers; **ball is a red dot**; cone is an ink triangle outline.
3. **Marks:** pitch + dividers are ink hairlines; arrow/pen are ink with an **open-chevron** head; text tool creates **ink** text and shows **no color chooser**.
4. **Chrome:** engraved uppercase labels — mute inactive, ink + 2px underline active; team toggle shows "A"/"B"; square corners on panels/buttons; scrub playhead is red.
5. **Regression:** a loaded **library preset** still renders and plays in the new look; drag / add players (A and B) / frames / Play / save-load still work; half-pitch letterbox is white; no console errors.

Fix any defect (dispatch a fix subagent) before completing.

---

## Self-Review Notes

- **Spec coverage:** palette + Jost + labels + square corners + dividers (Task 1), ink hairline pitch (Task 2), value-based players + red-dot ball + ink cone + Jost numbers (Task 3), ink arrow/pen + open chevron + ink text + remove text-color chooser (Task 4), browser verification incl. preset/regression (Task 5). All spec sections map to tasks.
- **Type consistency:** `renderField`/`renderTokens`/`setTokenPositions`/`clientToSvg` signatures unchanged; `initTools` options lose exactly `getTextColor` in both the definition (tools.js) and call site (app.js); the text `color` field is dropped on new text and ignored on render (old data still valid). `.team` data-team values and `data-tool` values unchanged (only visible text/casing changes). So the scene model, storage, library, and existing tests are unaffected.
- **Fonts:** Jost self-hosted via relative `fonts/…` paths (resolve on the GitHub Pages subdirectory site); no external font call.
- **No new pure logic ⇒ no new unit tests**; every task re-runs `node --test` as the regression guard.
