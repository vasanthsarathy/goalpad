// tokens.js — DOM: render pieces (player/ball/cone) from a frame; drag in select mode.
const SVGNS = 'http://www.w3.org/2000/svg';
const COLORS = { A: '#2f6fed', B: '#e8552d' };
const R = 16; // player token radius (viewBox units)

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

function shapeFor(piece) {
  if (piece.kind === 'player') {
    const c = el('circle', { r: R, fill: COLORS[piece.team], stroke: 'white', 'stroke-width': '2' });
    const t = el('text', {
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: 'white', 'font-size': '16', 'font-weight': '700',
    });
    t.textContent = String(piece.number);
    return [c, t];
  }
  if (piece.kind === 'ball') {
    return [el('circle', { r: R * 0.55, fill: '#ffffff', stroke: '#1e232b', 'stroke-width': '2' })];
  }
  // cone
  return [el('path', { d: `M0,-12 L-10,8 L10,8 Z`, fill: '#ff9f1c', stroke: '#5a3a00', 'stroke-width': '1.5' })];
}

function makeDraggable(svg, groupEl, frame, id, getTool, onChange) {
  let dragging = false;
  groupEl.addEventListener('pointerdown', (e) => {
    if (getTool() !== 'select') return; // let non-select tools handle the event
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
