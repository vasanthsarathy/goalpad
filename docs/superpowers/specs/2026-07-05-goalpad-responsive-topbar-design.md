# goalpad — Responsive Top Bar + Landscape Fit (Design)

**Date:** 2026-07-05
**Status:** Approved
**Motivation:** On phones the editor top bar (8 items, needs ~535 px) overflows a portrait viewport
(~360–414 px) and **clips Save & Done off the right edge** (body has `overflow: hidden`, so they're
unreachable). In landscape it fits but the three stacked bars leave the pitch cramped. Measured, not
guessed: top-bar min width ≈ 535 px; at 390 px the bar overflows by 163 px with Save/Done past the edge;
at 667 px it fits.

## Fix

### 1 · Overflow `⋯` menu on narrow screens (Build only)

The crowded mode is **Build** (8 items, ~535 px). Below **`max-width: 560px`** (phones in portrait and the
narrowest landscapes), **in Build** the top bar collapses:

- **Stays inline:** `goalpad●` (home) · **title** (truncates with "…") · **Library** · **↶ ↷** · **Done**.
- **Collapses into a `⋯` menu:** **Help**, **Setup**, **Save** — a small popover (reuses the existing
  `.card-menu`/`.menu-item` style; outside-tap closes). The menu is always these three items.
- The gap between top-bar actions tightens (22 px → 12 px) on narrow so the row stays on one line.
- **Watch mode needs no collapse** — its bar (`logo · title · Library · Edit · Help`) fits comfortably even
  on a 360 px phone; the `⋯` appears only in Build.
- **Wide screens (> 560 px) are unchanged** — every action inline, no `⋯`.

Undo/redo (↶↷, ~16 px each) and Library + Done stay on the bar because they're core and/or tiny; the
occasional actions (Help/Setup/Save) are what collapse.

### 2 · Title truncation

`.doc-title` gets `min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis` so a long
tactic name shrinks with an ellipsis instead of pushing the buttons (and never contributes to overflow).

### 3 · A little more pitch in landscape

On short viewports (**`max-height: 480px`**, i.e. landscape phones) the four chrome bars (`#topbar`,
`#toolbar`, `#stepsbar`, `#filmbar`) trim their vertical padding (10 px → 5 px top/bottom), returning
~25–35 px to the pitch. **Tap targets stay 40 px** (`min-height` on buttons is unchanged) — only bar
padding shrinks.

## Components

- **`index.html`** — add a `⋯` button `#btn-more` (`aria-label="More"`) to the editor `.top-actions`.
- **`styles.css`** — `#btn-more { display: none }` (default hidden); the `.doc-title` truncation; a
  `@media (max-width: 560px)` block scoped to Build (`#editor[data-mode="build"]`) that hides
  `#btn-help`/`#btn-setup`/`#btn-save`, shows `#btn-more`, and tightens the action gap; a
  `@media (max-height: 480px)` block trimming the four bars' padding.
- **`js/app.js`** — refactor the Help open into a named `openHelp()`; wire `#btn-more` to open a popover
  menu (`openMoreMenu(anchor, items)` + `closeMoreMenu`, reusing the `.card-menu` look, outside-tap to
  close) with the fixed items `[['Help', openHelp], ['Setup', () => openSetup('edit')], ['Save', saveToLibrary]]`.

## Non-Goals

- No change to the editor, Library, scene model, or the bar contents on wide screens.
- The chip **toolbar** wrapping to a second row on very narrow widths is left as-is (functional; a tool
  palette wrapping is acceptable, and it's one row on landscape phones ≥ ~485 px). Only the **top bar**
  overflow (the actual clip) is fixed.

## Testing

- **Unit:** none — CSS/markup + a menu wiring; existing tests stay green as a regression guard.
- **Browser (controller-verified).** The harness viewport is locked (can't be resized to a phone), so verify
  by:
  1. **Functional `⋯` menu:** in Build, click `#btn-more` → a popover appears with **Help · Setup · Save**;
     each item triggers the right action (Help panel opens; Setup sheet opens; Save prompts); outside-tap
     closes it.
  2. **Narrow-fit simulation:** apply the `max-width:560px` rules (hide Help/Setup/Save inline, show `⋯`,
     gap 12) and constrain the top bar to 360/390 px, then measure that the visible items (`logo · title ·
     Library · ↶ ↷ · ⋯ · Done`) do **not** overflow the bar's right edge (no clip) and the title ellipsizes.
  3. **Landscape trim:** apply the `max-height:480px` rule and confirm each bar's height drops (~8 px each)
     while button `min-height` stays 40 px.
  4. Wide (current) layout unchanged; no console errors.
