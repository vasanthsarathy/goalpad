// tools.js — DOM: annotation tools drawing into scene.annotations.
// Annotation shapes (stored in viewBox units):
//   { type:'arrow', x1,y1,x2,y2 }
//   { type:'pen', points:[{x,y},...] }
//   { type:'cone', x,y }
//   { type:'text', x,y, text }
import { clientToSvg } from './tokens.js';

const SVGNS = 'http://www.w3.org/2000/svg';

function el(name, attrs) {
  const node = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// Shared arrowhead marker, added once to the annotations layer.
function ensureMarker(layerEl) {
  if (layerEl.querySelector('#arrowhead')) return;
  const defs = document.createElementNS(SVGNS, 'defs');
  const marker = el('marker', {
    id: 'arrowhead', markerWidth: '8', markerHeight: '8',
    refX: '6', refY: '3', orient: 'auto', markerUnits: 'strokeWidth',
  });
  marker.appendChild(el('path', { d: 'M0,0 L6,3 L0,6 Z', fill: '#ffe14d' }));
  defs.appendChild(marker);
  layerEl.appendChild(defs);
}

function drawAnnotation(layerEl, a, index) {
  if (a.type === 'arrow') {
    const line = el('line', {
      x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2,
      stroke: '#ffe14d', 'stroke-width': '4', 'stroke-linecap': 'round',
      'marker-end': 'url(#arrowhead)',
    });
    line.dataset.annIndex = index;
    layerEl.appendChild(line);
  } else if (a.type === 'pen') {
    const d = a.points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
    const path = el('path', { d, fill: 'none', stroke: '#ffe14d', 'stroke-width': '4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    path.dataset.annIndex = index;
    layerEl.appendChild(path);
  } else if (a.type === 'cone') {
    const tri = el('path', { d: `M${a.x},${a.y - 12} L${a.x - 10},${a.y + 8} L${a.x + 10},${a.y + 8} Z`, fill: '#ff9f1c', stroke: '#5a3a00', 'stroke-width': '1.5' });
    tri.dataset.annIndex = index;
    layerEl.appendChild(tri);
  } else if (a.type === 'text') {
    const t = el('text', { x: a.x, y: a.y, fill: '#ffffff', 'font-size': '20', 'font-weight': '700', 'text-anchor': 'middle' });
    t.textContent = a.text;
    t.dataset.annIndex = index;
    layerEl.appendChild(t);
  }
}

export function renderAnnotations(layerEl, scene) {
  layerEl.replaceChildren();
  ensureMarker(layerEl);
  scene.annotations.forEach((a, i) => drawAnnotation(layerEl, a, i));
}

export function initTools(svg, layerEl, getScene, getTool, onChange) {
  let draft = null; // in-progress annotation

  svg.addEventListener('pointerdown', (e) => {
    const tool = getTool();
    if (tool === 'select') return; // handled by token drag
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    svg.setPointerCapture(e.pointerId);

    if (tool === 'arrow') {
      draft = { type: 'arrow', x1: x, y1: y, x2: x, y2: y };
    } else if (tool === 'pen') {
      draft = { type: 'pen', points: [{ x: Math.round(x), y: Math.round(y) }] };
    } else if (tool === 'cone') {
      getScene().annotations.push({ type: 'cone', x: Math.round(x), y: Math.round(y) });
      onChange();
    } else if (tool === 'text') {
      const text = window.prompt('Label text:');
      if (text) { getScene().annotations.push({ type: 'text', x: Math.round(x), y: Math.round(y), text }); onChange(); }
    } else if (tool === 'delete') {
      const idx = e.target.dataset && e.target.dataset.annIndex;
      if (idx != null) { getScene().annotations.splice(Number(idx), 1); onChange(); }
    }
  });

  svg.addEventListener('pointermove', (e) => {
    if (!draft) return;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    if (draft.type === 'arrow') { draft.x2 = x; draft.y2 = y; }
    else if (draft.type === 'pen') { draft.points.push({ x: Math.round(x), y: Math.round(y) }); }
    // Live preview: temporarily append, then let onChange re-render on release.
    renderAnnotations(layerEl, { annotations: [...getScene().annotations, draft] });
  });

  const finish = (e) => {
    if (!draft) return;
    try { svg.releasePointerCapture(e.pointerId); } catch {}
    if (draft.type === 'arrow') {
      const moved = Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) > 5;
      if (moved) getScene().annotations.push({ ...draft, x1: Math.round(draft.x1), y1: Math.round(draft.y1), x2: Math.round(draft.x2), y2: Math.round(draft.y2) });
    } else if (draft.type === 'pen' && draft.points.length > 1) {
      getScene().annotations.push(draft);
    }
    draft = null;
    onChange();
  };
  svg.addEventListener('pointerup', finish);
  svg.addEventListener('pointercancel', finish);
}
