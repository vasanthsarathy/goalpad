// tokens.js — DOM: value-based players / red-dot ball / ink cone.
// Build-only interaction: drag to move, tap (neutral) to select, drag off-pitch to remove; selection ring.
import { fieldViewBox } from './scene.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const INK = '#0a0a0a';
const PAPER = '#ffffff';
const SIGNAL = '#e10600';
const R = 13.5;
const TAP_MOVE = 4; // viewBox units: a pointerup under this is a tap, not a drag

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
    const c = el('circle', { r: R, fill: solid ? INK : PAPER, stroke: solid ? 'none' : INK, 'stroke-width': solid ? '0' : '1.5' });
    const t = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Jost, Space Grotesk, Futura, sans-serif', 'font-size': '13', 'font-weight': '500', fill: solid ? PAPER : INK });
    t.textContent = String(piece.number);
    return [c, t];
  }
  if (piece.kind === 'ball') return [el('circle', { r: 8, fill: SIGNAL })];
  return [el('path', { d: 'M0,-11 L-9,8 L9,8 Z', fill: 'none', stroke: INK, 'stroke-width': '1.5' })];
}

function makeInteractive(svg, group, scene, frame, id, opts) {
  let dragging = false, moved = false, startX = 0, startY = 0;
  group.addEventListener('pointerdown', (e) => {
    if (opts.getMode() !== 'build') return;
    dragging = true; moved = false;
    const p = clientToSvg(svg, e.clientX, e.clientY);
    startX = p.x; startY = p.y;
    group.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });
  group.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    if (Math.hypot(x - startX, y - startY) > TAP_MOVE) moved = true;
    frame.positions[id] = { x: Math.round(x), y: Math.round(y) };
    group.setAttribute('transform', `translate(${frame.positions[id].x}, ${frame.positions[id].y})`);
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    try { group.releasePointerCapture(e.pointerId); } catch {}
    const pos = frame.positions[id];
    const { w, h } = fieldViewBox(scene.field);
    if (pos && (pos.x < 0 || pos.x > w || pos.y < 0 || pos.y > h)) { opts.onRemove(id); return; }
    if (!moved) { if (opts.getArmed() === null) opts.onSelect(id); return; }
    opts.onChange();
  };
  group.addEventListener('pointerup', end);
  group.addEventListener('pointercancel', end);
}

export function renderTokens(svg, layerEl, scene, frame, opts) {
  layerEl.replaceChildren();
  for (const piece of scene.pieces) {
    const pos = frame.positions[piece.id] || { x: 0, y: 0 };
    const g = el('g', { transform: `translate(${pos.x}, ${pos.y})` });
    g.dataset.tokenId = piece.id;
    g.style.cursor = 'grab';
    for (const s of shapeFor(piece)) g.appendChild(s);
    if (piece.id === opts.selectedId) {
      const ringR = piece.kind === 'player' ? R + 6 : (piece.kind === 'ball' ? 14 : 16);
      g.appendChild(el('circle', { r: ringR, fill: 'none', stroke: INK, 'stroke-width': '2' }));
    }
    makeInteractive(svg, g, scene, frame, piece.id, opts);
    layerEl.appendChild(g);
  }
}

export function setTokenPositions(layerEl, positionsMap) {
  for (const g of layerEl.querySelectorAll('[data-token-id]')) {
    const p = positionsMap[g.dataset.tokenId];
    if (p) g.setAttribute('transform', `translate(${p.x}, ${p.y})`);
  }
}
