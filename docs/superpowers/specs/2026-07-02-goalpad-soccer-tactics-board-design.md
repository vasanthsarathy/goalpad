# goalpad — Soccer Tactics Board (Design)

**Date:** 2026-07-02
**Status:** Approved

## Purpose

A simple, web-based soccer tactics board for a coach who is learning to coach.
Used primarily on an iPad (finger touch) while reading coaching books, to:

- **Whiteboard** — drag players and the ball around a pitch, draw arrows and runs.
- **Animate plays** — build a tactic as a sequence of steps and play it back smoothly.
- **Study formations / scenarios** — set up presets (7v7, 9v9, 11v11) or small-sided,
  asymmetric situations (2v1, 3v2, etc.).

Hosted as a static site on GitHub Pages — no server, no login, no backend.

## Non-Goals (v1)

- No accounts, cloud sync, or multi-user sharing.
- No live/real-time motion recording (steps/keyframes only — see Animation).
- No per-step annotations (annotations are fixed on screen during playback; may add later).
- No image/video export (may add later).

## Core Interactions

1. **Whiteboard (foundation):** drag players/ball freely; draw arrows, freehand pen,
   drop cones, add text labels.
2. **Steps/keyframes (animation):** a step is a snapshot of all positions. Arrange board,
   "Add step", move players, "Add step" again. Press Play and players glide between steps.
   A slider scrubs between steps. Any step can be re-selected and edited.
3. **Setup:** choose a preset field size / team count, or dial in any counts per side for
   small-sided/asymmetric scenarios. Add/remove individual players anytime.

## Technical Approach

Vanilla HTML / CSS / JavaScript with a single **SVG** render surface. No build step,
no dependencies, no toolchain — push files to GitHub and it is live.

- SVG chosen over Canvas: players as `<circle>`, arrows/pen as `<path>`; free hit-testing
  ("did I tap this player?") and crisp rendering on the iPad's retina display.
- **Pointer events** unify finger-on-iPad and mouse-on-laptop.

## Structure & Components

```
goalpad/
  index.html        # page shell + toolbar markup
  styles.css        # layout, touch-friendly buttons
  js/
    field.js        # draws the pitch (7v7 / 9v9 / 11v11, full or half)
    tokens.js       # players + ball: create, drag, color, number
    tools.js        # annotation tools: arrows, pen, cones, text
    steps.js        # keyframe steps: capture, play, scrub
    storage.js      # save/load named scenes + export/import file
    app.js          # wires modules together, holds the current scene
```

Each module has one job and communicates through a well-defined interface:

- `field.js` — given a field config, render pitch markings. Knows nothing about players.
- `tokens.js` — create/drag/style player and ball tokens. Knows nothing about steps.
- `tools.js` — annotation drawing (arrow, pen, cone, text) as SVG elements.
- `steps.js` — snapshot positions into steps; interpolate between steps on Play; scrub.
- `storage.js` — serialize/deserialize the scene to localStorage and to a `.json` file.
- `app.js` — the single owner of the current scene; wires modules and events.

Everything renders into **one SVG element** that fills the screen.

## Data Model

The entire board state is one **scene** object — the unit that is saved, loaded, exported:

```
scene = {
  name: "Overlap on the right",
  field: { preset: "9v9" | "7v7" | "11v11" | "custom", teamA: 9, teamB: 9, half: false },
  players: [ { id, team: "A" | "B", number, x, y }, ... ],
  ball:    { x, y },
  annotations: [ { type: "arrow" | "pen" | "cone" | "text", ... }, ... ],
  steps: [ step0, step1, step2, ... ]        // each step = snapshot of positions
}
```

- `field.preset` of `7v7`/`9v9`/`11v11` sets `teamA`/`teamB` to matching counts; `custom`
  lets `teamA` and `teamB` differ independently (e.g. `2` vs `1` for a 2v1).
- A **step** stores each player's `x/y` and the ball's `x/y` (a position snapshot).
- **Play** interpolates every token from step N to step N+1 over a fixed duration,
  in sequence. A slider scrubs between steps.
- Coordinates are stored in a normalized field space so a scene renders correctly at any
  screen size / orientation.

### Annotations during animation (decided)

Annotations (arrows, pen, cones, text) stay **fixed** on screen during playback in v1.
Per-step annotations are a possible later enhancement.

## Saving & Sharing

- **Save:** write the scene to `localStorage` under a name; saved scenes appear in a list
  to reload. Persists on the iPad between sessions.
- **Export:** download the scene as a small `.json` file (backup / move to another device).
- **Import:** read a `.json` scene back in.

## Screen Layout (iPad-first)

```
┌────────────────────────────────────────────┐
│ ▦ goalpad   [Setup] [Save/Load]   ⚙        │  ← thin top bar
├────────────────────────────────────────────┤
│            THE PITCH (big SVG)             │
│         drag players • draw • tap          │
├────────────────────────────────────────────┤
│ 👆select ↗arrow ✎pen ▲cone T text  🗑     │  ← tool bar
├────────────────────────────────────────────┤
│  ◀ ●─────────────── ▶   [+ Add step]  ▶Play │  ← steps bar
└────────────────────────────────────────────┘
```

- **Top bar:** app name; **Setup** (field size / team counts) and **Save/Load** open small
  pop-up panels so they don't clutter the board.
- **Tool bar:** select/drag, arrow, pen, cone, text, delete — large, finger-friendly;
  tap to activate.
- **Steps bar:** scrubber slider, **Add step**, **Play**. Isolated here so the board stays
  clean while whiteboarding.
- Sized for touch (large tap targets); also works with a mouse. Landscape iPad gives the
  pitch full width with thin bars top and bottom.

## Testing

- Manual/interactive testing on desktop (mouse) and iPad (touch) is the primary check,
  since this is an interactive visual tool.
- Where practical, unit-test the pure logic: scene serialize/deserialize (`storage.js`)
  and step interpolation math (`steps.js`), which have no DOM dependency.

## Build Order (rough)

1. Field rendering + one preset.
2. Draggable players + ball.
3. Setup control (sizes, counts, add/remove).
4. Annotation tools.
5. Steps: capture, play, scrub.
6. Save/load + export/import.
7. Polish for touch / iPad landscape.
