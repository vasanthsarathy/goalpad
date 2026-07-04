# goalpad Redesign — Stage 1: Visual System (Design)

**Date:** 2026-07-04
**Status:** Approved
**Source of truth:** the user's `goalpad-guidelines.html` (design guidelines v1). This spec applies
those guidelines to the **current app structure**; the UX restructure follows in Stages 2–3.
**Supersedes:** the previous black-and-white identity (`2026-07-03-goalpad-visual-identity-design.md`).

## Purpose

Re-skin goalpad to the guidelines' "three shapes, two values, one colour" visual system: a pure
monochrome canvas where teams are separated by **value (solid vs open)** rather than hue, and a
single **signal red** is reserved for the ball (and, later, the playhead). Retire the current
accent palette and the text-color chooser. Switch the typeface to **Jost**. This is Stage 1 of a
three-stage redesign; it changes look only — no UX/flow/model changes — so the existing tests stay
green.

## Design Tokens (from the guidelines)

```
--paper:    #FFFFFF   /* ground: pitch, panels, Team B fill */
--ink:      #0A0A0A   /* all lines, all text, Team A fill */
--mute:     #949494   /* inactive tools, captions, disabled — the only grey */
--signal:   #E10600   /* the ball (and the playhead) — nothing else */

--hairline: 1px       /* pitch markings, UI rules, dividers */
--line:     1.5px     /* token strokes, arrows, pen */
--active:   2px       /* selected tool underline, selection ring */

--font: 'Jost','Space Grotesk',Futura,system-ui,sans-serif
        /* wordmark 300 · body 400 · labels 500 */
--unit:   8px         /* all spacing = n × 8 */
--radius: 0           /* square corners everywhere except circular tokens */
```

## The Marks

- **Pitch:** white; ink hairline markings, stroke `1`.
- **Team A player:** solid ink disc (fill `#0A0A0A`), number in **paper** `#FFFFFF`. Radius 13.5.
- **Team B player:** open disc (fill `#FFFFFF`, ink stroke `1.5`), number in **ink** `#0A0A0A`.
- **Ball:** a plain **red dot** (fill `#E10600`, radius ~8, no stroke). The classic Telstar ball is
  retired — red now means ball only.
- **Cone:** ink triangle outline (fill none, ink stroke `1.5`).
- **Arrow / Pen:** ink `#0A0A0A`, stroke `1.5`. The arrowhead becomes an **open chevron** (two
  ink strokes, unfilled) rather than a filled triangle.
- **Text:** always ink `#0A0A0A`, Jost. The per-label color chooser is **removed** (rule: ink is
  ink). Existing text renders ink regardless of any stored color.

(The dashed **Run** ink tool is deferred to Stage 3, with the ink-tool taxonomy.)

## Typography

- **Jost**, self-hosted (weights 300 / 400 / 500), replacing Space Grotesk. Fallback stack
  `'Jost','Space Grotesk',Futura,system-ui,sans-serif`. Token numbers use Jost.
- **Wordmark:** `goalpad` + a small **red dot** (a `.dot` span), weight 300, letter-spacing ~.10em,
  lowercase.
- **Labels:** uppercase, 11px, letter-spacing ~.14em, weight 500 — mute `#949494` inactive, ink
  `#0A0A0A` with a **2px ink underline** when active. No button boxes, no fills.

## Chrome

- **Surface:** paper `#FFFFFF`; text ink `#0A0A0A`.
- **Dividers:** UI rules between bars are **ink hairlines** (1px solid `#0A0A0A`) — replacing the
  light-grey dividers.
- **Buttons/tools:** borderless, transparent, square (radius 0), the engraved-label treatment
  above; tap targets keep `min-height: 40px`. Active tool = ink + 2px ink underline; inactive =
  mute.
- **Panels** (Setup, Save/Load, Library): paper surface, **1px ink** border, radius **0** (square),
  no shadow (a panel scrim is the only allowed translucency).
- **Team toggle:** relabel "Blue"/"Red" → **"A"/"B"** (teams are now value, not hue); active shows
  ink + underline like a tool. (Replaced by piece chips in Stage 3.)
- **Scrub playhead:** signal red (`accent-color: #E10600`) on a hairline track.
- `theme-color` meta → `#FFFFFF`.

## Files Touched

- `fonts/` — add self-hosted **Jost** woff2 (300/400/500); remove the now-unused Space Grotesk
  woff2 files.
- `styles.css` — full restyle to the new tokens: paper/ink/mute/signal, Jost `@font-face`, ink
  hairline dividers, engraved uppercase labels + 2px active underline, square corners, red scrub
  accent, panels. **Remove** the `#text-colors`/`.swatch` styling.
- `js/field.js` — markings ink `#0A0A0A`, hairline stroke `1`.
- `js/tokens.js` — value-based players (A solid ink / B open paper), ball as a red dot, ink cone
  triangle, Jost numbers.
- `js/tools.js` — arrow/pen ink `#0A0A0A`; open-chevron arrowhead; text always ink (drop the
  text-color field and `getTextColor`).
- `js/app.js` — remove `currentTextColor`, the swatch wiring, and the `#text-colors` show/hide.
- `index.html` — wordmark + red-dot span; `theme-color` `#FFFFFF`; team-toggle labels "A"/"B";
  **remove** the `#text-colors` swatch row; Jost is loaded via CSS `@font-face` (no external link).

## Non-Goals (Stage 1)

- No UX/flow/model changes — no Watch/Build modes, no Library-home, no autosave, no piece chips,
  no filmstrip, no selection/undo. Those are Stages 2–3.
- No new tools (the Run tool arrives in Stage 3).
- No change to the scene model, frames, playback, save/load logic, or the library data — only the
  rendering/styling of existing elements.

## Testing

- **Unit:** no new pure logic ⇒ existing tests stay green (regression guard). The library
  validation test still passes (presets unaffected). The `storage.js` tests are unaffected (text
  `color` remains an accepted-but-ignored field; nothing rejects it).
- **Browser (controller-verified):** solid-ink Team A vs open Team B discs with correct number
  colors; red-dot ball; ink cone/arrow (open chevron)/pen/text; Jost loads (self-hosted, offline);
  ink hairline pitch + dividers; square corners; engraved uppercase labels with the 2px active
  underline; red scrub playhead; wordmark red dot; the text tool creates ink text with no color
  chooser; a loaded library preset still renders and plays in the new look; half-pitch letterbox
  is paper.
