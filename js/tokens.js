// tokens.js — DOM: render pieces (player/ball/cone) from a frame; drag in select mode.
const SVGNS = 'http://www.w3.org/2000/svg';
const COLORS = { A: '#4a6fa5', B: '#cf6b5a' };
const R = 13.5; // player token radius (viewBox units)

export function clientToSvg(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: p.x, y: p.y };
}

function el(name, attrs) {
  const node = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// Simple soccer ball: white disc, central black pentagon, five short seams.
function ballShapes() {
  const c = el('circle', { r: 8, fill: '#ffffff', stroke: '#152218', 'stroke-width': '1.2' });
  const pent = el('path', { d: 'M0,-3.4 L3.23,-1.05 L2,2.75 L-2,2.75 L-3.23,-1.05 Z', fill: '#152218' });
  const seams = el('g', { stroke: '#152218', 'stroke-width': '0.9', 'stroke-linecap': 'round' });
  const seamData = [
    [0, -3.4, 0, -7.2],
    [3.23, -1.05, 6.85, -2.23],
    [2, 2.75, 4.23, 5.83],
    [-2, 2.75, -4.23, 5.83],
    [-3.23, -1.05, -6.85, -2.23],
  ];
  for (const [x1, y1, x2, y2] of seamData) seams.appendChild(el('line', { x1, y1, x2, y2 }));
  return [c, pent, seams];
}

function shapeFor(piece) {
  if (piece.kind === 'player') {
    const c = el('circle', { r: R, fill: COLORS[piece.team], stroke: 'rgba(0,0,0,0.32)', 'stroke-width': '1.6' });
    const t = el('text', {
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: '#fff', 'font-size': '13', 'font-weight': '700',
    });
    t.textContent = String(piece.number);
    return [c, t];
  }
  if (piece.kind === 'ball') {
    return ballShapes();
  }
  // cone
  return [el('path', { d: 'M0,-11 L-9,8 L9,8 Z', fill: '#d9a441', stroke: '#3a2a00', 'stroke-width': '1.4' })];
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
