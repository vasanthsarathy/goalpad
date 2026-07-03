# goalpad Group B — Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle goalpad to a modern, clean, sharp look — a deep muted striped pitch, smaller sharper tokens with a hairline dark edge and drop shadow, a small soccer ball, an amber cone, muted markup, and flat/tight chrome.

**Architecture:** Purely visual. Four render/style modules change — `field.js` (pitch), `tokens.js` (pieces), `tools.js` (markup color), and `styles.css`/`index.html` (chrome). No scene-model, frames, playback, or interaction-logic changes, so the existing 26 `node:test` tests must stay green. Each JS change is `node --check`ed; the visual result is verified in the browser by the controller after the last task.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, SVG. No build step, no dependencies, no web fonts.

## Global Constraints (exact design-token values)

- **Turf stripes:** vertical bands alternating `#2f5f45` / `#2b5940`, fixed stripe width 105 viewBox units, covering the full viewBox (full and half views).
- **Pitch markings:** white `rgba(255,255,255,0.9)`, stroke-width `1.4`.
- **Player token:** radius `13.5`; fill Team A `#4a6fa5`, Team B `#cf6b5a`; ring `rgba(0,0,0,0.32)` width `1.6`; number `#fff` bold font-size `13`.
- **Token lift:** CSS `drop-shadow(0 2px 3px rgba(5,18,11,0.5))` on `#layer-tokens`.
- **Ball:** white `#fff` disc radius `8`, outline `#152218` width `1.2`, central pentagon `#152218`, five seams `#152218` width `0.9`.
- **Cone:** fill `#d9a441`, outline `#3a2a00` width `1.4`.
- **Markup (arrow/pen/text):** `#f0cf55` (strokes + arrowhead); text labels stay `#fff`.
- **Chrome:** surface/board `#0f1216`; bars `#12161b` with `1px` hairline borders `#222932`; buttons background `#1b212a`, `1px` border `#2a323d`, border-radius `2px`, font ~13px, `min-height: 40px` (tap target preserved); active tool `#3a5fa0`; team toggle active A `#4a6fa5` / B `#cf6b5a`; panels border-radius `3px`; scrub accent `#4a6fa5`.
- **Labels:** tool buttons are text-first (no decorative emojis); team toggle Team B label is "Red"; keep `🗑` on the Delete-frame button and `◀ ▶`/`▶ Play` glyphs.
- No behavior/logic changes; `node --test` stays 26/26.

---

## File Structure

```
js/field.js    # pitch: striped turf + thinner markings
js/tokens.js   # pieces: smaller players + hairline ring + team colors, soccer ball, amber cone
js/tools.js    # markup color
styles.css     # chrome flatten + board bg + token drop-shadow
index.html     # tool labels (text-first), team "Red", theme-color
```

---

## Task 1: Pitch — striped turf + thinner markings

**Files:**
- Rewrite: `js/field.js`
- Modify: `styles.css` (the `#board` background rule)

**Interfaces:**
- Consumes: `fieldViewBox(field)` from `scene.js`.
- Produces: `renderField(svg, layerEl, field)` — unchanged signature; now draws striped turf then thinner markings.

- [ ] **Step 1: Rewrite `js/field.js`** (replace entire file)

```javascript
// field.js — DOM: striped turf + pitch markings for full / left / right into a <g> layer.
import { fieldViewBox } from './scene.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const STRIPE_W = 105;               // viewBox units per mowing stripe
const TURF_A = '#2f5f45';
const TURF_B = '#2b5940';

function el(name, attrs) {
  const node = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export function renderField(svg, layerEl, field) {
  const { w, h } = fieldViewBox(field);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  layerEl.replaceChildren();

  // Striped turf (vertical mowing bands), drawn first.
  const turf = el('g', {});
  const n = Math.ceil(w / STRIPE_W);
  for (let i = 0; i < n; i++) {
    const x = i * STRIPE_W;
    const sw = Math.min(STRIPE_W, w - x);
    turf.appendChild(el('rect', { x, y: 0, width: sw, height: h, fill: i % 2 ? TURF_B : TURF_A }));
  }
  layerEl.appendChild(turf);

  // Thin, crisp markings.
  const g = el('g', { stroke: 'rgba(255,255,255,0.9)', 'stroke-width': '1.4', fill: 'none' });
  g.appendChild(el('rect', { x: 6, y: 6, width: w - 12, height: h - 12 }));

  const centreR = Math.min(w, h) * 0.09;
  const dot = (cx, cy) => el('circle', { cx, cy, r: 3, fill: 'rgba(255,255,255,0.9)', stroke: 'none' });

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

- [ ] **Step 2: Update the `#board` background in `styles.css`**

Read `styles.css`, find the `#board` rule that sets `background: #2f7a3f;` and change that background to the dark surface (so half-pitch letterbox areas read as chrome, not green):

```css
#board { width: 100%; height: 100%; display: block; background: #0f1216; }
```

(Leave the other `#board` declarations — e.g. `touch-action`/`-webkit-tap-highlight-color` — unchanged.)

- [ ] **Step 3: Verify**

Run: `node --check js/field.js` (expect no output) and `node --test` (expect 26/26 — no logic changed).

- [ ] **Step 4: Commit**

```bash
git add js/field.js styles.css
git commit -m "feat: deep striped turf and thinner pitch markings"
```

---

## Task 2: Tokens — smaller sharp players, soccer ball, amber cone

**Files:**
- Rewrite: `js/tokens.js`
- Modify: `styles.css` (append token-layer drop-shadow)

**Interfaces:**
- Consumes: scene pieces + a frame's `positions`.
- Produces: `clientToSvg`, `renderTokens(svg, layerEl, scene, frame, getTool, onChange)`, `setTokenPositions(layerEl, positionsMap)` — signatures unchanged; visuals updated.

- [ ] **Step 1: Rewrite `js/tokens.js`** (replace entire file)

```javascript
// tokens.js — DOM: render pieces (player/ball/cone) from a frame; drag in select mode.
const SVGNS = 'http://www.w3.org/2000/svg';
const COLORS = { A: '#4a6fa5', B: '#cf6b5a' };
const R = 13.5; // player token radius (viewBox units)

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

// Simple soccer ball: white disc, central black pentagon, five short seams.
function ballShapes() {
  const c = el('circle', { r: 8, fill: '#ffffff', stroke: '#152218', 'stroke-width': '1.2' });
  const pent = el('path', { d: 'M0,-3.4 L3.23,-1.05 L2,2.75 L-2,2.75 L-3.23,-1.05 Z', fill: '#152218' });
  const seams = el('g', { stroke: '#152218', 'stroke-width': '0.9', 'stroke-linecap': 'round' });
  const seamData = [
    [0, -3.4, 0, -7.2],
    [3.23, -1.05, 6.85, -2.23],
    [2, 2.75, 4.23, 5.83],
    [-2, 2.75, -4.23, 5.83],
    [-3.23, -1.05, -6.85, -2.23],
  ];
  for (const [x1, y1, x2, y2] of seamData) seams.appendChild(el('line', { x1, y1, x2, y2 }));
  return [c, pent, seams];
}

function shapeFor(piece) {
  if (piece.kind === 'player') {
    const c = el('circle', { r: R, fill: COLORS[piece.team], stroke: 'rgba(0,0,0,0.32)', 'stroke-width': '1.6' });
    const t = el('text', {
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: '#fff', 'font-size': '13', 'font-weight': '700',
    });
    t.textContent = String(piece.number);
    return [c, t];
  }
  if (piece.kind === 'ball') {
    return ballShapes();
  }
  // cone
  return [el('path', { d: 'M0,-11 L-9,8 L9,8 Z', fill: '#d9a441', stroke: '#3a2a00', 'stroke-width': '1.4' })];
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

- [ ] **Step 2: Append the token drop-shadow to `styles.css`**

```css
#layer-tokens { filter: drop-shadow(0 2px 3px rgba(5,18,11,0.5)); }
```

- [ ] **Step 3: Verify**

Run: `node --check js/tokens.js` (no output) and `node --test` (26/26).

- [ ] **Step 4: Commit**

```bash
git add js/tokens.js styles.css
git commit -m "feat: sharper smaller tokens, soccer ball, amber cone, token shadow"
```

---

## Task 3: Markup color

**Files:**
- Modify: `js/tools.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: markup rendered in `#f0cf55`.

- [ ] **Step 1: Recolor markup in `js/tools.js`**

Read `js/tools.js`. It contains three occurrences of the old markup yellow `#ffe14d` — the arrow `line` stroke, the pen `path` stroke, and the arrowhead marker `path` fill. Replace **every** `#ffe14d` with `#f0cf55`. Leave the text-label color (`#ffffff`) unchanged.

Concretely, the arrowhead marker becomes:

```javascript
  marker.appendChild(el('path', { d: 'M0,0 L6,3 L0,6 Z', fill: '#f0cf55' }));
```

the arrow line becomes `stroke: '#f0cf55'`, and the pen path becomes `stroke: '#f0cf55'`.

- [ ] **Step 2: Verify**

Run: `node --check js/tools.js` (no output) and `node --test` (26/26).

- [ ] **Step 3: Commit**

```bash
git add js/tools.js
git commit -m "feat: muted yellow markup color"
```

---

## Task 4: Chrome — flat, tight, dark; text-first labels

**Files:**
- Modify: `styles.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: nothing.
- Produces: the flattened dark chrome and relabeled toolbar/team toggle.

- [ ] **Step 1: Edit `styles.css`** — read the file first, then apply these exact rule changes.

(a) Body surface:
```css
body {
  display: flex; flex-direction: column; height: 100vh;
  font-family: system-ui, -apple-system, sans-serif;
  overflow: hidden; touch-action: none;
  -webkit-user-select: none; user-select: none;
  background: #0f1216; color: #f2f4f7;
}
```

(b) Bars — change the shared background and add hairline borders:
```css
#topbar, #toolbar, #stepsbar {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 12px; background: #12161b; flex: 0 0 auto;
}
#topbar { justify-content: space-between; border-bottom: 1px solid #222932; }
#toolbar { justify-content: center; flex-wrap: wrap; border-top: 1px solid #222932; }
#stepsbar { gap: 10px; border-top: 1px solid #222932; }
```

(c) Brand size:
```css
.brand { font-weight: 700; font-size: 15px; letter-spacing: 0.3px; }
```

(d) Buttons/tools — flatten and add hairline border, keep tap height:
```css
button, .tool {
  font-size: 13px; padding: 8px 12px; min-height: 40px;
  border: 1px solid #2a323d; border-radius: 2px; background: #1b212a; color: #f2f4f7;
}
.tool[aria-pressed="true"] { background: #3a5fa0; border-color: #3a5fa0; }
```

(e) Team toggle — flatten and use the new team colors:
```css
.team {
  font-size: 13px; padding: 8px 10px; min-height: 40px;
  border: 1px solid #2a323d; border-radius: 2px; background: #1b212a; color: #f2f4f7; opacity: 0.55;
}
.team[data-team="A"][aria-pressed="true"] { background: #4a6fa5; border-color: #4a6fa5; opacity: 1; }
.team[data-team="B"][aria-pressed="true"] { background: #cf6b5a; border-color: #cf6b5a; opacity: 1; }
```

(f) Panels — sharper corners, dark surface:
```css
.panel-card {
  background: #12161b; padding: 20px; border: 1px solid #222932; border-radius: 3px;
  width: min(92vw, 380px); display: flex; flex-direction: column; gap: 12px;
}
```

(g) Scrub accent — append:
```css
#scrub { accent-color: #4a6fa5; }
```

(h) In the `@media (max-width: 640px)` block, keep the tighter type but do NOT drop below the tap height — change the `.tool` rule there to:
```css
@media (max-width: 640px) {
  .brand { font-size: 14px; }
  .tool { padding: 7px 9px; font-size: 12px; min-height: 40px; }
  #stepsbar { flex-wrap: wrap; }
}
```

- [ ] **Step 2: Edit `index.html`** — read the file first, then:

(a) Change the theme-color meta from `#1e232b` to:
```html
  <meta name="theme-color" content="#0f1216">
```

(b) Replace the toolbar tool-button text (drop the decorative emojis) so the `<nav id="toolbar">` tool buttons read:
```html
    <button class="tool" data-tool="select" aria-pressed="true">Select</button>
    <button class="tool" data-tool="add">Player</button>
    <span id="team-toggle">
      <button class="team" data-team="A" aria-pressed="true">Blue</button>
      <button class="team" data-team="B">Red</button>
    </span>
    <button class="tool" data-tool="cone">Cone</button>
    <button class="tool" data-tool="arrow">Arrow</button>
    <button class="tool" data-tool="pen">Pen</button>
    <button class="tool" data-tool="text">Text</button>
    <button class="tool" data-tool="delete">Delete</button>
```

(Leave the steps bar buttons — `◀`, `▶`, `+ Frame`, `🗑 Frame`, `▶ Play` — unchanged.)

- [ ] **Step 3: Verify**

Run: `node --test` (26/26 — no JS logic changed). (No `node --check` needed; only CSS/HTML changed.)

- [ ] **Step 4: Commit**

```bash
git add styles.css index.html
git commit -m "feat: flat dark chrome, hairline borders, text-first labels"
```

---

## Task 5: Browser verification (controller)

**This task is run by the controller, not a subagent** (it needs a display). Serve the app (`py -m http.server 8000`) and drive `http://localhost:8000`. Confirm the whole redesign renders as intended:

1. **Pitch:** deep vertical mowing stripes (`#2f5f45`/`#2b5940`), thin white markings; on a **half-pitch** (Setup → Left/Right), the letterbox area is dark chrome (`#0f1216`), not green.
2. **Tokens:** players are smaller with a hairline dark ring (no thick white ring), steel-blue `#4a6fa5` vs coral `#cf6b5a`, each with a soft drop shadow; numbers legible.
3. **Ball:** renders as a small soccer ball (white with a central black pentagon + seams) at real size.
4. **Cone:** amber, visually distinct from the coral team.
5. **Markup:** an arrow/pen/text draws in muted yellow `#f0cf55`.
6. **Chrome:** flat dark bars with hairline borders, ~2px button corners, tight padding, text-first tool labels, team toggle shows "Blue"/"Red"; buttons remain comfortably tappable.
7. **No console errors**; drag / add / frames / Play / save-load still work (regression check that the restyle changed nothing behavioral).

Fix any defect (dispatch a fix subagent) before completing.

---

## Self-Review Notes

- **Spec coverage:** striped turf + thin lines (Task 1), player size/ring/colors + shadow (Task 2), soccer ball + amber cone (Task 2), markup color (Task 3), chrome flatten + labels + team "Red" + theme-color (Task 4), browser verification (Task 5). All spec sections map to a task.
- **Type/behavior consistency:** all module signatures (`renderField`, `renderTokens`, `clientToSvg`, `setTokenPositions`, `renderMarkup`/`initTools` in tools.js) are unchanged — visual-only edits, so the Group A integration and the 26 tests are unaffected.
- **Touch preserved:** buttons keep `min-height: 40px` in both the base and the media-query rules, so the tighter look never shrinks tap targets below a usable size.
- **No new pure logic ⇒ no new unit tests**, per the spec; every task re-runs `node --test` to prove the 26 existing tests stay green.
