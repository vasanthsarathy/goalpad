// tokens.js — DOM: value-based players (A solid ink / B open paper), red-dot ball, ink cone.
const SVGNS = 'http://www.w3.org/2000/svg';
const INK = '#0a0a0a';
const PAPER = '#ffffff';
const SIGNAL = '#e10600';
const R = 13.5; // player radius (viewBox units)

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

function shapeFor(piece) {
  if (piece.kind === 'player') {
    const solid = piece.team === 'A';
    const c = el('circle', {
      r: R,
      fill: solid ? INK : PAPER,
      stroke: solid ? 'none' : INK,
      'stroke-width': solid ? '0' : '1.5',
    });
    const t = el('text', {
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-family': 'Jost, Space Grotesk, Futura, sans-serif', 'font-size': '13', 'font-weight': '500',
      fill: solid ? PAPER : INK,
    });
    t.textContent = String(piece.number);
    return [c, t];
  }
  if (piece.kind === 'ball') {
    return [el('circle', { r: 8, fill: SIGNAL })];
  }
  // cone — ink triangle outline
  return [el('path', { d: 'M0,-11 L-9,8 L9,8 Z', fill: 'none', stroke: INK, 'stroke-width': '1.5' })];
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
