# goalpad — Home & Library Redesign (Design)

**Date:** 2026-07-05
**Status:** Approved
**Builds on:** the completed redesign (Stages 1–3b). Changes the app's entry experience and the
Library browse UI.

## Purpose

Today goalpad launches into the Library (a big card grid) and "home" *is* the Library. Flip it: launch
straight into an editable **scratchpad** board, make the **goalpad logo** the home button, add a **Help**
guide to the nav, and rebuild the **Library** as a scannable, searchable, tagged browser with a visual
tactic/drill distinction. Built in two shippable parts — **A: Home & Nav**, then **B: Library** — with a
checkpoint between.

## Model changes

- **Scratchpad:** one persistent working board stored in its own slot `localStorage['goalpad:scratch']`
  (not a Library card). It autosaves on every edit. First run = an empty pitch (default **7v7 full**, 0
  players + ball, 1 frame); thereafter it persists exactly as left.
- **Current-doc identity** (`currentDocId`): `'scratch'` → the scratchpad (autosave → scratch slot); a
  uuid → a Mine play (autosave → that record); `null` → a template preview (no autosave until Edit forks).
- **Tags** (Part B): a `tags: string[]` field on every built-in preset (curated) and on Mine records
  (user-editable).

---

## PART A — Home & Nav

### Surfaces & navigation

- **Launch → editor on the scratchpad**, in **Build** (ready to draw). No card list on open.
- **`goalpad●` logo** (top-left) is the **home button** → loads the scratchpad into the editor (Build),
  as last left.
- **Library button** → opens the **Library** surface (in Part A this is the *existing* Templates+Mine card
  UI, now reached via the button with a Close/back instead of being the landing; Part B rebuilds it).
  Tapping a play there loads it into the editor and closes the Library.
- **Help button** → opens the **Help** panel (below).
- The old **"‹ Library" back button is removed** — the logo (home) and the Library button replace it.

### Top bar (per mode)

- **Build:** `goalpad●` · *title ✎* · **Library** · **Help** · **Setup** · **↶ ↷** · **Save** · **Done**
- **Watch:** `goalpad●` · *title* · **Library** · **Help** · **Edit**

(`Done`/`Edit` toggle Watch/Build as today; Setup/undo/redo/filmstrip/chips are unchanged.)

### Scratchpad actions

- **New / Clear** — an **"Empty pitch"** button inside the **Setup** sheet (Setup already reconfigures the
  board): resets the scratchpad to the empty default pitch after a `confirm()` (it discards the current
  scratch), saves to the scratch slot, re-renders. (Keeps the top bar uncluttered.)
- **Save** (to Library): `window.prompt` for a name → creates a **new named Mine play** (a deep copy of the
  current board) via `newTactic(name, scene)` (Part B adds an optional tags step); the current board stays
  put. Available in Build.
- Opening a Mine play or template from the Library works as today (Mine edits in place; template forks on
  Edit); the scratchpad remains the home you return to via the logo.

### Help panel

- `#panel-help` — a scrollable, monochrome in-app guide (Stage-1 idiom). Concise sections: the scratchpad &
  logo-home; placing pieces with the chips (drag/stamp, ball singular); select → ring + Duplicate/Delete,
  drag-off-pitch to remove; ink tools (Arrow / Run dashed / Pen / Text); frames & the filmstrip (tap, "+",
  long-press); Play; undo/redo (↶↷ + two-finger); Watch vs Build; the Library (browse, Save, search/tags).
  A **Close** button. Content authored as static markup in `index.html`.

### Part A files

- `js/storage.js` — `loadScratch()` / `saveScratch(scene)` over `goalpad:scratch`; `emptyScratchScene()`
  pure helper returning the default empty scene (unit-tested).
- `js/app.js` — launch → scratchpad+Build; logo→home; Library button opens the Library surface + Close
  returns to editor; Help open/close; Save-to-Library; New/Clear; scratchpad autosave routing (`currentDocId
  === 'scratch'`).
- `index.html` — new top bar (logo/title/Library/Help/Setup/↶↷/Save/Done|Edit); `#panel-help` content;
  keep `#home` (Library surface) reachable via the button with a Close.
- `styles.css` — top-bar logo button, Help panel, any Library-surface close affordance.

---

## PART B — Library redesign

Rebuild the Library surface (`#home` + `home.js`) from a big card grid into a **scannable, searchable list**.

### Layout (a full surface)

```
 goalpad●                                              [ Close ]
 ┌──────────────────────────────────────────────────────────┐
 │  search…                                                  │   name / description / tag
 └──────────────────────────────────────────────────────────┘
 [2v1] [3v2] [corner] [throw-in] [free-kick] [attack] [defence] [small-sided] [possession] [finishing] [warm-up] …
 TACTICS
 ↗ 2v1 attack            2v1 · attack · small-sided
 ↗ Overlap               attack · wide
 DRILLS
 △ Rondo 5v2             possession · warm-up
 △ 1v1 defending         defence
 MINE                                                    + New   Import
 ★ High press · U12      pressing · my-tag        ⋯ (rename · tags · duplicate · export · delete)
```

- **Search box** — live substring filter (case-insensitive) over each play's name + description + tags.
- **Tag chips** — a wrapping row of the curated situational tags; selecting chips filters to plays carrying
  **all** selected tags (AND). Chips toggle; a selected chip shows the active (ink + underline) state. The
  chip set is derived from the tags actually present in the library.
- **Grouped, icon-distinguished lists:**
  - **TACTICS** rows prefixed **↗**; **DRILLS** rows prefixed **△** (the icon+label treatment). Built-ins,
    grouped by section header, each row = icon + name + its tags (mute).
  - **MINE** rows prefixed **★** — the user's saved plays, with a per-row menu (**rename · tags · duplicate ·
    export · delete**) and the **+ New** / **Import** actions in this section header.
- Rows are compact (single-line, `min-height` 40px), far denser than the old cards.
- **Tap a row** → load that play into the editor (Watch; Edit to modify; templates fork on Edit).

### Tags

- **Curated** `tags` on all built-in presets in `library.js` + `library-season.js`: situational labels drawn
  from {2v1, 3v2, 3v3, 4v4, small-sided, corner, throw-in, free-kick, set-piece, attack, defence, possession,
  finishing, warm-up, pressing, transition, wide, third-man, overlap, give-and-go, switch, rondo, passing,
  shooting, 1v1, dribbling} (assign each preset a few that fit; not every label must be used).
- **Mine** records gain `tags: string[]`. A **tag editor** on the Mine row menu (`tags`) and at **Save**:
  a `window.prompt` seeded with comma-separated tags → parsed to a normalized array (trim, lowercase,
  dedupe). Mine tags participate in search + chip filters.
- **Filtering** is pure and unit-tested: `filterLibrary(items, { query, tags })` → items whose
  name/description/tags contain `query` (substring) AND include every tag in `tags`.

### Part B files

- `js/library.js`, `js/library-season.js` — add `tags` to every preset (data). The season file's presets
  too. Existing structure otherwise unchanged.
- `js/storage.js` — Mine `tags` (persist on the record); a pure `filterLibrary(items, {query, tags})` +
  `normalizeTags(str)`.
- `js/home.js` — rewrite as the new Library browser: search input, tag-chip row, grouped icon+label lists
  (Tactics ↗ / Drills △ / Mine ★), row menus incl. the tag editor, +New/Import. Exposes
  `renderLibrary(root, { library, mine, callbacks… })`.
- `index.html` — the Library surface markup (search + chips container + list container + Close).
- `styles.css` — search box, tag chips (+ active state), the icon-prefixed rows, section headers, denser
  list; retire the big `.card`/`.card-grid` rules.
- `test/library.test.js` — assert every built-in preset has a non-empty `tags` array of strings.
- `test/storage.test.js` — `filterLibrary` (query match, tag-AND match, empty filters return all) and
  `normalizeTags`.

---

## Non-Goals

- No change to the scene model, playback, the Build editor (chips/selection/ink/filmstrip/undo), or the
  monochrome visual system. No new colours (tactic/drill distinction is icon+label, not hue).
- The scratchpad is a single board (no multiple scratch tabs). Undo history stays session-only.

## Testing

- **Unit (`node:test`):** `emptyScratchScene` shape (Part A); `filterLibrary` + `normalizeTags` (Part B);
  every preset carries `tags` (Part B); all existing tests stay green.
- **Browser (controller-verified):**
  - **Part A:** launch → scratchpad in Build; draw, reload → scratch persists; logo → returns to scratch;
    New/Clear empties it (after confirm); Save → a named copy appears in the Library and the board stays;
    Library button opens the Library and Close returns; Help opens/closes and reads correctly; Watch/Build,
    Setup, undo/redo all still work.
  - **Part B:** search filters live; tag chips filter (AND) and toggle; Tactics ↗ / Drills △ / Mine ★ groups
    render with tags; tapping a row loads it; the Mine tag editor adds tags that then filter; +New/Import/
    rename/duplicate/export/delete all work; rows are compact; no console errors.
