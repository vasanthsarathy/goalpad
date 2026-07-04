# goalpad Redesign — Stage 2: Home + Watch/Build Modes + Autosave (Design)

**Date:** 2026-07-04
**Status:** Approved
**Source of truth:** the user's `goalpad-ux-spec.html` (UX specification v1), sections 02–04, 06, 08, 09.
**Builds on:** Stage 1 (monochrome visual system, merged). This is Stage 2 of the three-stage redesign.

## Purpose

Turn goalpad from a single always-on editing board into a shell with a **Library home screen** and
two document **modes** — **Watch** (view a tactic: pitch + time only) and **Build** (edit it: tools +
frames) — backed by **continuous autosave**. The Save/Load panel is retired; every tactic lives in
the Library and saves itself on every change. This stage changes the app's navigation, chrome, and
persistence; it does **not** change the scene model, playback, or the board's editing tools (those
stay as they are until Stage 3).

## Model (the nouns)

- **Scene:** unchanged — `{ name, field:{preset,half}, pieces[], frames[] }`.
- **Tactic (new):** a saved document `{ id, name, scene, updatedAt }` stored in localStorage under
  `goalpad:mine:<id>`. `id` is a stable unique string (`crypto.randomUUID()`); `updatedAt` is
  `Date.now()`. `name` is the display title; `scene.name` is kept in sync with it.
- **Templates:** the read-only built-in presets from `js/library.js` (`LIBRARY`). Never written to
  localStorage; opening/editing one never mutates it.
- **Mine:** the collection of the user's saved Tactics (everything under `goalpad:mine:`).

## Surfaces

The app shows exactly one surface at a time: **Home** or **Editor**.

### Home (the Library — launch surface)

- **Header:** the wordmark (`goalpad` + red dot), and two engraved actions: **+ NEW** and **IMPORT**.
- **Body — two shelves of cards** (square-cornered, 1px ink border, name inside; mute group labels):
  - **TEMPLATES** — the 14 `LIBRARY` presets as cards, grouped by their existing `group`
    (Small-sided, Attacking patterns, Set pieces, Possession, Finishing, Defending, Warm-up).
  - **MINE** — the user's saved Tactics as cards, most-recently-updated first. Empty state: a muted
    "No saved tactics yet — tap + New" line.
- **Tap a card** → open that tactic in the Editor in **Watch**.
- **Long-press a card** → the card menu (see below).

### Editor (the board)

The existing SVG board (`#stage`/`#board`) with a **contextual top bar** and a **contextual bottom
bar**, driven by the current mode.

- **Watch** (default when opening any card):
  - Top bar: **‹ LIBRARY** · centered **title** · **EDIT**.
  - Bottom bar: transport only — **▶ PLAY**, the hairline scrub with the red playhead (draggable),
    **‹ / ›** step ±1, and the `04 / 12` frame readout.
  - No toolbar, no + Frame / 🗑 Frame, and **piece dragging is disabled** — Watch is view-only.
- **Build** (via **EDIT**, and the landing mode for **+ New**):
  - Top bar: **‹ LIBRARY** · centered **title ✎** · **SETUP** · **DONE**.
  - Bottom bar: today's **toolbar** (Select / Player / A·B / Cone / Arrow / Pen / Text / Delete) and
    **steps bar** (scrub, + Frame, 🗑 Frame, Play, step readout) — unchanged from Stage 1.
  - **DONE** → Watch. Tapping the **title** opens a rename prompt.
  - **SETUP** opens the Setup sheet to change the pitch of the current tactic (as today; applying
    rebuilds the scene on the new pitch).

Mode is per-document and not remembered: opening anything from the Library always starts in Watch.

## Flows

- **Launch** → Home (no board is auto-created).
- **+ New** → Setup sheet → on Apply: create a new Mine tactic named "Untitled" (autosaved), enter
  **Build** on it.
- **Open a Mine card** → load it into the Editor, `currentDocId = <id>`, enter **Watch**. **Edit** →
  Build; edits autosave in place.
- **Open a Template card** → load a deep copy into the Editor, `currentDocId = null` (a preview),
  enter **Watch**. **Edit** → **fork**: create a new Mine tactic named "<name> (copy)", set
  `currentDocId` to it, enter Build; from then on edits autosave to the copy. The Template is never
  modified.
- **‹ LIBRARY** (from Watch or Build) → Home (the tactic is already saved; re-render Home so Mine
  reflects the latest).
- **Rename** (title tap in Build, or card menu) → prompt for a new name → update `name` +
  `scene.name`, autosave.

## Autosave

- The Editor tracks `currentDocId` (the open Mine tactic, or `null` for an unforked Template
  preview) and the current `name`.
- **Autosave writes the Mine record on every mutating action in Build:** piece move (drag end),
  add/remove piece, add/delete frame, markup add, Setup apply, and rename. It sets
  `updatedAt = Date.now()` and persists `{ id, name, scene, updatedAt }`.
- When `currentDocId` is `null` (a Template preview in Watch, before Edit), nothing autosaves —
  there is nothing to save until Edit forks a copy.
- There is no Save button, no "unsaved changes" state, and no Save/Load panel.

## Card menu (long-press)

A small square popover anchored to the card:
- **Mine card:** **Rename · Duplicate · Export · Delete**.
- **Template card:** **Duplicate · Export** (built-ins cannot be renamed or deleted).
- **Duplicate** creates a new Mine tactic ("<name> (copy)") from the card's scene and re-renders
  Home. **Export** downloads the scene JSON (existing `exportScene`). **Delete** (Mine only) removes
  the tactic after a confirm and re-renders Home. **Rename** (Mine only) prompts and updates.
- **Import** (Home header): pick a JSON file → validate via `deserialize` → create a new Mine
  tactic → open it in Watch. Invalid file → an alert; nothing created.

## Migration

- On first launch after Stage 2 ships, a one-time migration reads every legacy `goalpad:scene:<name>`
  entry, and for each valid one creates a Mine tactic `{ id, name, scene, updatedAt }`. A flag key
  `goalpad:migrated:mine-v1` marks it done so it runs once. Legacy keys are **left in place** (a
  safety net; not deleted). Corrupt/legacy-invalid entries are skipped.

## Files

- **`js/home.js` (new):** renders the Home surface — Templates cards (from `LIBRARY`, grouped) and
  Mine cards (from `listMine()`), the + New / Import header actions, card tap, and the long-press
  card menu. Exposes `renderHome(el, callbacks)` where callbacks cover open / new / import / the menu
  actions. Pure DOM; no scene/state ownership.
- **`js/storage.js`:** add Mine CRUD + migration — `saveMine(tactic)`, `listMine()` (metadata,
  newest first), `loadMine(id)`, `deleteMine(id)`, `newTactic(name, scene)` (builds a record with a
  fresh id + `updatedAt`), `migrateLegacyPlays()` (one-time, flag-guarded). Keep serialize /
  deserialize / exportScene / importSceneFile. Remove the now-unused `saveNamed` path only if
  nothing references it (listSaved/loadNamed/deleteNamed stay for migration to read legacy keys).
- **`js/app.js`:** the shell/controller — owns `surface` (home/editor), `mode` (watch/build),
  `currentDocId`, `name`; surface + mode switching (show/hide chrome, disable Watch dragging by
  keeping the tool state non-'select' in Watch); the New / open / fork / rename flows; the autosave
  hook wired into every mutating action; Setup as the New sheet and the in-Build pitch editor.
  Reuse the existing render / steps / tools wiring, gated by mode.
- **`index.html`:** add the `#home` surface and an `#editor` wrapper with the contextual top bar
  (back / title / edit|done / setup); keep `#panel-setup`; **remove** `#panel-saveload` and the modal
  `#panel-library` (the Library is now the Home surface); add the `#card-menu` popover and a hidden
  file input for Import.
- **`styles.css`:** Home surface + shelves + cards + card menu; the contextual top bar; the
  watch/build show-hide rules — all in the Stage 1 monochrome idiom (paper/ink/mute/signal, square
  corners, engraved labels, ink hairlines).

## Non-Goals (Stage 2)

- No piece chips, no selection/contextual-delete, no filmstrip, no undo/redo, no dashed Run tool
  (all Stage 3). Build keeps Stage 1's toolbar and steps bar.
- No change to the scene model, frames, playback, or the library preset data.

## Testing

- **Unit (`node:test`):** serialize/deserialize stays green. Add tests for the pure migration
  transform — factor the legacy→tactic conversion into a pure helper (e.g. `legacyToTactics(entries)`
  taking `[{name, scene}]` and returning tactic records without id/time, or asserting the shape) so
  it can be tested without localStorage/Date. The localStorage-backed CRUD (`saveMine`/`listMine`/…)
  and all UI are browser-verified.
- **Browser (controller-verified):** launch lands on Home with Templates + Mine; + New → Setup →
  Build on a new Untitled tactic; open a Mine card → Watch (no tools, no dragging) → Edit → Build →
  a change autosaves and survives reload; open a Template → Watch → Edit forks a "(copy)" into Mine
  and leaves the Template unchanged; ‹ Library returns Home with Mine updated; card menu
  Rename/Duplicate/Export/Delete and header Import all work; Watch shows only the transport and Build
  shows tools+steps; the Setup-in-Build path changes the pitch; legacy saved plays appear in Mine
  after the one-time migration; no console errors.
