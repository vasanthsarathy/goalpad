# goalpad Redesign — Stage 3b: Filmstrip + Undo/Redo (Design)

**Date:** 2026-07-04
**Status:** Approved
**Source of truth:** the user's `goalpad-ux-spec.html` (UX spec v1), sections 04 (Build wireframe), 06 (Time), 08 (Interaction rules).
**Builds on:** Stage 3a (Build chips/selection/Run, merged). Final stage of the redesign.

## Purpose

Give Build a discrete time model — a **frame filmstrip** replacing the `+Frame / 🗑Frame / scrub` row — and add **undo/redo** covering every Build action. Also fold in the small deferred cleanup (dead CSS, unused legacy storage exports). Watch's continuous transport is unchanged. One deviation from the UX spec, per the user: Build keeps a **Play** button (spec had preview only via Done→Watch).

## Filmstrip (Build)

Build's bottom bar becomes a **filmstrip** plus a **Play** button, replacing the current `#stepsbar` frame controls:

- A horizontal strip of **frame cells**, each showing the zero-padded frame number (`01`, `02`, …). The **current** frame's cell shows a **2px red (`#e10600`) underline**; others are mute/ink.
- **Tap** a cell → jump to that frame (settles onto it; same as the old step-to-frame).
- **Long-press** a cell → a small popover menu **Duplicate · Delete** (duplicate inserts a copy after it; delete removes it — never below one frame).
- A **"+"** cell at the end → add a frame (copies the current frame's positions, empty markup — the existing `duplicateFrame`).
- The strip scrolls horizontally when it overflows; the current cell is kept in view.
- A **▶ Play** button previews the animation in place (same `steps.play()`), without leaving Build.

Watch keeps its transport unchanged (hairline scrub + red playhead, step ◀ ▶, `N / M`, Play). The `+Frame`/`🗑Frame` buttons are removed (their functions move to the filmstrip). Mode still toggles which bottom bar shows.

## Undo / Redo

Covers **every Build mutation**: stamp/duplicate/delete a piece, move a piece, drag off-pitch, draw arrow/run/pen/text, delete a mark, add/duplicate/delete a frame, and a Setup pitch change.

- **Snapshot history.** A single **commit** choke point (the function every mutation already calls to autosave) also records a deep-copy scene snapshot. History is a pure module `js/history.js`:
  - `reset(state)` — set the baseline to a clone of `state`; clear both stacks. Called when a tactic is opened/created/imported (per editing session).
  - `record(state)` — push the previous baseline onto the undo stack (capped at 50; oldest dropped), clear the redo stack, set baseline to a clone of `state`.
  - `undo(current)` / `redo(current)` — move between stacks and return a clone of the restored state (or `null` if the stack is empty).
  - `canUndo()` / `canRedo()`.
- **Controls.** **↶ ↷** buttons in the Build top bar (`‹ Library · title ✎ · ↶ ↷ · Setup · Done`), each disabled when its stack is empty. A **two-finger tap** on the board also triggers undo (iPad convention; best-effort — the ↶ button is the reliable path).
- **Behavior.** `undo`/`redo` replace `scene` with the restored clone, clamp `index`, drop any selection, re-render (filmstrip + board), and **persist** the restored state to Mine (autosave), without recording a new snapshot.
- History is **per editing session** (not persisted) and resets on opening a different tactic. Undo/redo are Build-only.

## Cleanup (folded in)

- Remove dead CSS left by earlier stages: `#team-toggle` / `.team` / `.team[aria-pressed]` (team toggle removed in 3a), and `.saved-list` / `#saved-list` / `.import-label` / `#lib-tabs` / `.lib-tab` / `#lib-list` / `.lib-group` / `.lib-row` / `.lib-nm` / `.lib-ds` (Save/Load + modal Library panels removed in Stage 2).
- Remove the unused legacy exports `saveNamed` / `loadNamed` / `deleteNamed` from `storage.js`. Keep `listSaved` and `KEY_PREFIX` (`migrateLegacyPlays` reads legacy keys through them). `serialize`/`deserialize` and the Mine layer stay.

## Files

- **`js/history.js` (new, pure):** `createHistory(clone, cap = 50)` → `{ reset, record, undo, redo, canUndo, canRedo }`. No DOM; unit-tested.
- **`js/filmstrip.js` (new, DOM):** `renderFilmstrip(el, { count, current, onJump, onAdd, onDuplicate, onDelete })` — renders numbered cells (current underlined) + a "+" cell, wires tap/long-press (a body-anchored Duplicate/Delete popover like the card menu), and keeps the current cell in view.
- **`js/app.js`:** create the history (`createHistory(clone)`); add a `commit()` (persist + `history.record`) and a `persist()` (save only); replace the mutation-path `autosave()` calls with `commit()`; add `undo()`/`redo()` + `refreshUndoUI()`; wire `↶`/`↷` + two-finger-tap; `render()` also renders the filmstrip in Build; wire filmstrip callbacks (`onJump`→settle, `onAdd`/`onDuplicate`/`onDelete`→frame ops + commit); `reset` history on `openCard`/setup-new/import; remove the `btn-add-step`/`btn-del-step` handlers.
- **`index.html`:** add `↶`/`↷` buttons to the editor top bar; split the bottom into `#stepsbar` (Watch transport, minus +Frame/🗑Frame) and a new `#filmbar` (`#filmstrip` + a Build Play button); remove the `#btn-add-step`/`#btn-del-step` buttons.
- **`styles.css`:** filmstrip cells + current red underline + "+" cell + long-press menu; `↶`/`↷` buttons (disabled state); the `data-mode` show/hide for `#stepsbar` vs `#filmbar`; **remove** the dead rules listed above.
- **`storage.js`:** remove `saveNamed`/`loadNamed`/`deleteNamed`.

## Non-Goals

- No change to the scene model, playback interpolation, Watch transport, Home, autosave semantics, or the library data (beyond routing mutations through `commit`).
- Undo history is not persisted across reloads (session-only), and does not cover Watch (view-only) or Home/navigation.

## Testing

- **Unit (`node:test`):** `history.js` — `reset` clears; `record` pushes the prior baseline and clears redo; a `record → undo` returns the pre-change state; `undo → redo` round-trips; a new `record` after `undo` clears redo; the undo stack respects the cap; `canUndo`/`canRedo` track emptiness. Existing scene/steps/storage/library/scene-addBall tests stay green (the removed `saveNamed`/`loadNamed`/`deleteNamed` are not referenced by any test — confirm before deleting).
- **Browser (controller-verified):** the filmstrip shows a cell per frame with the current one red-underlined; tap jumps; "+" adds a frame; long-press → Duplicate/Delete works (and can't delete the last frame); the Build Play button previews; **undo/redo** reverse and replay a stamp, a move, a delete, a draw, and a frame add — with the ↶/↷ buttons enabling/disabling correctly and a two-finger tap undoing; undone state persists (reopen shows the undone result); Watch transport still works; opening a different tactic resets history; no console errors.
