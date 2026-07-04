# goalpad Visual Identity (Black-and-White) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin goalpad to a minimalist black-and-white editorial identity (white pitch, ink hairlines, outlined-ring players, classic Telstar ball, orange cones, green markup, self-hosted Space Grotesk, quiet white chrome) and add a per-label text color chooser.

**Architecture:** Purely visual plus one small additive feature. Render modules change — `field.js`, `tokens.js`, `tools.js` — plus `app.js` (text-color state), `styles.css`/`index.html` (light theme, self-hosted font, swatch UI), and a new `fonts/` directory. No scene-model / frames / playback / save-load logic changes, so the existing 26 `node:test` tests stay green. Each JS change is `node --check`ed; the visual result is verified in the browser by the controller after the last code task.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, SVG, self-hosted WOFF2. No build step, no runtime dependencies.

## Global Constraints (exact design tokens)

- **Neutrals:** Canvas `#FFFFFF`; Ink `#1B1F27` (lines, text, ball, active UI); Grey `#8A9099` (secondary/inactive); Hairline `#ECEEF1` (dividers/borders).
- **Accents (one job each):** Blue `#4E74AE` (Team A); Red `#C15F5B` (Team B); Orange `#CB8A52` cone (outline `#8A6234`); Green `#579870` (markup).
- **Type:** Space Grotesk, self-hosted (weights 300/400/500), used everywhere; light weights. Token numbers weight 500. Wordmark 300 lowercase.
- **Line weights:** pitch markings ink stroke `0.9`; player ring `1.3`; markup arrow/pen `4`.
- **Marks:** white pitch, ink hairline markings; outlined-ring players (white fill, team-color stroke + number, **no shadow**); classic Telstar ball (white + ink pentagons/seams/patches); muted-orange cone; green arrows/pen; text default **Ink** with a per-label color from {Ink `#1B1F27`, Blue `#4E74AE`, Red `#C15F5B`, Orange `#CB8A52`, Green `#579870`}.
- **Chrome:** white bars, hairline dividers, text-first tool labels (grey inactive, active Ink + underline), team toggle in accent colors, panels white; tap targets `min-height: 40px`.
- No behavior/logic changes; `node --test` stays 26/26.

---

## File Structure

```
fonts/                         # NEW: self-hosted Space Grotesk woff2 (300/400/500)
js/field.js    # white pitch + ink hairline markings
js/tokens.js   # outlined-ring players, Telstar ball, orange cone
js/tools.js    # green markup + per-label text color
js/app.js      # current-text-color state + swatch wiring
styles.css     # light theme, @font-face, chrome, swatch CSS
index.html     # theme-color, Text color swatch row markup
```

---

## Task 1: Theme foundation — fonts, light stylesheet, chrome markup

**Files:**
- Create: `fonts/space-grotesk-300.woff2`, `fonts/space-grotesk-400.woff2`, `fonts/space-grotesk-500.woff2`
- Rewrite: `styles.css`
- Modify: `index.html`

**Interfaces:**
- Produces: the light theme + self-hosted font; the ids/classes later tasks wire — `#text-colors` with `.swatch[data-color]` buttons.

- [ ] **Step 1: Download the Space Grotesk woff2 files**

Run:
```bash
mkdir -p fonts
for w in 300 400 500; do
  curl -sSL "https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk@latest/latin-$w-normal.woff2" -o "fonts/space-grotesk-$w.woff2"
done
ls -l fonts/
```
Expected: three `.woff2` files, each roughly 12–14 KB (non-zero). If any is 0 bytes or the download fails, STOP and report (do not commit empty font files).

- [ ] **Step 2: Rewrite `styles.css`** (replace the entire file)

```css
/* Space Grotesk — self-hosted */
@font-face { font-family: 'Space Grotesk'; font-weight: 300; font-style: normal; font-display: swap; src: url('fonts/space-grotesk-300.woff2') format('woff2'); }
@font-face { font-family: 'Space Grotesk'; font-weight: 400; font-style: normal; font-display: swap; src: url('fonts/space-grotesk-400.woff2') format('woff2'); }
@font-face { font-family: 'Space Grotesk'; font-weight: 500; font-style: normal; font-display: swap; src: url('fonts/space-grotesk-500.woff2') format('woff2'); }

* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  display: flex; flex-direction: column; height: 100vh;
  font-family: 'Space Grotesk', system-ui, sans-serif; font-weight: 300;
  overflow: hidden; touch-action: none;
  -webkit-user-select: none; user-select: none;
  background: #ffffff; color: #1b1f27;
  -webkit-font-smoothing: antialiased;
}
#topbar, #toolbar, #stepsbar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; background: #ffffff; flex: 0 0 auto;
}
#topbar { justify-content: space-between; border-bottom: 1px solid #eceef1; }
#toolbar { justify-content: center; flex-wrap: wrap; gap: 18px; border-top: 1px solid #eceef1; }
#stepsbar { gap: 14px; border-top: 1px solid #eceef1; }
.brand { font-weight: 300; font-size: 17px; letter-spacing: 1.2px; text-transform: lowercase; color: #1b1f27; }
.top-actions { display: flex; gap: 14px; }
#stage { flex: 1 1 auto; min-height: 0; display: flex; }
#board { width: 100%; height: 100%; display: block; background: #ffffff; touch-action: none; -webkit-tap-highlight-color: transparent; }
#scrub { flex: 1 1 auto; accent-color: #1b1f27; }

button, .tool {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 13px; font-weight: 400; letter-spacing: 0.3px;
  padding: 8px 4px; min-height: 40px;
  border: none; background: transparent; color: #8a9099; cursor: pointer;
}
.tool[aria-pressed="true"] { color: #1b1f27; border-bottom: 1px solid #1b1f27; }
button:active { opacity: 0.6; }
#step-label { min-width: 92px; text-align: center; font-variant-numeric: tabular-nums; color: #8a9099; font-size: 12.5px; }
.top-actions button { color: #8a9099; font-size: 12.5px; }

#team-toggle { display: inline-flex; gap: 12px; margin: 0 2px; }
.team { font-size: 13px; font-weight: 400; padding: 8px 2px; min-height: 40px; border: none; background: transparent; color: #8a9099; }
.team[data-team="A"][aria-pressed="true"] { color: #4e74ae; }
.team[data-team="B"][aria-pressed="true"] { color: #c15f5b; }

#text-colors { display: inline-flex; gap: 8px; align-items: center; padding: 0 4px; }
#text-colors[hidden] { display: none; }
.swatch { width: 20px; height: 20px; min-height: 20px; padding: 0; border-radius: 50%; border: 1px solid #eceef1; cursor: pointer; }
.swatch[aria-pressed="true"] { outline: 2px solid #1b1f27; outline-offset: 1px; }

#btn-del-step:disabled { opacity: 0.35; }

.panel { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(20,22,26,0.28); z-index: 10; }
.panel[hidden] { display: none; }
.panel-card { background: #ffffff; padding: 22px; border: 1px solid #eceef1; border-radius: 3px; width: min(92vw, 380px); display: flex; flex-direction: column; gap: 12px; box-shadow: 0 12px 40px rgba(20,22,26,0.12); }
.panel-card h2 { margin: 0 0 4px; font-weight: 500; font-size: 20px; color: #1b1f27; }
.panel-card h3 { margin: 8px 0 0; font-weight: 500; font-size: 14px; color: #1b1f27; }
.panel-card label { display: flex; justify-content: space-between; align-items: center; gap: 12px; color: #1b1f27; font-size: 14px; }
.panel-card select, .panel-card input[type="number"], .panel-card input[type="text"] { font-family: inherit; font-size: 14px; padding: 7px 9px; border-radius: 2px; border: 1px solid #d7dade; min-width: 120px; background: #fff; color: #1b1f27; }
.panel-note { font-size: 12.5px; color: #8a9099; margin: 0; }
.panel-actions { display: flex; justify-content: flex-end; gap: 8px; }
.panel-actions button, .saved-list button, .import-label { border: 1px solid #d7dade; border-radius: 2px; background: #fff; color: #1b1f27; padding: 8px 12px; min-height: 40px; font-size: 13px; }
.saved-list { list-style: none; padding: 0; margin: 0; max-height: 40vh; overflow: auto; }
.saved-list li { display: flex; justify-content: space-between; gap: 8px; padding: 6px 0; align-items: center; color: #1b1f27; }
.import-label { display: inline-flex; align-items: center; cursor: pointer; }

@media (max-width: 640px) {
  .brand { font-size: 15px; }
  #toolbar { gap: 12px; }
  .tool, .team { font-size: 12px; }
}
```

- [ ] **Step 3: Update `index.html`** — read the file first, then two edits:

(a) Change the theme-color meta to white:
```html
  <meta name="theme-color" content="#ffffff">
```

(b) Simplify the wordmark — remove the decorative glyph so the brand is just the lowercase word. Find the brand span (it currently reads `▦ goalpad`) and change its text to:
```html
    <span class="brand">goalpad</span>
```

(c) Add the Text color swatch row immediately AFTER the closing `</nav>` of `#toolbar` (before `<main id="stage">`):
```html
  <div id="text-colors" hidden>
    <button class="swatch" type="button" data-color="#1b1f27" aria-pressed="true" style="background:#1b1f27" title="Ink"></button>
    <button class="swatch" type="button" data-color="#4e74ae" style="background:#4e74ae" title="Blue"></button>
    <button class="swatch" type="button" data-color="#c15f5b" style="background:#c15f5b" title="Red"></button>
    <button class="swatch" type="button" data-color="#cb8a52" style="background:#cb8a52" title="Orange"></button>
    <button class="swatch" type="button" data-color="#579870" style="background:#579870" title="Green"></button>
  </div>
```
(Leave the toolbar tool buttons and their `data-tool`/`data-team` values unchanged — they are already text-first.)

- [ ] **Step 4: Verify**

Run: `node --test` (expect 26/26 — no JS changed). Confirm `fonts/` has three non-zero woff2 files and `styles.css` references them with relative `fonts/…` paths.

- [ ] **Step 5: Commit**

```bash
git add fonts styles.css index.html
git commit -m "feat: light black-and-white theme with self-hosted Space Grotesk and text-color swatches"
```

---

## Task 2: Pitch — white ground, ink hairlines

**Files:**
- Rewrite: `js/field.js`

**Interfaces:**
- Consumes: `fieldViewBox(field)` from `scene.js`.
- Produces: `renderField(svg, layerEl, field)` (unchanged signature) — draws a white ground then ink hairline markings.

- [ ] **Step 1: Rewrite `js/field.js`** (replace entire file)

```javascript
// field.js — DOM: white pitch with ink hairline markings.
import { fieldViewBox } from './scene.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const INK = '#1b1f27';

function el(name, attrs) {
  const n = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

export function renderField(svg, layerEl, field) {
  const { w, h } = fieldViewBox(field);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  layerEl.replaceChildren();

  // white ground (covers the pitch area; letterbox comes from #board CSS bg)
  layerEl.appendChild(el('rect', { x: 0, y: 0, width: w, height: h, fill: '#ffffff' }));

  const g = el('g', { stroke: INK, 'stroke-width': '0.9', fill: 'none' });
  g.appendChild(el('rect', { x: 6, y: 6, width: w - 12, height: h - 12 }));

  const centreR = Math.min(w, h) * 0.09;
  const dot = (cx, cy) => el('circle', { cx, cy, r: 2.6, fill: INK, stroke: 'none' });

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

Run: `node --check js/field.js` (no output) and `node --test` (26/26).

- [ ] **Step 3: Commit**

```bash
git add js/field.js
git commit -m "feat: white pitch with ink hairline markings"
```

---

## Task 3: Tokens — outlined rings, Telstar ball, orange cone

**Files:**
- Rewrite: `js/tokens.js`

**Interfaces:**
- Consumes: scene pieces + a frame's `positions`.
- Produces: `clientToSvg`, `renderTokens(svg, layerEl, scene, frame, getTool, onChange)`, `setTokenPositions(layerEl, positionsMap)` — signatures unchanged; visuals updated.

- [ ] **Step 1: Rewrite `js/tokens.js`** (replace entire file)

```javascript
// tokens.js — DOM: outlined-ring players, classic Telstar ball, orange cone.
const SVGNS = 'http://www.w3.org/2000/svg';
const COLORS = { A: '#4e74ae', B: '#c15f5b' };
const INK = '#1b1f27';
const R = 13.5; // player ring radius (viewBox units)

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

// Classic Telstar ball as an inner <svg> so the rim patches clip to the disc.
function ballShape() {
  const s = el('svg', { x: -9, y: -9, width: 18, height: 18, viewBox: '-44 -44 88 88' });
  const clip = el('clipPath', { id: 'ballclip' });
  clip.appendChild(el('circle', { r: 40 }));
  s.appendChild(clip);
  s.appendChild(el('circle', { r: 40, fill: '#ffffff', stroke: INK, 'stroke-width': '2.6' }));
  const marks = el('g', { 'clip-path': 'url(#ballclip)', fill: INK });
  marks.appendChild(el('path', { d: 'M0,-15 L14.27,-4.63 L8.82,12.14 L-8.82,12.14 L-14.27,-4.63 Z' }));
  const seams = el('g', { stroke: INK, 'stroke-width': '3', 'stroke-linecap': 'round', fill: 'none' });
  for (const [x1, y1, x2, y2] of [
    [0, -15, 0, -36], [14.27, -4.63, 34.2, -11.1], [8.82, 12.14, 21.2, 29.1],
    [-8.82, 12.14, -21.2, 29.1], [-14.27, -4.63, -34.2, -11.1],
  ]) seams.appendChild(el('line', { x1, y1, x2, y2 }));
  marks.appendChild(seams);
  for (const d of [
    'M0,-43 L6.66,-38.16 L4.11,-30.34 L-4.11,-30.34 L-6.66,-38.16 Z',
    'M34.2,-18.1 L40.86,-13.26 L38.31,-5.44 L30.09,-5.44 L27.54,-13.26 Z',
    'M21.2,22.1 L27.86,26.94 L25.31,34.76 L17.09,34.76 L14.54,26.94 Z',
    'M-21.2,22.1 L-14.54,26.94 L-17.09,34.76 L-25.31,34.76 L-27.86,26.94 Z',
    'M-34.2,-18.1 L-27.54,-13.26 L-30.09,-5.44 L-38.31,-5.44 L-40.86,-13.26 Z',
  ]) marks.appendChild(el('path', { d }));
  s.appendChild(marks);
  return [s];
}

function shapeFor(piece) {
  if (piece.kind === 'player') {
    const c = el('circle', { r: R, fill: '#ffffff', stroke: COLORS[piece.team], 'stroke-width': '1.3' });
    const t = el('text', {
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-family': 'Space Grotesk, system-ui, sans-serif', 'font-size': '13', 'font-weight': '500',
      fill: COLORS[piece.team],
    });
    t.textContent = String(piece.number);
    return [c, t];
  }
  if (piece.kind === 'ball') return ballShape();
  // cone
  return [el('path', { d: 'M0,-11 L-9,8 L9,8 Z', fill: '#cb8a52', stroke: '#8a6234', 'stroke-width': '1.2' })];
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

Run: `node --check js/tokens.js` (no output) and `node --test` (26/26).

- [ ] **Step 3: Commit**

```bash
git add js/tokens.js
git commit -m "feat: outlined-ring players, Telstar ball, orange cone"
```

---

## Task 4: Markup color + per-label text color chooser

**Files:**
- Modify: `js/tools.js`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `#text-colors .swatch[data-color]` (from Task 1); `clientToSvg` from `tokens.js`.
- Produces: green markup; text markup carries a `color`; `initTools` accepts `getTextColor`.

- [ ] **Step 1: Recolor markup and add text color in `js/tools.js`**

(a) Replace **every** `#f0cf55` with `#579870` (three occurrences: the arrowhead marker `path` fill, the arrow `line` stroke, the pen `path` stroke).

(b) In `renderMarkup`'s `drawOne`, change the `text` branch so the label uses its stored color and Space Grotesk. Find:
```javascript
  } else if (a.type === 'text') {
    node = el('text', { x: a.x, y: a.y, fill: '#ffffff', 'font-size': '20', 'font-weight': '700', 'text-anchor': 'middle' });
    node.textContent = a.text;
  }
```
Replace with:
```javascript
  } else if (a.type === 'text') {
    node = el('text', { x: a.x, y: a.y, fill: a.color || '#1b1f27', 'font-family': 'Space Grotesk, system-ui, sans-serif', 'font-size': '20', 'font-weight': '500', 'text-anchor': 'middle' });
    node.textContent = a.text;
  }
```

(c) Add `getTextColor` to the `initTools` options destructure. Find:
```javascript
export function initTools(svg, markupLayer, { getScene, getFrame, getTool, getTeam, onSceneChange, onMarkupChange }) {
```
Replace with:
```javascript
export function initTools(svg, markupLayer, { getScene, getFrame, getTool, getTeam, getTextColor, onSceneChange, onMarkupChange }) {
```

(d) In the `pointerdown` handler's text branch, store the current color on the new text object. Find:
```javascript
    else if (tool === 'text') {
      const text = window.prompt('Label text:');
      if (text) { getFrame().markup.push({ type: 'text', x: Math.round(x), y: Math.round(y), text }); onMarkupChange(); }
    }
```
Replace with:
```javascript
    else if (tool === 'text') {
      const text = window.prompt('Label text:');
      if (text) { getFrame().markup.push({ type: 'text', x: Math.round(x), y: Math.round(y), text, color: getTextColor() }); onMarkupChange(); }
    }
```

- [ ] **Step 2: Wire the text color state in `js/app.js`**

(a) Add the state next to the other tool state (near `let currentTool` / `let currentTeam`):
```javascript
let currentTextColor = '#1b1f27';
```

(b) Add `getTextColor` to the `initTools` call's options object. Find the existing call:
```javascript
initTools(board, layerAnnotations, {
  getScene: () => scene,
  getFrame: () => frame(),
  getTool: () => currentTool,
  getTeam: () => currentTeam,
  onSceneChange: () => { renderTokens(board, layerTokens, scene, frame(), () => currentTool, () => {}); },
  onMarkupChange: () => { renderMarkup(layerAnnotations, frame()); },
});
```
Add the `getTextColor` line so it reads:
```javascript
initTools(board, layerAnnotations, {
  getScene: () => scene,
  getFrame: () => frame(),
  getTool: () => currentTool,
  getTeam: () => currentTeam,
  getTextColor: () => currentTextColor,
  onSceneChange: () => { renderTokens(board, layerTokens, scene, frame(), () => currentTool, () => {}); },
  onMarkupChange: () => { renderMarkup(layerAnnotations, frame()); },
});
```

(c) Show/hide the swatch row when the Text tool is active. In the tool-selection click handler, find:
```javascript
document.querySelectorAll('.tool').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentTool = btn.dataset.tool;
    document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  });
});
```
Replace with:
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

- [ ] **Step 3: Verify**

Run: `node --check js/tools.js`, `node --check js/app.js` (no output), and `node --test` (26/26). Grep to confirm zero `#f0cf55` remain in `js/tools.js`.

- [ ] **Step 4: Commit**

```bash
git add js/tools.js js/app.js
git commit -m "feat: green markup and per-label text color chooser"
```

---

## Task 5: Browser verification (controller)

**Run by the controller** (needs a display). Serve (`py -m http.server 8000`) and drive `http://localhost:8000`. Confirm:

1. **Type:** Space Grotesk actually loaded (self-hosted, no network font request) — the wordmark and labels render in it.
2. **Pitch:** white with ink hairline markings; half-pitch (Setup → Left/Right) letterbox is white.
3. **Players:** outlined rings — white fill, muted blue `#4E74AE` / red `#C15F5B` stroke + number, no shadow.
4. **Ball:** classic black-and-white Telstar at center (pentagons read at board size).
5. **Cone:** muted orange.
6. **Markup:** arrow/pen draw in green `#579870`.
7. **Text color chooser:** selecting the **Text** tool reveals the swatch row; create one label in **Ink** and one in an accent (e.g. Blue), confirm each renders in its color; **save then reload/load** the scene and confirm the label colors persist.
8. **Chrome:** white bars, hairline dividers, text-first labels (grey inactive, active ink + underline), team toggle Blue/Red in color; buttons remain tappable.
9. **No console errors**; drag / add players / frames / Play / save-load still work.

Fix any defect (dispatch a fix subagent) before completing.

---

## Self-Review Notes

- **Spec coverage:** fonts + typography (Task 1), light chrome + panels + theme-color (Task 1), white pitch + ink hairlines (Task 2), ring players + Telstar ball + orange cone + no-shadow (Tasks 1 CSS, 3), green markup (Task 4), per-label text color chooser incl. storage round-trip (Tasks 1 markup+CSS, 4, verified Task 5), tap targets preserved (Task 1). All spec sections map to tasks.
- **Type consistency:** `initTools` options object gains `getTextColor` in both the definition (Task 4 tools.js) and the call site (Task 4 app.js); text markup `color` field is written in `initTools` and read in `renderMarkup`, defaulting to `#1b1f27`. `#text-colors` / `.swatch` / `data-color` ids match between index.html (Task 1) and app.js (Task 4). All render signatures (`renderField`, `renderTokens`, `setTokenPositions`, `clientToSvg`, `renderMarkup`) are unchanged, so Group A/B integration and the 26 tests are unaffected.
- **Storage:** text `color` needs no schema change — markup objects are serialized verbatim inside each frame; older labels without `color` fall back to Ink.
- **No new pure logic ⇒ no new unit tests**; every task re-runs `node --test` as a regression guard.
