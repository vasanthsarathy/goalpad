// tokens.js — DOM: render players + ball and make them draggable.
const SVGNS = 'http://www.w3.org/2000/svg';
const COLORS = { A: '#2f6fed', B: '#e8552d' };
const R = 16; // token radius in viewBox units

export function clientToSvg(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: p.x, y: p.y };
}

function makeDraggable(svg, groupEl, model, onChange) {
  let dragging = false;
  groupEl.addEventListener('pointerdown', (e) => {
    dragging = true;
    groupEl.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });
  groupEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    model.x = Math.round(x); model.y = Math.round(y);
    groupEl.setAttribute('transform', `translate(${model.x}, ${model.y})`);
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

function playerGroup(svg, player, onChange) {
  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('transform', `translate(${player.x}, ${player.y})`);
  g.style.cursor = 'grab';
  g.dataset.tokenId = player.id;

  const c = document.createElementNS(SVGNS, 'circle');
  c.setAttribute('r', R);
  c.setAttribute('fill', COLORS[player.team]);
  c.setAttribute('stroke', 'white');
  c.setAttribute('stroke-width', '2');

  const t = document.createElementNS(SVGNS, 'text');
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('dominant-baseline', 'central');
  t.setAttribute('fill', 'white');
  t.setAttribute('font-size', '16');
  t.setAttribute('font-weight', '700');
  t.textContent = String(player.number);

  g.append(c, t);
  makeDraggable(svg, g, player, onChange);
  return g;
}

function ballGroup(svg, ball, onChange) {
  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('transform', `translate(${ball.x}, ${ball.y})`);
  g.dataset.tokenId = 'ball';
  const c = document.createElementNS(SVGNS, 'circle');
  c.setAttribute('r', R * 0.55);
  c.setAttribute('fill', '#ffffff');
  c.setAttribute('stroke', '#1e232b');
  c.setAttribute('stroke-width', '2');
  g.append(c);
  makeDraggable(svg, g, ball, onChange);
  return g;
}

export function renderTokens(svg, layerEl, scene, onChange) {
  layerEl.replaceChildren();
  for (const player of scene.players) {
    layerEl.appendChild(playerGroup(svg, player, onChange));
  }
  layerEl.appendChild(ballGroup(svg, scene.ball, onChange));
}
