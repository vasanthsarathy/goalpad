# goalpad — Group A: Frames Model & Editing (Design)

**Date:** 2026-07-03
**Status:** Approved
**Predecessor:** builds on `2026-07-02-goalpad-soccer-tactics-board-design.md`

## Purpose

Second round of improvements to the goalpad tactics board, focused on editing power
and the underlying model. This is **Group A** of a three-part effort:

- **Group A (this spec):** frames model, step-tied markup, add/remove players, delete a
  frame, half-pitch on a chosen side.
- **Group B (later):** visual polish (prettier / more realistic look).
- **Group C (later):** batteries-included preset tactics library (depends on Group A).

## Motivation (user requests addressed here)

1. **Delete a frame/step** — there is currently no way to remove a captured step.
2. **Transient markup** — arrows / pen / text should not be forced to persist; they belong
   to a moment, unlike on-field objects (cones, ball).
4. **Half-pitch side** — a half pitch should show one real half (with its goal) on the
   left or right by user choice, not a middle slice.
5. **Start empty & add players** — begin from an empty pitch and tap players in.

(Items 3 and 6 are Groups B and C, separate specs.)

## The Core Change: Entities + Frames

Today the model keeps *live* positions on `scene.players`/`scene.ball` and stores captured
`steps[]` as position snapshots; markup is a single global list. That cannot cleanly express
"markup belongs to one step" or "a player exists across all steps," so the model is
refactored to an **entities + keyframes** shape.

```
scene = {
  name: "Overlap on the right",
  field: { preset: "11v11" | "9v9" | "7v7" | "custom", half: "full" | "left" | "right" },
  pieces: [
    { id: "A1", kind: "player", team: "A", number: 1 },
    { id: "B1", kind: "player", team: "B", number: 1 },
    { id: "ball", kind: "ball" },
    { id: "cone-1", kind: "cone" },
    ...
  ],
  frames: [
    { positions: { "A1": {x,y}, "B1": {x,y}, "ball": {x,y}, "cone-1": {x,y}, ... },
      markup: [ { type: "arrow"|"pen"|"text", ... } ] },
    ...
  ]
}
```

### Rules

- **A piece is an entity; each frame stores where that piece is.** Every piece has a
  position entry in every frame.
- **Adding a piece** inserts it into `pieces` and adds a position for it in **every** frame
  (all at the same point where it was added). **Removing a piece** deletes it from `pieces`
  and from every frame's `positions`.
- **Markup lives inside a frame** (`frame.markup`). It is shown only when that frame is the
  active frame. Markup never tweens — it shows or hides.
- **There is always at least one frame.** A new scene has exactly one frame. "Add step"
  duplicates the current frame and selects the copy. "Delete step" removes the current
  frame and is blocked when only one frame remains.
- **`field.half`** is `full` | `left` | `right`.

### Coordinates

Unchanged from v1: positions are in the field's SVG viewBox units (1 unit = 0.1 m). The
viewBox is set from the field size and half selection.

## Piece kinds

- `player` — has `team` ("A"/"B") and `number`. Rendered as a colored numbered circle.
- `ball` — single ball (a scene may have one or none). Rendered as the white token.
- `cone` — training marker. Rendered as an orange triangle. Cones are **pieces**, not
  markup: they persist across frames and can be positioned per frame.

Player ids are `A<number>` / `B<number>`. Cone ids are `cone-<n>` where `<n>` is a
monotonic counter stored implicitly by taking `max existing + 1` (so ids stay unique even
after deletions). The ball id is the literal `"ball"`.

## Interactions

### Current frame

App state tracks a **current frame index**. Everything you see and edit is that frame:
tokens render at that frame's positions, and drawing adds to that frame's markup. The
scrubber selects the current frame (and interpolates between frames as before).

### Add / remove players (item 5)

- A new **Add** tool in the toolbar, with a **team toggle** (blue A / orange B) beside it.
- With Add active and a team selected, **tapping an empty pitch spot** creates a player of
  that team with the next free number for that team (`min positive integer not in use`),
  positioned at the tap point in **all** frames.
- The existing **Delete** tool removes a tapped player (and its positions from all frames).
  Delete also removes a tapped cone or a tapped markup item (whichever was tapped).
- "Start empty" is achieved via Setup (Team A = 0, Team B = 0); then tap players in.

### Add cones

The **Cone** tool adds a cone piece at the tapped point (in all frames), consistent with
players. (In v1 cones were markup; they become pieces.)

### Delete a frame (item 1)

- A **Delete frame** button (🗑) in the steps bar removes the current frame.
- Disabled when `frames.length === 1`.
- After deletion, the current index clamps to `min(index, frames.length - 1)` and the
  scrubber range/label refresh.

### Step-tied markup (item 2)

- Drawing arrow / pen / text with a markup tool adds the shape to the **current frame's**
  `markup`.
- Rendering shows only the **active frame's** markup.
- **Active-markup rule during Play/scrub:** the active markup frame is a pure function of
  the scrub position `pos` (0..frames.length-1): if `pos` is within a small epsilon of an
  integer, use `round(pos)` (settled on a frame → that frame's markup); otherwise use
  `ceil(pos)` (mid-transition → the target frame's markup). So while pieces move from frame
  *i* toward *i+1*, frame *i+1's* run-arrow is visible for the whole segment, then the next
  frame's markup takes over. This needs no separate "is playing" flag.

### Half-pitch side (item 4)

- `field.half`: `full` renders the whole pitch; `left` renders the left half (left goal +
  penalty box, halfway line at the right edge of the view); `right` mirrors it.
- The SVG viewBox is the half's dimensions so the chosen half fills the screen.

## Setup panel

Three controls, applied together (rebuilds the scene into a single starting frame, same as
v1, with the "rebuilds the board" note):

- **Field size:** 11v11 / 9v9 / 7v7 / Custom grid — sets pitch dimensions.
- **Pitch:** Full / Left half / Right half.
- **Starting players:** Team A count and Team B count, each **0–11**. `0/0` produces an
  empty pitch (ball only) to build up by hand; e.g. `3/2` seeds a 3v2.

## File / Module Plan

Each module keeps one clear responsibility.

- `js/scene.js` — pure model: `FIELD_DIMS`, `fieldViewBox(field)` (accounts for half),
  `createScene(opts)`, `defaultPositions(field, counts)`, `addPlayer(scene, team, x, y)`,
  `addCone(scene, x, y)`, `removePiece(scene, id)`, `duplicateFrame(scene, index)`,
  `deleteFrame(scene, index)`, `pieceById(scene, id)`. No DOM.
- `js/steps.js` — pure `interpolateFrames(frameA, frameB, t)`, `ease(t)`,
  `activeMarkupIndex(pos)`; plus the browser Play/scrub controller over frames.
  No import-time DOM.
- `js/tokens.js` — render pieces from the current frame's positions; drag updates the
  current frame's position for that piece.
- `js/tools.js` — markup tools write into the current frame's `markup`; Cone/Add-player
  create pieces; Delete removes a piece or a markup item; `renderMarkup(layer, frame)`.
- `js/field.js` — pitch markings for full/left/right.
- `js/storage.js` — `serialize`/`deserialize` for the new shape with validation; reject a
  document that is not a valid frames-model scene (missing `pieces`/`frames`, or a legacy
  `players`/`steps` shape) by throwing, so the import `.catch` reports it cleanly.
- `js/app.js` — current-frame state, Add-tool + team toggle wiring, Delete-frame button,
  Setup changes, per-frame token + markup rendering, scrub/Play wiring.
- `index.html` / `styles.css` — Add tool + team toggle, Delete-frame button, Setup pitch
  select + roster counts (0–11), styling.

## Testing

- **Unit (`node:test`):**
  - `scene.js`: default positions/counts incl. `0/0` empty; `addPlayer` gives the next free
    number and a position in every frame; `removePiece` clears it from all frames;
    `duplicateFrame` deep-copies positions and markup; `deleteFrame` guards the last frame;
    `fieldViewBox` for full/left/right.
  - `steps.js`: `interpolateFrames` blends piece positions by `t`, holds a piece with no
    target; `ease` smoothstep; `activeMarkupIndex(pos)` returns `round` at integer positions
    and `ceil` at fractional ones (target frame mid-transition).
  - `storage.js`: round-trip of the frames shape; rejection of a legacy `{players, steps}`
    document and of a non-scene document.
- **Browser (controller-verified):** add/remove players by tap, delete frame, markup
  appears only on its frame and swaps during Play, half-left/right rendering, empty-start
  flow, save/load round-trip.

## Non-Goals (Group A)

- No visual restyle (Group B).
- No preset tactics content (Group C).
- No migration of previously-saved v1 scenes (rejected gracefully; the project is early and
  personal).
- Markup remains non-animated (shows/hides only).
