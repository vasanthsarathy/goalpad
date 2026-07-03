// field.js — DOM: draw pitch markings for a field config into a <g> layer.
import { fieldViewBox } from './scene.js';

const SVGNS = 'http://www.w3.org/2000/svg';

function line(x1, y1, x2, y2) {
  const el = document.createElementNS(SVGNS, 'line');
  el.setAttribute('x1', x1); el.setAttribute('y1', y1);
  el.setAttribute('x2', x2); el.setAttribute('y2', y2);
  return el;
}
function rect(x, y, w, h) {
  const el = document.createElementNS(SVGNS, 'rect');
  el.setAttribute('x', x); el.setAttribute('y', y);
  el.setAttribute('width', w); el.setAttribute('height', h);
  el.setAttribute('fill', 'none');
  return el;
}
function circle(cx, cy, r, fill = 'none') {
  const el = document.createElementNS(SVGNS, 'circle');
  el.setAttribute('cx', cx); el.setAttribute('cy', cy);
  el.setAttribute('r', r); el.setAttribute('fill', fill);
  return el;
}

export function renderField(svg, layerEl, field) {
  const { w, h } = fieldViewBox(field);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  layerEl.replaceChildren();

  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('stroke', 'rgba(255,255,255,0.85)');
  g.setAttribute('stroke-width', '2');
  g.setAttribute('fill', 'none');

  // Outer boundary.
  g.appendChild(rect(6, 6, w - 12, h - 12));
  // Halfway line + centre circle + spot.
  g.appendChild(line(w / 2, 6, w / 2, h - 6));
  g.appendChild(circle(w / 2, h / 2, Math.min(w, h) * 0.09));
  const spot = circle(w / 2, h / 2, 3, 'rgba(255,255,255,0.85)');
  g.appendChild(spot);

  // Penalty + goal boxes, scaled to field width; skipped on tiny custom grids.
  const boxDepth = Math.min(w * 0.16, 165);
  const penH = Math.min(h * 0.6, 403);
  const goalH = Math.min(h * 0.3, 183);
  const goalDepth = Math.min(w * 0.05, 55);
  if (w > 260) {
    // Left goal.
    g.appendChild(rect(6, (h - penH) / 2, boxDepth, penH));
    g.appendChild(rect(6, (h - goalH) / 2, goalDepth, goalH));
    // Right goal.
    g.appendChild(rect(w - 6 - boxDepth, (h - penH) / 2, boxDepth, penH));
    g.appendChild(rect(w - 6 - goalDepth, (h - goalH) / 2, goalDepth, goalH));
  }

  layerEl.appendChild(g);
}
