# goalpad — Group B: Visual Polish (Design)

**Date:** 2026-07-03
**Status:** Approved
**Predecessor:** builds on the Group A frames model (`2026-07-03-goalpad-frames-model-editing-design.md`)

## Purpose

Make goalpad look **modern, clean, and sharp** — a deliberate, refined tactics board rather
than a bright/toy-like one. Pure visual polish: no scene-model, frames, or interaction-logic
changes. This is **Group B** of the three-part second round (A = editing/model, done;
B = this; C = tactics + drills libraries, later).

The direction was validated via side-by-side browser mockups: a **deep, muted striped pitch**;
**smaller, sharper tokens** with a hairline dark edge and a soft drop shadow; a small
**soccer ball**; and **flat, tight chrome** with hairline borders.

## Design Tokens (exact values)

### Pitch (turf & markings)
- **Mowing stripes:** vertical bands alternating `#2f5f45` (light) / `#2b5940` (dark),
  covering the full viewBox. Applies to full and left/right half views.
- **Markings:** white `rgba(255,255,255,0.9)`, stroke-width **1.4** viewBox units (was `2`).
- **Centre spot:** small `#fff` dot, r ≈ 3 (was 3).

### Player tokens
- **Radius:** **13.5** viewBox units (was 16) — ~15% smaller.
- **Edge:** hairline dark ring `rgba(0,0,0,0.32)`, stroke-width **1.6** (replaces the white
  ring of width 2).
- **Number:** `#fff`, bold, font-size **13** (was 16), centered.
- **Team A (blue):** fill `#4a6fa5` (steel blue; was `#2f6fed`).
- **Team B (red):** fill `#cf6b5a` (coral/red; was `#e8552d` orange).
- **Lift:** a soft drop shadow under all pieces via a CSS `drop-shadow` filter on the token
  layer (`#layer-tokens`): `drop-shadow(0 2px 3px rgba(5,18,11,0.5))` (tunable in browser).

### Ball
- Small soccer ball: white `#fff` disc, radius **7.6** viewBox units, thin outline `#152218`
  (width ~1.2); one central black pentagon (`#152218`) plus **five short seams** radiating to
  the rim (`#152218`, thin). Pentagon and seam geometry scale with the ball radius.

### Cone
- Amber `#d9a441` triangle with a thin dark outline `#3a2a00` (width ~1.4) — deliberately
  distinct from the coral Team B so cones and players never blur.

### Markup (arrow / pen / text)
- Muted yellow `#f0cf55` (was `#ffe14d`) for arrow/pen strokes and the arrowhead marker fill.
- Text labels stay `#fff`, bold.

### Chrome (UI shell)
- **Surface / letterbox:** `#0f1216` (board background and app body; frames the pitch and
  fills the letterbox areas of half-pitch views — was a green `#board` background).
- **Bars** (top bar, tool bar, steps bar): `#12161b`, separated by **1px hairline** borders
  `#222932`.
- **Buttons / tool chips:** background `#1b212a`, **1px** border `#2a323d`, **border-radius 2px**
  (was 8px), tightened padding, font ~12–13px. **Touch:** keep `min-height: 40px` so tap
  targets stay finger-friendly on the iPad even though the look is tight.
- **Active tool:** background `#3a5fa0`, matching border.
- **Team toggle:** Team A button `#4a6fa5` when active (label "Blue"); Team B button `#cf6b5a`
  when active (label **"Red"**, renamed from "Orange" to match the new coral).
- **Panels** (`.panel-card`): border-radius **3px** (was 12px).
- **Scrub track:** thin (3px), `#2a323d`, thumb `#4a6fa5`.
- **Tool labels:** text-first — drop the decorative emojis (e.g. `Select`, `Player`, `Cone`,
  `Arrow`, `Pen`, `Text`, `Delete`) for a sharper, cleaner bar. Keep the `🗑` on the
  Delete-frame button and the `◀ ▶` on the step-nav buttons (functional glyphs).

## Files Touched

- `js/field.js` — draw vertical striped turf before the markings; thinner marking stroke.
- `js/tokens.js` — smaller player radius, hairline dark ring, new team colors, soccer-ball
  rendering for the ball piece, amber cone.
- `js/tools.js` — markup color `#f0cf55` (arrow/pen stroke + arrowhead marker fill).
- `styles.css` — chrome flatten (surface/bar colors, hairline borders, 2–3px radii, tight
  padding with preserved tap height), token-layer `drop-shadow`, tool/team button styling,
  scrub track.
- `index.html` — `#board` background handled by CSS; tool label text (drop emojis); team
  toggle label "Orange" → "Red"; `theme-color` meta → `#0f1216`.

## Non-Goals

- No changes to the scene model, frames, playback, add/remove, save/load, or any behavior.
- No new pitch geometry (penalty arcs, corner arcs) — markings stay as they are, just thinner.
- No custom web fonts (keep the system font stack; no external assets — GitHub Pages, no build).

## Testing

- Purely visual — **browser verification** is the primary gate: the full board, half-pitch
  views (letterbox is dark chrome, not green), token shadow/ring/ball rendering at real size,
  cone/markup colors, and the flattened chrome. Check on a normal window and a narrow one
  (touch layout).
- No new pure logic ⇒ no new unit tests. The existing 26 `node:test` tests must still pass
  (this round changes no logic).
