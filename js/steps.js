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
