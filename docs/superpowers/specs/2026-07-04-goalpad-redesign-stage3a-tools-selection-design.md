# goalpad Redesign — Stage 3a: Build Tools & Selection (Design)

**Date:** 2026-07-04
**Status:** Approved
**Source of truth:** the user's `goalpad-ux-spec.html` (UX spec v1), sections 05 (Tools), 08 (Interaction rules), plus the Build wireframe in §04.
**Builds on:** Stage 2 (Home + Watch/Build modes + autosave, merged). First half of Stage 3; Stage 3b (filmstrip + undo/redo) follows.

## Purpose

Replace Build's tool-per-button model with the UX-spec interaction model: **piece chips** you tap-to-stamp or drag-to-place (the chip *is* the team), an **ink taxonomy** with a new dashed **Run** tool, tap-to-**select** with a contextual **Duplicate/Delete** chip (retiring the Delete tool), and **drag-off-pitch** to remove. This makes Build match the wireframe. It does **not** add the filmstrip or undo/redo (Stage 3b) — Build keeps Stage 2's steps bar, and actions are not yet undoable.

## Interaction model

Two pieces of Build state replace the old `currentTool`/`currentTeam`:

- **`armed`**: `null` (neutral) · `{ type:'piece', kind }` with `kind ∈ {A, B, ball, cone}` · `{ type:'ink', tool }` with `tool ∈ {arrow, run, pen, text}`.
- **`selected`**: `null` · `{ type:'piece', id }` · `{ type:'ink', index }`.

Arming a chip/tool clears `selected`; selecting clears nothing armed-related but a tap that selects only happens in neutral. All piece/ink interaction is **Build-only** (gated on `mode === 'build'`); Watch stays view-only.

### Gestures (empty pitch vs. a piece vs. a mark)

Tokens capture their own pointer events (stop propagation), so the SVG-level handler only sees **empty-pitch** input.

| Gesture | Neutral (nothing armed) | Piece chip armed | Ink tool armed |
|---|---|---|---|
| Tap empty pitch | Deselect | Stamp one piece of that kind | Text: prompt+place · Arrow/Run/Pen: (a drag draws) |
| Drag on empty pitch | — | — | Draw arrow / run / pen |
| Tap a piece | Select it (ring + chip) | ignored | ignored |
| Drag a piece | Move it (writes current frame) | Move it | Move it |
| Drag a piece off the pitch | Remove it | Remove it | Remove it |
| Tap a mark | Select it (Delete chip) | ignored | ignored |

- **Disarm:** tap the active chip/tool again → `armed = null` (sticky toggle). Arming a different chip/tool switches.
- Tap-vs-drag on a piece is decided by movement threshold (~4 viewBox units) between pointerdown and pointerup.
- "Off the pitch" = the piece's released position is outside the field viewBox bounds.

## Toolbar (Build)

Remove **Select**, **Player**, the **A/B toggle**, and **Delete**. The Build toolbar becomes:

```
[● A-solid] [○ B-open] [🔴 ball] [▲ cone]   |   ARROW   RUN   PEN   TEXT
```

- **Piece chips** — four buttons each drawn as the mark itself (solid ink disc, open disc, red dot, ink triangle). Active (armed) chip shows the 2px ink underline.
- **Ink tools** — engraved uppercase labels; active shows ink + 2px underline (as Stage 1). **Run** draws a dashed arrow.
- Chips: **tap** toggles stamp-arming; **drag from the chip onto the board** places one piece where released (same "place at (x,y)" path as a stamp).
- The team is the chip picked (A = solid, B = open). The **ball is singular**: its chip adds a ball only if the scene has none.

## Selection & the contextual chip

- **Tap a piece** (neutral) → render a **2px ink selection ring** around it and show a small square popover chip beside it:
  - player / cone → **Duplicate · Delete**
  - ball → **Delete** (a scene holds one ball)
- **Tap a mark** (neutral) → emphasize it and show a **Delete** chip beside it.
- **Tap empty pitch**, arm any chip/tool, or act on the chip → **deselect** (ring + chip removed).
- **Duplicate** adds a copy of the piece offset ~20 units (a new player of the same team via `addPlayer`, or a new cone via `addCone`), then keeps/refreshes selection on the original.
- **Delete** removes the piece (`removePiece`) or splices the mark out of the current frame, then deselects.
- The chip is a body-anchored popover (same pattern as the Home card menu), closed on outside tap.

## Ink

- Markup gains a **run** type: `{ type:'run', x1, y1, x2, y2 }`, rendered as a **dashed** ink line with the open-chevron arrowhead (`stroke-dasharray` ~`7 6`, stroke `#0a0a0a`, width `1.5`). Arrow stays solid.
- Arrow / Run / Pen draw by dragging on empty pitch; Text prompts and places (as today). All sticky-armed.

## Files

- **`js/scene.js`** — add pure `addBall(scene, x, y)`: appends a `{id:'ball',kind:'ball'}` piece with a position in every frame, **only if no ball exists** (returns the piece or `null`).
- **`js/tokens.js`** — `renderTokens` gains an options object: interaction is Build-only; a token **tap** (no move, neutral) selects; a **drag** moves and, if released off-pitch, removes; the **selected** piece renders a 2px ink ring. New signature: `renderTokens(svg, layerEl, scene, frame, { getMode, getArmed, selectedId, onSelect, onChange, onRemove })`.
- **`js/tools.js`** — `renderMarkup` gains the **run** branch (and emphasizes a selected mark). `initTools` switches to the `armed` model: empty-pitch stamps a piece (`addPlayer`/`addCone`/`addBall`) when a piece chip is armed, draws arrow/run/pen or prompts text when an ink tool is armed, and in neutral selects a tapped mark or deselects. Drops the old `add`/`cone`/`delete`/`select` branches. New options: `{ getScene, getFrame, getArmed, onSceneChange, onMarkupChange, onSelectInk, onDeselect }`.
- **`js/app.js`** — owns `armed`/`selected`; wires the chips + ink buttons (toggle-arm, mutually exclusive); the contextual selection-chip popover (Duplicate/Delete); the drag-chip-to-place path; passes `getMode`/`getArmed`/`selectedId` and the select/remove/change callbacks into `renderTokens`/`initTools`; re-renders on selection change. Removes the old tool/team wiring.
- **`index.html`** — replace the `#toolbar` contents with the four chips + divider + four ink buttons.
- **`styles.css`** — `.chip` (button holding the mark SVG, 40px tap, 2px active underline), the chip divider, and the selection-chip popover (`.sel-chip`/`.sel-item`), in the Stage 1 monochrome idiom.

## Non-Goals (Stage 3a)

- No frame **filmstrip** and no **undo/redo** (Stage 3b). Build keeps Stage 2's steps bar (scrub / + Frame / 🗑 Frame / Play); placements/deletes are not yet undoable.
- No change to Watch, Home, autosave, the scene model beyond `addBall`, playback, or the library data.

## Testing

- **Unit (`node:test`):** `addBall` — adds a ball with a position in every frame when absent; is a no-op (returns null) when a ball exists; does not disturb other pieces. Existing serialize/deserialize/scene/steps/storage/library tests stay green.
- **Browser (controller-verified):** the four chips stamp the right marks (A solid / B open / ball singular / cone), tap-arm toggles with the underline, drag-chip-to-place works; tap a piece → ring + Duplicate/Delete chip (ball → Delete only), Duplicate adds a copy, Delete removes; tap a mark → Delete chip; tap empty deselects; drag a piece off the pitch removes it; Arrow solid vs **Run dashed** both draw and animate; Text still works; autosave persists all of these; Watch remains view-only (no chips, no selection); no console errors.
