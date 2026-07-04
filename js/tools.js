// tools.js — DOM: markup rendering + tool input (add player/cone, draw markup, delete).
// Markup shapes (in frame.markup): {type:'arrow',x1,y1,x2,y2} {type:'pen',points:[{x,y}]}
//   {type:'text',x,y,text}
import { clientToSvg } from './tokens.js';
import { addPlayer, addCone, removePiece } from './scene.js';

const SVGNS = 'http://www.w3.org/2000/svg';

function el(name, attrs) {
  const node = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function ensureMarker(layerEl) {
  if (layerEl.querySelector('#arrowhead')) return;
  const defs = document.createElementNS(SVGNS, 'defs');
  const marker = el('marker', { id: 'arrowhead', markerWidth: '8', markerHeight: '8', refX: '6', refY: '3', orient: 'auto', markerUnits: 'strokeWidth' });
  marker.appendChild(el('path', { d: 'M0,0 L6,3 L0,6', fill: 'none', stroke: '#0a0a0a', 'stroke-width': '1.2', 'stroke-linecap': 'round' }));
  defs.appendChild(marker);
  layerEl.appendChild(defs);
}

function drawOne(layerEl, a, index) {
  let node;
  if (a.type === 'arrow') {
    node = el('line', { x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, stroke: '#0a0a0a', 'stroke-width': '4', 'stroke-linecap': 'round', 'marker-end': 'url(#arrowhead)' });
  } else if (a.type === 'pen') {
    const d = a.points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
    node = el('path', { d, fill: 'none', stroke: '#0a0a0a', 'stroke-width': '4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  } else if (a.type === 'text') {
    node = el('text', { x: a.x, y: a.y, fill: '#0a0a0a', 'font-family': 'Jost, Space Grotesk, Futura, sans-serif', 'font-size': '20', 'font-weight': '500', 'text-anchor': 'middle' });
    node.textContent = a.text;
  }
  if (node) { node.dataset.annIndex = index; layerEl.appendChild(node); }
}

export function renderMarkup(layerEl, frame) {
  layerEl.replaceChildren();
  ensureMarker(layerEl);
  frame.markup.forEach((a, i) => drawOne(layerEl, a, i));
}

export function initTools(svg, markupLayer, { getScene, getFrame, getTool, getTeam, onSceneChange, onMarkupChange }) {
  let draft = null;

  svg.addEventListener('pointerdown', (e) => {
    const tool = getTool();
    if (tool === 'select') return;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);

    if (tool === 'add') {
      addPlayer(getScene(), getTeam(), x, y);
      onSceneChange();
      return;
    }
    if (tool === 'cone') {
      addCone(getScene(), x, y);
      onSceneChange();
      return;
    }
    if (tool === 'delete') {
      const t = e.target;
      const tokenG = t.closest && t.closest('[data-token-id]');
      const annEl = t.closest && t.closest('[data-ann-index]');
      if (tokenG) { removePiece(getScene(), tokenG.dataset.tokenId); onSceneChange(); }
      else if (annEl) { getFrame().markup.splice(Number(annEl.dataset.annIndex), 1); onMarkupChange(); }
      return;
    }
    // markup tools capture the pointer on the svg
    svg.setPointerCapture(e.pointerId);
    if (tool === 'arrow') draft = { type: 'arrow', x1: x, y1: y, x2: x, y2: y };
    else if (tool === 'pen') draft = { type: 'pen', points: [{ x: Math.round(x), y: Math.round(y) }] };
    else if (tool === 'text') {
      const text = window.prompt('Label text:');
      if (text) { getFrame().markup.push({ type: 'text', x: Math.round(x), y: Math.round(y), text }); onMarkupChange(); }
    }
  });

  svg.addEventListener('pointermove', (e) => {
    if (!draft) return;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    if (draft.type === 'arrow') { draft.x2 = x; draft.y2 = y; }
    else if (draft.type === 'pen') draft.points.push({ x: Math.round(x), y: Math.round(y) });
    // live preview: current frame markup + the draft
    renderMarkup(markupLayer, { markup: [...getFrame().markup, draft] });
  });

  const finish = (e) => {
    if (!draft) return;
    try { svg.releasePointerCapture(e.pointerId); } catch {}
    if (draft.type === 'arrow') {
      if (Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) > 5) {
        getFrame().markup.push({ type: 'arrow', x1: Math.round(draft.x1), y1: Math.round(draft.y1), x2: Math.round(draft.x2), y2: Math.round(draft.y2) });
      }
    } else if (draft.type === 'pen' && draft.points.length > 1) {
      getFrame().markup.push(draft);
    }
    draft = null;
    onMarkupChange();
  };
  svg.addEventListener('pointerup', finish);
  svg.addEventListener('pointercancel', finish);
}
