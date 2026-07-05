# goalpad Responsive Top Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the editor top bar from clipping Save/Done off narrow (phone-portrait) screens by collapsing Help/Setup/Save into a `⋯` overflow menu in Build, and give the pitch more room on short (landscape) viewports.

**Architecture:** Pure CSS media queries + one `⋯` button + a small popover menu (reusing the existing `.card-menu` look). No scene-model/editor/logic change beyond wiring the `⋯` menu.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules. No build step.

## Global Constraints

- **Collapse (Build only), `@media (max-width: 560px)`:** hide `#btn-help`/`#btn-setup`/`#btn-save`, show a `#btn-more` (`⋯`) button, tighten the `.top-actions` gap to 12px. The `⋯` menu lists **Help · Setup · Save** (fixed). Watch mode does not collapse (its bar fits). Wide screens (>560px) unchanged.
- **Title truncation:** `.doc-title` gets `min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`.
- **Landscape trim, `@media (max-height: 480px)`:** the four bars (`#topbar`, `#toolbar`, `#stepsbar`, `#filmbar`) reduce vertical padding 10px → 5px; **button `min-height` stays 40px** (tap targets unchanged).
- Monochrome idiom, square corners, engraved labels. No change to the editor, Library, or scene model. Existing tests stay green.

---

## File Structure

```
index.html   # + #btn-more (⋯) in the editor top-actions
styles.css   # + #btn-more default hidden; .doc-title truncation; the two media queries
js/app.js    # openHelp() refactor + #btn-more → openMoreMenu popover
```

---

## Task 1: Responsive top bar

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `js/app.js`

**Interfaces:**
- Consumes: existing `openSetup('edit')`, `saveToLibrary()` in app.js; the existing `.card-menu`/`.menu-item` CSS.

- [ ] **Step 1: Add the `⋯` button to `index.html`** — in the editor `.top-actions`, insert `#btn-more` between `#btn-save` and `#btn-done`:

```html
        <button id="btn-save" type="button">Save</button>
        <button id="btn-more" type="button" aria-label="More">⋯</button>
        <button id="btn-done" type="button">Done</button>
```

- [ ] **Step 2: Append the responsive styles to `styles.css`**

```css
/* ---- responsive top bar (narrow) + landscape fit ---- */
#btn-more { display: none; }
.doc-title { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

@media (max-width: 560px) {
  #editor[data-mode="build"] #btn-help,
  #editor[data-mode="build"] #btn-setup,
  #editor[data-mode="build"] #btn-save { display: none; }
  #editor[data-mode="build"] #btn-more { display: inline-block; }
  #editor #topbar .top-actions { gap: 12px; }
}

@media (max-height: 480px) {
  #topbar, #toolbar, #stepsbar, #filmbar { padding-top: 5px; padding-bottom: 5px; }
}
```

- [ ] **Step 3: Wire the `⋯` menu in `js/app.js`** — replace the existing Help-open listener line:

```javascript
document.getElementById('btn-help').addEventListener('click', () => { document.getElementById('panel-help').hidden = false; });
```

with an `openHelp()` refactor plus the overflow-menu popover:

```javascript
function openHelp() { document.getElementById('panel-help').hidden = false; }
document.getElementById('btn-help').addEventListener('click', openHelp);

let moreMenu = null;
function closeMoreMenu() { if (moreMenu) { moreMenu.remove(); moreMenu = null; document.removeEventListener('pointerdown', moreOutside, true); } }
function moreOutside(e) { if (moreMenu && !moreMenu.contains(e.target) && e.target.id !== 'btn-more') closeMoreMenu(); }
function openMoreMenu(anchor) {
  closeMoreMenu();
  moreMenu = document.createElement('div');
  moreMenu.className = 'card-menu';
  for (const [label, fn] of [['Help', openHelp], ['Setup', () => openSetup('edit')], ['Save', saveToLibrary]]) {
    const b = document.createElement('button'); b.className = 'menu-item'; b.type = 'button'; b.textContent = label;
    b.addEventListener('click', () => { closeMoreMenu(); fn(); });
    moreMenu.append(b);
  }
  const r = anchor.getBoundingClientRect();
  moreMenu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 168)) + 'px';
  moreMenu.style.top = (r.bottom + 4) + 'px';
  document.body.append(moreMenu);
  setTimeout(() => document.addEventListener('pointerdown', moreOutside, true), 0);
}
document.getElementById('btn-more').addEventListener('click', (e) => openMoreMenu(e.currentTarget));
```

(`openSetup` and `saveToLibrary` are existing function declarations elsewhere in app.js — hoisted, so referencing them here is fine.)

- [ ] **Step 4: Verify**

Run: `node --check js/app.js` (no output) and `node --test` (full suite green — no logic changed). Grep `index.html` for `id="btn-more"` (present) and `js/app.js` for `openMoreMenu`/`openHelp` (present).

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css js/app.js
git commit -m "feat: responsive top bar — overflow menu on narrow screens + landscape padding trim"
```

---

## Task 2: Browser verification (controller)

**Run by the controller.** The harness viewport is locked (can't resize to a phone), so verify by (a) exercising the menu at any width and (b) simulating narrow widths via injected styles/constraints. Serve (no-store) and hard-reload, then confirm:

1. **`⋯` menu (functional, any width):** temporarily set `#editor` to build mode, force `#btn-more` visible, click it → a `.card-menu` popover appears with **Help · Setup · Save**; clicking **Help** opens `#panel-help`, **Setup** opens `#panel-setup`, **Save** fires the save prompt; an outside tap closes the menu.
2. **Narrow fit (simulated):** apply the `max-width:560px` build rules (hide `#btn-help`/`#btn-setup`/`#btn-save`, show `#btn-more`, gap 12) and constrain `#topbar` to 360px and 390px; measure that the visible actions (`Library · ↶ ↷ · ⋯ · Done`) plus logo + title do **not** overflow the bar's right edge (`btn-done` right ≤ topbar right) — i.e. nothing clips — and the title ellipsizes when long.
3. **Landscape trim (simulated):** apply the `max-height:480px` rule; confirm each bar's height drops (~8px) while every top-bar button's `min-height` computed style stays `40px`.
4. **Wide unchanged:** at the normal (wide) viewport, `#btn-more` is hidden and all actions are inline as before.
5. No console errors.

Fix any defect (dispatch a fix subagent) before completing.

---

## Self-Review Notes

- **Spec coverage:** `⋯` button + Build-only collapse + gap tighten (Task 1 index.html/styles); title truncation (styles); landscape padding trim (styles); `⋯` menu wiring with the fixed Help/Setup/Save items (app.js); verification incl. narrow-fit + landscape simulations (Task 2). All spec items map.
- **Type consistency:** `openMoreMenu(anchor)` + `closeMoreMenu`/`moreOutside` + `openHelp` are self-consistent; the menu items call the existing `openSetup('edit')` and `saveToLibrary` (hoisted function declarations). `#btn-more` id matches between index.html, styles.css, and app.js. The menu reuses the existing `.card-menu`/`.menu-item` classes (no new CSS needed for the popover itself).
- **Atomicity:** the `#btn-more` markup, the CSS that shows/hides it, and the app.js that opens its menu all ship in Task 1 together — no commit references a missing element.
- **No regression:** wide-screen layout untouched (the collapse is inside `@media (max-width:560px)` and `#btn-more` defaults to `display:none`); Watch mode never collapses.
