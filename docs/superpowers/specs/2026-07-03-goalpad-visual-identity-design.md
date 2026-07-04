# goalpad — Visual Identity (Black-and-White Redesign) Design

**Date:** 2026-07-03
**Status:** Approved
**Supersedes:** the Group B dark-green look (`2026-07-03-goalpad-visual-polish-design.md`)
**Reference:** brand guidelines page — https://claude.ai/code/artifact/8b880096-b699-45b2-97b0-6e9ffebdcfc9

## Purpose

A full re-skin of goalpad to a **modern, minimalist, black-and-white editorial identity**, and a
committed set of **brand/design guidelines** to keep future work consistent. This replaces the
current dark striped-turf look entirely. It is pure visual identity plus one small feature
(a per-label text color chooser) — no changes to the scene model, frames, playback, add/remove,
or save/load, so the existing 26 `node:test` tests stay green.

Guiding principle: **a strict monochrome canvas where color only ever carries meaning.**

## Design Tokens (the brand system)

### Neutrals
- **Canvas** `#FFFFFF` — background (page, board, chrome, panels).
- **Ink** `#1B1F27` — field lines, primary text, the ball, active UI.
- **Grey** `#8A9099` — secondary/inactive text and labels.
- **Hairline** `#ECEEF1` — chrome dividers and panel borders.

### Accents — muted, one job each (never decorative)
- **Blue** `#4E74AE` — Team A.
- **Red** `#C15F5B` — Team B.
- **Orange** `#CB8A52` — Cones (outline `#8A6234`).
- **Green** `#579870` — Markup (arrows, pen, arrowhead).

### Typography
- **Space Grotesk**, self-hosted (weights 300 / 400 / 500), used across the whole product —
  wordmark, UI labels, and on-field text. No external font calls.
- Weights stay light: wordmark 300 (lowercase, letter-spacing), body 300/400, labels & numerals
  500. Uppercase labels get ~1.5–2px letter-spacing.
- Token numbers render in Space Grotesk 500/600 for legibility.

### Line weights
- Pitch markings: ink hairlines, stroke `0.9` viewBox units.
- Player ring: stroke `1.3`.
- Markup arrow/pen: stroke `4` (functional weight, distinct from hairline field lines).

## The Marks

- **Pitch:** white; ink hairline markings (no turf fill, no stripes). Full / left / right half
  as today (half-pitch letterbox is white canvas).
- **Players:** thin **outlined rings** — white fill, team-color stroke, number in the same
  team color. Radius `13.5`. **No fills, no drop shadows.**
- **Ball:** classic black-and-white **Telstar** — white disc, ink outline, central ink pentagon
  + five seams + five rim pentagon patches (clipped to the disc). Rendered at radius ~`9` so the
  pentagons read at board scale.
- **Cones:** muted-orange triangles with a thin dark outline.
- **Markup:** green arrows/pen. **Text** labels default to **Ink**, with a per-label color
  chooser (see below).

## New: per-label text color chooser

- Each `text` markup object gains a `color` field (a hex string).
- The Text tool has a **current text color**, chosen from the five brand swatches:
  **Ink `#1B1F27` (default), Blue, Red, Orange, Green** — surfaced as a small swatch row that is
  visible/active only when the Text tool is selected.
- New text labels are created with the current text color; `renderMarkup` draws each text label
  in its stored `color` (falling back to Ink if absent, so older scenes still render).
- Storage needs no schema change (markup objects are already stored verbatim in each frame).

## Chrome / Interface

- White bars (top, tool, steps); **hairline** `#ECEEF1` dividers; generous spacing.
- **Text-first tool labels** in Space Grotesk (light): inactive **Grey**, active **Ink** with a
  thin ink underline. Team toggle shows "Blue"/"Red" in their accent colors when active.
- The Text tool's color-swatch row appears in the tool area when Text is active.
- Panels (Setup, Save/Load): white surface, hairline border, sharp corners.
- Tap targets stay finger-friendly (`min-height: 40px`) despite the light visual weight.
- Wordmark: lowercase `goalpad`, weight 300, subtle letter-spacing.

## Files Touched

- `js/field.js` — white pitch, ink hairline markings (remove turf stripes).
- `js/tokens.js` — outlined-ring players (team-color stroke + number, no shadow), classic Telstar
  ball, muted-orange cone, Space Grotesk numbers.
- `js/tools.js` — green markup; Text tool reads a current color and stores `color` on text
  objects; `renderMarkup` honors per-label `color`.
- `js/app.js` — current-text-color state + swatch-row wiring.
- `styles.css` — light theme (white/ink/grey/hairline), **remove** the `#layer-tokens` drop-shadow,
  `@font-face` for Space Grotesk, text-first chrome, active-tool underline, team/accent colors,
  text-color swatch row, panels, scrub.
- `index.html` — theme-color `#FFFFFF`, font preload/link to self-hosted files, the Text color
  swatch row markup.
- `fonts/` (new) — self-hosted Space Grotesk woff2 (300/400/500), Latin subset, SIL OFL
  (source: fontsource / Google Fonts static).

## Non-Goals

- No changes to scene model, frames, playback, add/remove, delete-frame, half-pitch logic, or
  save/load (beyond the additive text `color`).
- No new pitch geometry (penalty arcs, corner arcs) — markings stay as they are, in ink hairlines.
- No dark theme — the identity deliberately commits to a single light world.

## Testing

- **Unit:** no new pure logic ⇒ existing 26 `node:test` tests must stay green (regression guard).
  If the text-color default is factored into a tiny pure helper, it may get one unit test; not
  required.
- **Browser (controller-verified):** white pitch + ink hairlines; outlined-ring players in the
  muted blue/red; classic Telstar ball at real size; orange cones; green markup; Text tool color
  chooser (create labels in ink and in an accent, confirm each renders in its color and
  round-trips through save/load); Space Grotesk actually loads (self-hosted, no network); flat
  white chrome with text-first labels; half-pitch letterbox is white; drag / frames / Play / save
  still work. Check narrow layout (touch).
