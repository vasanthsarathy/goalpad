// field.js — DOM: pitch markings for full / left / right into a <g> layer.
import { fieldViewBox } from './scene.js';

const SVGNS = 'http://www.w3.org/2000/svg';

function el(name, attrs) {
  const node = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export function renderField(svg, layerEl, field) {
  const { w, h } = fieldViewBox(field);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  layerEl.replaceChildren();

  const g = el('g', { stroke: 'rgba(255,255,255,0.85)', 'stroke-width': '2', fill: 'none' });
  g.appendChild(el('rect', { x: 6, y: 6, width: w - 12, height: h - 12 }));

  const centreR = Math.min(w, h) * 0.09;
  const dot = (cx, cy) => el('circle', { cx, cy, r: 3, fill: 'rgba(255,255,255,0.85)', stroke: 'none' });

  // Penalty/goal box helper for a given side ('left' | 'right').
  const boxDepth = Math.min(w * 0.16, 165);
  const penH = Math.min(h * 0.6, 403);
  const goalH = Math.min(h * 0.3, 183);
  const goalDepth = Math.min(w * 0.05, 55);
  const drawGoal = (side) => {
    if (w <= 130) return; // too small to bother
    if (side === 'left') {
      g.appendChild(el('rect', { x: 6, y: (h - penH) / 2, width: boxDepth, height: penH }));
      g.appendChild(el('rect', { x: 6, y: (h - goalH) / 2, width: goalDepth, height: goalH }));
    } else {
      g.appendChild(el('rect', { x: w - 6 - boxDepth, y: (h - penH) / 2, width: boxDepth, height: penH }));
      g.appendChild(el('rect', { x: w - 6 - goalDepth, y: (h - goalH) / 2, width: goalDepth, height: goalH }));
    }
  };

  if (field.half === 'full') {
    g.appendChild(el('line', { x1: w / 2, y1: 6, x2: w / 2, y2: h - 6 }));
    g.appendChild(el('circle', { cx: w / 2, cy: h / 2, r: centreR }));
    g.appendChild(dot(w / 2, h / 2));
    drawGoal('left');
    drawGoal('right');
  } else if (field.half === 'left') {
    // Left half: left goal; halfway line at the right edge; centre circle half-visible there.
    g.appendChild(el('line', { x1: w - 6, y1: 6, x2: w - 6, y2: h - 6 }));
    g.appendChild(el('circle', { cx: w - 6, cy: h / 2, r: centreR }));
    g.appendChild(dot(w - 6, h / 2));
    drawGoal('left');
  } else { // 'right'
    g.appendChild(el('line', { x1: 6, y1: 6, x2: 6, y2: h - 6 }));
    g.appendChild(el('circle', { cx: 6, cy: h / 2, r: centreR }));
    g.appendChild(dot(6, h / 2));
    drawGoal('right');
  }

  layerEl.appendChild(g);
}
