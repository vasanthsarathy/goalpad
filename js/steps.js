// steps.js — PURE interpolation (top) + browser Play/scrub controller (bottom).

export function ease(t) {
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) { return a + (b - a) * t; }

// Returns a positions map { [id]: {x,y} } blended from frame a to frame b by raw t.
export function interpolateFrames(a, b, t) {
  const out = {};
  for (const id of Object.keys(a.positions)) {
    const pa = a.positions[id];
    const pb = (b.positions && b.positions[id]) || pa; // missing target -> hold
    out[id] = { x: lerp(pa.x, pb.x, t), y: lerp(pa.y, pb.y, t) };
  }
  return out;
}

export function activeMarkupIndex(pos) {
  const r = Math.round(pos);
  if (Math.abs(pos - r) < 1e-6) return r;
  return Math.ceil(pos);
}

// ---- Browser Play/scrub controller (requestAnimationFrame; no import-time DOM) ----
// applyPositions(positionsMap, scrubPos): render pieces at positionsMap and update
// active markup + scrub UI for scrubPos.
export function createStepController({ getScene, applyPositions, onDone }) {
  const SEGMENT_MS = 800;
  let playing = false;

  function scrubTo(pos) {
    const frames = getScene().frames;
    if (frames.length === 0) return;
    if (frames.length === 1) { applyPositions(interpolateFrames(frames[0], frames[0], 0), 0); return; }
    const clamped = Math.max(0, Math.min(frames.length - 1, pos));
    const seg = Math.min(Math.floor(clamped), frames.length - 2);
    const t = clamped - seg;
    applyPositions(interpolateFrames(frames[seg], frames[seg + 1], t), clamped);
  }

  function play() {
    const frames = getScene().frames;
    if (playing || frames.length < 2) return;
    playing = true;
    let seg = 0;
    let start = null;
    function frame(ts) {
      if (!playing) return;
      if (start == null) start = ts;
      const raw = Math.min(1, (ts - start) / SEGMENT_MS);
      applyPositions(interpolateFrames(frames[seg], frames[seg + 1], ease(raw)), seg + raw);
      if (raw < 1) {
        requestAnimationFrame(frame);
      } else if (seg < frames.length - 2) {
        seg += 1; start = null; requestAnimationFrame(frame);
      } else {
        playing = false;
        if (onDone) onDone(frames.length - 1);
      }
    }
    requestAnimationFrame(frame);
  }

  return { play, scrubTo };
}
