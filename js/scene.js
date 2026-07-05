// scene.js — PURE model helpers (entities + frames). No DOM/window access anywhere.

export const FIELD_DIMS = {
  '11v11': { length_m: 105, width_m: 68 },
  '9v9':   { length_m: 75,  width_m: 50 },
  '7v7':   { length_m: 55,  width_m: 37 },
  'custom':{ length_m: 40,  width_m: 30 },
};

export function fieldViewBox(field) {
  const dims = FIELD_DIMS[field.preset] || FIELD_DIMS.custom;
  const length = field.half === 'full' ? dims.length_m : dims.length_m / 2;
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

// team 'A' occupies the left of the current view, 'B' the right.
export function defaultPositions(field, team, count) {
  const { w, h } = fieldViewBox(field);
  const margin = w * 0.06;
  const xMin = team === 'A' ? margin : w / 2 + margin * 0.5;
  const xMax = team === 'A' ? w / 2 - margin * 0.5 : w - margin;
  return spread(count, xMin, xMax, h * 0.1, h * 0.9);
}

export function createScene(opts) {
  const field = { preset: opts.preset, half: opts.half || 'full' };
  const { w, h } = fieldViewBox(field);
  const pieces = [];
  const positions = {};

  const addTeam = (team, count) => {
    const pts = defaultPositions(field, team, count);
    for (let i = 0; i < count; i++) {
      const number = i + 1;
      const id = `${team}${number}`;
      pieces.push({ id, kind: 'player', team, number });
      positions[id] = pts[i];
    }
  };
  addTeam('A', opts.teamA);
  addTeam('B', opts.teamB);

  pieces.push({ id: 'ball', kind: 'ball' });
  positions['ball'] = { x: Math.round(w / 2), y: Math.round(h / 2) };

  return {
    name: opts.name || 'Untitled',
    field,
    pieces,
    frames: [{ positions, markup: [] }],
  };
}

export function pieceById(scene, id) {
  return scene.pieces.find(p => p.id === id) || null;
}

function nextNumber(scene, team) {
  const used = new Set(
    scene.pieces.filter(p => p.kind === 'player' && p.team === team).map(p => p.number)
  );
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

export function addPlayer(scene, team, x, y) {
  const number = nextNumber(scene, team);
  const id = `${team}${number}`;
  scene.pieces.push({ id, kind: 'player', team, number });
  for (const f of scene.frames) f.positions[id] = { x: Math.round(x), y: Math.round(y) };
  return id;
}

export function addCone(scene, x, y) {
  const nums = scene.pieces
    .filter(p => p.kind === 'cone')
    .map(p => Number(p.id.split('-')[1]) || 0);
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  const id = `cone-${n}`;
  scene.pieces.push({ id, kind: 'cone' });
  for (const f of scene.frames) f.positions[id] = { x: Math.round(x), y: Math.round(y) };
  return id;
}

export function addBall(scene, x, y) {
  if (scene.pieces.some((p) => p.kind === 'ball')) return null;
  scene.pieces.push({ id: 'ball', kind: 'ball' });
  for (const f of scene.frames) f.positions['ball'] = { x: Math.round(x), y: Math.round(y) };
  return 'ball';
}

export function removePiece(scene, id) {
  scene.pieces = scene.pieces.filter(p => p.id !== id);
  for (const f of scene.frames) delete f.positions[id];
}

export function duplicateFrame(scene, index) {
  const src = scene.frames[index];
  const positions = {};
  for (const [id, p] of Object.entries(src.positions)) positions[id] = { x: p.x, y: p.y };
  scene.frames.splice(index + 1, 0, { positions, markup: [] });
  return index + 1;
}

export function deleteFrame(scene, index) {
  if (scene.frames.length <= 1) return false;
  scene.frames.splice(index, 1);
  return true;
}

export function emptyScratchScene() {
  return createScene({ preset: '7v7', teamA: 0, teamB: 0, half: 'full', name: 'Scratchpad' });
}
