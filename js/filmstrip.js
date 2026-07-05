// filmstrip.js — DOM: Build frame filmstrip (numbered cells + "+"), with a long-press Duplicate/Delete menu.
const LONG_PRESS_MS = 450;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function renderFilmstrip(root, { count, current, onJump, onAdd, onDuplicate, onDelete }) {
  closeMenu();
  root.replaceChildren();
  let currentCell = null;
  for (let i = 0; i < count; i++) {
    const cell = el('button', 'film-cell', String(i + 1).padStart(2, '0'));
    cell.type = 'button';
    if (i === current) { cell.classList.add('current'); currentCell = cell; }
    let timer = null, longFired = false;
    cell.addEventListener('pointerdown', () => {
      longFired = false;
      timer = setTimeout(() => { longFired = true; openMenu(cell, i, onDuplicate, onDelete); }, LONG_PRESS_MS);
    });
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
    cell.addEventListener('pointerup', cancel);
    cell.addEventListener('pointerleave', cancel);
    cell.addEventListener('pointercancel', cancel);
    cell.addEventListener('click', () => { if (!longFired) onJump(i); });
    root.appendChild(cell);
  }
  const add = el('button', 'film-add', '+');
  add.type = 'button';
  add.addEventListener('click', () => onAdd());
  root.appendChild(add);
  if (currentCell) currentCell.scrollIntoView({ inline: 'nearest', block: 'nearest' });
}

let menuEl = null;
function closeMenu() {
  if (menuEl) { menuEl.remove(); menuEl = null; document.removeEventListener('pointerdown', outside, true); }
}
function outside(e) { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }
function openMenu(anchor, i, onDuplicate, onDelete) {
  closeMenu();
  menuEl = el('div', 'film-menu');
  const mk = (label, fn) => {
    const b = el('button', 'film-menu-item', label); b.type = 'button';
    b.addEventListener('click', () => { closeMenu(); fn(i); });
    menuEl.append(b);
  };
  mk('Duplicate', onDuplicate);
  mk('Delete', onDelete);
  const r = anchor.getBoundingClientRect();
  menuEl.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 148)) + 'px';
  menuEl.style.bottom = (window.innerHeight - r.top + 6) + 'px';
  document.body.append(menuEl);
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
}
