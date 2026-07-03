# goalpad

A simple, touch-friendly soccer tactics board. Drag players and the ball on a
pitch, draw arrows/runs, and animate a play step by step. Runs entirely in the
browser — nothing is uploaded anywhere; saved plays live on your device.

## Use it

Open `index.html` through any static web server. Locally:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

(ES modules require `http://`, not opening the file directly.)

## Host on GitHub Pages

1. Push this folder to a GitHub repository.
2. Repo **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`.
3. Open the published URL on your iPad. Add it to the Home Screen for a full-screen app feel.

## What it does

- **Setup:** 11v11 / 9v9 / 7v7, or a custom small-sided grid (e.g. 2v1, 3v2).
- **Whiteboard:** drag players + ball; draw arrows, freehand, cones, and text.
- **Animate:** capture steps, press Play to glide between them, scrub with the slider.
- **Save:** name plays (stored on the device); export/import as `.json` to back up or move.

## Develop

Pure logic modules are unit-tested with Node's built-in runner:

```bash
node --test
```
