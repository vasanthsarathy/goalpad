# goalpad — Tactics & Drills Library (Design)

**Date:** 2026-07-04
**Status:** Approved
**Builds on:** the entities+frames model and the black-and-white visual identity (both live).

## Purpose

A **batteries-included library** of ready-made, animated tactics and drills the coach can browse
and load onto the board. Both libraries share one engine; "tactics" and "drills" are just
categories of the same kind of thing — a pre-built multi-frame scene. This is **Group C**, the
last planned piece of the second round.

Guiding idea: a preset is exactly a normal goalpad scene, shipped read-only with the app; loading
one drops an editable copy on the board that you can Play, tweak, and Save-As.

## Architecture

### Preset data — `js/library.js` (pure data module)

```
export const LIBRARY = [
  {
    id: "tac-2v1",
    name: "2v1 attack",
    category: "tactics",            // "tactics" | "drills"
    group: "Small-sided",           // subheading within the category
    description: "Draw the defender, slip the pass",
    scene: { name, field, pieces, frames },   // a normal goalpad scene
  },
  ...
];
```

- `scene` is the **exact** shape the app already loads/saves: `field {preset, half}`,
  `pieces [{id,kind,team?,number?}]`, `frames [{positions:{[id]:{x,y}}, markup:[...]}]`.
- Multi-frame: each preset animates (press Play). Markup (green arrows, ink text) is per-frame.
- Because `library.js` is plain importable data, a Node unit test validates every entry (see
  Testing) — the quality guard for hand-authored content.

### Loading

- Loading a preset reuses the existing `loadScene(next)`. The app passes a **deep copy**
  (`JSON.parse(JSON.stringify(preset.scene))`) so editing the board never mutates the bundled
  preset. `loadScene` already sets `scene`, resets the frame index to 0, and re-renders.
- After loading, the preset is just the current scene: Play it, edit it, or Save it under a name
  via the existing Save/Load (into localStorage).

### Browse UI

- A **"Library"** button in the top bar (beside Setup and Save / Load) opens `#panel-library`.
- The panel (styled in the black-and-white identity — white card, hairline borders, Space
  Grotesk) contains:
  - Header "Library" + Close.
  - **Tactics / Drills tabs** (text tabs; active = ink + underline, inactive grey).
  - The active category's presets as a **typographic list, grouped by `group`**: an uppercase
    grey group label, then rows of `name` (ink, medium) + `description` (grey). Tapping a row
    loads that preset and closes the panel.
  - The list is built dynamically from `LIBRARY` filtered by the active category and grouped by
    `group` (group order follows first appearance in `LIBRARY`).

## Content (initial set — 14 animated presets)

### Tactics (9)
- **Small-sided:** 2v1 attack (draw the defender, slip the pass); 3v2 attack (overload, find the
  free man).
- **Attacking patterns:** Overlap (full-back overlaps the winger); Give-and-go (one-two around
  the defender); Third-man run (set, release the runner beyond); Switch of play (swing it to the
  far side).
- **Set pieces:** Corner — near post (near-post flick-on); Attacking throw-in (throw, lay-off,
  go); Free-kick — screen & shot (screen the keeper, strike).

### Drills (5) — with their `group`
- **Possession:** Rondo 5v2 (keep-ball circle); Passing pattern — Y-drill (combination through
  cones).
- **Finishing:** Finishing drill (pass, run, shoot).
- **Defending:** 1v1 defending to goal.
- **Warm-up:** Dynamic warm-up passing grid.

Each preset is authored as a multi-frame scene with sensible pitch coordinates and per-frame
markup, then verified in the browser (renders + plays) during implementation. Content is curated
and canonical; the library is designed to grow — adding a preset is appending one entry to
`LIBRARY`.

## Files Touched

- `js/library.js` (new) — the `LIBRARY` data + the 14 preset scenes.
- `js/app.js` — Library button + panel wiring; build the grouped list from `LIBRARY`; load a
  deep-copied preset via `loadScene`; Tactics/Drills tab state.
- `index.html` — the "Library" top-bar button and the `#panel-library` markup (header, tabs,
  list container).
- `styles.css` — Library panel + tab + list-row styling (reusing the existing panel/identity
  tokens).
- `test/library.test.js` (new) — validation of every preset.

## Non-Goals

- No change to the scene model, frames, playback, add/remove, half-pitch, or save/load logic —
  the library rides entirely on existing behavior.
- No user authoring **into** the library (presets are read-only bundled content; users save their
  own work through the existing Save/Load).
- No preset thumbnails (the list is typographic by design).
- No per-preset difficulty/age metadata, search, or favorites in v1 (easy to add later).

## Testing

- **Unit (`node:test`, `test/library.test.js`):** for **every** `LIBRARY` entry —
  - required fields present (`id`, `name`, `category`, `group`, `description`, `scene`);
  - `id`s are unique; `category` ∈ {"tactics","drills"};
  - `scene` is a **valid frames scene**: `serialize(scene)` then `deserialize(...)` succeeds and
    round-trips `pieces.length` and `frames.length` (uses the existing `storage.js`);
  - every frame's `positions` covers every piece id (no piece missing a position in any frame).
  - Assert the initial counts (9 tactics, 5 drills) so the content set stays intact.
- **Browser (controller-verified):** the Library button opens the panel; Tactics/Drills tabs
  filter and group correctly; loading a preset drops it on the board and closes the panel;
  pressing Play animates it; a spot-check that each of the 14 presets loads without console error
  and looks sensible; the loaded scene is editable and Save/Load still works.
