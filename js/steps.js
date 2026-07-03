// steps.js — PURE snapshot + interpolation (top of file, no DOM at import time).

export function captureStep(scene) {
  return {
    players: scene.players.map(p => ({ id: p.id, x: p.x, y: p.y })),
    ball: { x: scene.ball.x, y: scene.ball.y },
  };
}

// Smoothstep easing: slow-in, slow-out.
export function ease(t) {
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) { return a + (b - a) * t; }

export function interpolateSteps(a, b, t) {
  const targets = new Map(b.players.map(p => [p.id, p]));
  const players = a.players.map(p => {
    const to = targets.get(p.id) || p; // missing target → hold position
    return { id: p.id, x: lerp(p.x, to.x, t), y: lerp(p.y, to.y, t) };
  });
  const ball = {
    x: lerp(a.ball.x, b.ball.x, t),
    y: lerp(a.ball.y, b.ball.y, t),
  };
  return { players, ball };
}

// ---- Browser playback controller (uses requestAnimationFrame; no import-time DOM) ----
export function createStepController({ scene, applyPositions, onStepsChanged }) {
  const SEGMENT_MS = 800;
  let playing = false;

  function addStep() {
    scene.steps.push(captureStep(scene));
    onStepsChanged(scene.steps.length);
  }

  // pos is a fractional index across steps: 0 .. steps.length-1
  function scrubTo(pos) {
    const steps = scene.steps;
    if (steps.length === 0) return;
    if (steps.length === 1) { applyPositions(steps[0]); return; }
    const clamped = Math.max(0, Math.min(steps.length - 1, pos));
    const seg = Math.min(Math.floor(clamped), steps.length - 2);
    const t = clamped - seg;
    applyPositions(interpolateSteps(steps[seg], steps[seg + 1], t));
  }

  function play() {
    const steps = scene.steps;
    if (playing || steps.length < 2) return;
    playing = true;
    let seg = 0;
    let start = null;
    function frame(ts) {
      if (!playing) return;
      if (start == null) start = ts;
      const raw = Math.min(1, (ts - start) / SEGMENT_MS);
      applyPositions(interpolateSteps(steps[seg], steps[seg + 1], ease(raw)), seg + raw);
      if (raw < 1) {
        requestAnimationFrame(frame);
      } else if (seg < steps.length - 2) {
        seg += 1; start = null; requestAnimationFrame(frame);
      } else {
        playing = false;
      }
    }
    requestAnimationFrame(frame);
  }

  return {
    addStep,
    play,
    scrubTo,
    next() { /* index-based nav handled by app via scrubTo */ },
    prev() {},
    get count() { return scene.steps.length; },
  };
}
