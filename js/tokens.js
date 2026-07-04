// tokens.js — DOM: outlined-ring players, classic Telstar ball, orange cone.
const SVGNS = 'http://www.w3.org/2000/svg';
const COLORS = { A: '#4e74ae', B: '#c15f5b' };
const INK = '#1b1f27';
const R = 13.5; // player ring radius (viewBox units)

export function clientToSvg(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: p.x, y: p.y };
}

function el(name, attrs) {
  const n = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

// Classic Telstar ball as an inner <svg> so the rim patches clip to the disc.
function ballShape() {
  const s = el('svg', { x: -9, y: -9, width: 18, height: 18, viewBox: '-44 -44 88 88' });
  const clip = el('clipPath', { id: 'ballclip' });
  clip.appendChild(el('circle', { r: 40 }));
  s.appendChild(clip);
  s.appendChild(el('circle', { r: 40, fill: '#ffffff', stroke: INK, 'stroke-width': '2.6' }));
  const marks = el('g', { 'clip-path': 'url(#ballclip)', fill: INK });
  marks.appendChild(el('path', { d: 'M0,-15 L14.27,-4.63 L8.82,12.14 L-8.82,12.14 L-14.27,-4.63 Z' }));
  const seams = el('g', { stroke: INK, 'stroke-width': '3', 'stroke-linecap': 'round', fill: 'none' });
  for (const [x1, y1, x2, y2] of [
    [0, -15, 0, -36], [14.27, -4.63, 34.2, -11.1], [8.82, 12.14, 21.2, 29.1],
    [-8.82, 12.14, -21.2, 29.1], [-14.27, -4.63, -34.2, -11.1],
  ]) seams.appendChild(el('line', { x1, y1, x2, y2 }));
  marks.appendChild(seams);
  for (const d of [
    'M0,-43 L6.66,-38.16 L4.11,-30.34 L-4.11,-30.34 L-6.66,-38.16 Z',
    'M34.2,-18.1 L40.86,-13.26 L38.31,-5.44 L30.09,-5.44 L27.54,-13.26 Z',
    'M21.2,22.1 L27.86,26.94 L25.31,34.76 L17.09,34.76 L14.54,26.94 Z',
    'M-21.2,22.1 L-14.54,26.94 L-17.09,34.76 L-25.31,34.76 L-27.86,26.94 Z',
    'M-34.2,-18.1 L-27.54,-13.26 L-30.09,-5.44 L-38.31,-5.44 L-40.86,-13.26 Z',
  ]) marks.appendChild(el('path', { d }));
  s.appendChild(marks);
  return [s];
}

function shapeFor(piece) {
  if (piece.kind === 'player') {
    const c = el('circle', { r: R, fill: '#ffffff', stroke: COLORS[piece.team], 'stroke-width': '1.3' });
    const t = el('text', {
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-family': 'Space Grotesk, system-ui, sans-serif', 'font-size': '13', 'font-weight': '500',
      fill: COLORS[piece.team],
    });
    t.textContent = String(piece.number);
    return [c, t];
  }
  if (piece.kind === 'ball') return ballShape();
  // cone
  return [el('path', { d: 'M0,-11 L-9,8 L9,8 Z', fill: '#cb8a52', stroke: '#8a6234', 'stroke-width': '1.2' })];
}

function makeDraggable(svg, groupEl, frame, id, getTool, onChange) {
  let dragging = false;
  groupEl.addEventListener('pointerdown', (e) => {
    if (getTool() !== 'select') return;
    dragging = true;
    groupEl.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });
  groupEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    frame.positions[id] = { x: Math.round(x), y: Math.round(y) };
    groupEl.setAttribute('transform', `translate(${frame.positions[id].x}, ${frame.positions[id].y})`);
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    try { groupEl.releasePointerCapture(e.pointerId); } catch {}
    onChange && onChange();
  };
  groupEl.addEventListener('pointerup', end);
  groupEl.addEventListener('pointercancel', end);
}

export function renderTokens(svg, layerEl, scene, frame, getTool, onChange) {
  layerEl.replaceChildren();
  for (const piece of scene.pieces) {
    const pos = frame.positions[piece.id] || { x: 0, y: 0 };
    const g = el('g', { transform: `translate(${pos.x}, ${pos.y})` });
    g.dataset.tokenId = piece.id;
    g.style.cursor = 'grab';
    for (const s of shapeFor(piece)) g.appendChild(s);
    makeDraggable(svg, g, frame, piece.id, getTool, onChange);
    layerEl.appendChild(g);
  }
}

export function setTokenPositions(layerEl, positionsMap) {
  for (const g of layerEl.querySelectorAll('[data-token-id]')) {
    const p = positionsMap[g.dataset.tokenId];
    if (p) g.setAttribute('transform', `translate(${p.x}, ${p.y})`);
  }
}
