// tools.js — DOM: markup rendering + the armed input model (stamp pieces / draw ink / select-deselect marks).
// Markup: {type:'arrow',x1,y1,x2,y2} {type:'run',x1,y1,x2,y2} {type:'pen',points:[{x,y}]} {type:'text',x,y,text}
import { clientToSvg } from './tokens.js';
import { addPlayer, addCone, addBall } from './scene.js';

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
  if (a.type === 'arrow' || a.type === 'run') {
    node = el('line', { x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, stroke: '#0a0a0a', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'marker-end': 'url(#arrowhead)' });
    if (a.type === 'run') node.setAttribute('stroke-dasharray', '7 6');
  } else if (a.type === 'pen') {
    const d = a.points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
    node = el('path', { d, fill: 'none', stroke: '#0a0a0a', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  } else if (a.type === 'text') {
    node = el('text', { x: a.x, y: a.y, fill: '#0a0a0a', 'font-family': 'Jost, Space Grotesk, Futura, sans-serif', 'font-size': '20', 'font-weight': '500', 'text-anchor': 'middle' });
    node.textContent = a.text;
  }
  if (node) { node.dataset.annIndex = index; layerEl.appendChild(node); }
}

export function renderMarkup(layerEl, frame, selectedIndex = null) {
  layerEl.replaceChildren();
  ensureMarker(layerEl);
  frame.markup.forEach((a, i) => drawOne(layerEl, a, i));
  if (selectedIndex != null) {
    const target = layerEl.querySelector(`[data-ann-index="${selectedIndex}"]`);
    if (target) {
      try {
        const b = target.getBBox();
        const pad = 6;
        layerEl.appendChild(el('rect', { x: b.x - pad, y: b.y - pad, width: b.width + 2 * pad, height: b.height + 2 * pad, fill: 'none', stroke: '#0a0a0a', 'stroke-width': '1', 'stroke-dasharray': '4 4' }));
      } catch { /* getBBox can throw on empty text; ignore */ }
    }
  }
}

function placePiece(scene, kind, x, y) {
  if (kind === 'A' || kind === 'B') addPlayer(scene, kind, x, y);
  else if (kind === 'cone') addCone(scene, x, y);
  else if (kind === 'ball') addBall(scene, x, y);
}

export function initTools(svg, markupLayer, { getScene, getFrame, getArmed, getMode, onSceneChange, onMarkupChange, onSelectInk, onDeselect }) {
  let draft = null;

  svg.addEventListener('pointerdown', (e) => {
    if (getMode() !== 'build') return;
    const armed = getArmed();
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);

    if (armed && armed.type === 'piece') {
      placePiece(getScene(), armed.kind, x, y);
      onSceneChange();
      return;
    }
    if (armed && armed.type === 'ink') {
      const tool = armed.tool;
      if (tool === 'text') {
        const text = window.prompt('Label text:');
        if (text) { getFrame().markup.push({ type: 'text', x: Math.round(x), y: Math.round(y), text }); onMarkupChange(true); }
        return;
      }
      svg.setPointerCapture(e.pointerId);
      if (tool === 'arrow') draft = { type: 'arrow', x1: x, y1: y, x2: x, y2: y };
      else if (tool === 'run') draft = { type: 'run', x1: x, y1: y, x2: x, y2: y };
      else if (tool === 'pen') draft = { type: 'pen', points: [{ x: Math.round(x), y: Math.round(y) }] };
      return;
    }
    // neutral: select a tapped mark, else deselect
    const annEl = e.target.closest && e.target.closest('[data-ann-index]');
    if (annEl) onSelectInk(Number(annEl.dataset.annIndex));
    else onDeselect();
  });

  svg.addEventListener('pointermove', (e) => {
    if (!draft) return;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    if (draft.type === 'pen') draft.points.push({ x: Math.round(x), y: Math.round(y) });
    else { draft.x2 = x; draft.y2 = y; }
    renderMarkup(markupLayer, { markup: [...getFrame().markup, draft] });
  });

  const finish = (e) => {
    if (!draft) return;
    try { svg.releasePointerCapture(e.pointerId); } catch {}
    let added = false;
    if (draft.type === 'arrow' || draft.type === 'run') {
      if (Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) > 5) {
        getFrame().markup.push({ type: draft.type, x1: Math.round(draft.x1), y1: Math.round(draft.y1), x2: Math.round(draft.x2), y2: Math.round(draft.y2) });
        added = true;
      }
    } else if (draft.type === 'pen' && draft.points.length > 1) {
      getFrame().markup.push(draft);
      added = true;
    }
    draft = null;
    onMarkupChange(added);
  };
  svg.addEventListener('pointerup', finish);
  svg.addEventListener('pointercancel', finish);
}
