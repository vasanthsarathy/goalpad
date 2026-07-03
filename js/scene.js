// scene.js — PURE model helpers. No DOM/window access anywhere in this file.

export const FIELD_DIMS = {
  '11v11': { length_m: 105, width_m: 68 },
  '9v9':   { length_m: 75,  width_m: 50 },
  '7v7':   { length_m: 55,  width_m: 37 },
  'custom':{ length_m: 40,  width_m: 30 }, // compact grid, good for 2v1 / 3v2
};

// Presets have a dedicated goalkeeper as player #1; custom grids do not.
const PRESETS_WITH_GK = new Set(['11v11', '9v9', '7v7']);

export function fieldViewBox(field) {
  const dims = FIELD_DIMS[field.preset] || FIELD_DIMS.custom;
  const length = field.half ? dims.length_m / 2 : dims.length_m;
  return { w: Math.round(length * 10), h: Math.round(dims.width_m * 10) };
}

// Spread `count` points across a near-square grid inside a rectangle.
function spread(count, xMin, xMax, yMin, yMax) {
  const pts = [];
  if (count <= 0) return pts;
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const rowCount = Math.min(cols, count - r * cols);
    const x = xMin + (xMax - xMin) * ((r + 1) / (rows + 1));
    const y = yMin + (yMax - yMin) * ((c + 1) / (rowCount + 1));
    pts.push({ x: Math.round(x), y: Math.round(y) });
  }
  return pts;
}

function playersForTeam(team, count, field) {
  const { w, h } = fieldViewBox(field);
  const hasGK = PRESETS_WITH_GK.has(field.preset);
  const attacksRight = team === 'A';
  const halfMin = attacksRight ? 0 : w / 2;
  const halfMax = attacksRight ? w / 2 : w;
  const out = [];
  let outfield = count;
  if (hasGK && count >= 1) {
    const gx = attacksRight ? Math.round(w * 0.04) : Math.round(w * 0.96);
    out.push({ id: `${team}1`, team, number: 1, x: gx, y: Math.round(h / 2) });
    outfield = count - 1;
  }
  const margin = w * 0.06;
  const pts = spread(outfield, halfMin + margin, halfMax - margin, h * 0.1, h * 0.9);
  for (let i = 0; i < outfield; i++) {
    const number = (hasGK ? i + 2 : i + 1);
    out.push({ id: `${team}${number}`, team, number, x: pts[i].x, y: pts[i].y });
  }
  return out;
}

export function defaultPlayers(field) {
  return [
    ...playersForTeam('A', field.teamA, field),
    ...playersForTeam('B', field.teamB, field),
  ];
}

export function createScene(field, name = 'Untitled') {
  const { w, h } = fieldViewBox(field);
  return {
    name,
    field: { preset: field.preset, teamA: field.teamA, teamB: field.teamB, half: !!field.half },
    players: defaultPlayers(field),
    ball: { x: Math.round(w / 2), y: Math.round(h / 2) },
    annotations: [],
    steps: [],
  };
}

export function applyStep(scene, step) {
  const byId = new Map(step.players.map(p => [p.id, p]));
  for (const player of scene.players) {
    const snap = byId.get(player.id);
    if (snap) { player.x = snap.x; player.y = snap.y; }
  }
  if (step.ball) { scene.ball.x = step.ball.x; scene.ball.y = step.ball.y; }
}
