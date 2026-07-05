// home.js — DOM: the Library home surface (Templates + Mine cards) with a long-press card menu.
const LONG_PRESS_MS = 450;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function renderHome(root, cbs) {
  const { templates, mine, onOpen, onNew, onImport, onRename, onDuplicate, onExport, onDelete, onClose } = cbs;
  closeMenu();
  root.replaceChildren();

  // header: wordmark + New / Import
  const head = el('div', 'home-head');
  const brand = el('span', 'brand');
  brand.append(document.createTextNode('goalpad'), el('span', 'dot'));
  const actions = el('div', 'home-actions');
  const newBtn = el('button', 'home-action', 'New'); newBtn.type = 'button';
  newBtn.addEventListener('click', () => onNew());
  const importBtn = el('button', 'home-action', 'Import'); importBtn.type = 'button';
  importBtn.addEventListener('click', () => onImport());
  const closeBtn = el('button', 'home-action', 'Close'); closeBtn.type = 'button';
  closeBtn.addEventListener('click', () => onClose());
  actions.append(newBtn, importBtn, closeBtn);
  head.append(brand, actions);
  root.append(head);

  // Templates shelf, grouped
  const tShelf = el('div', 'shelf');
  tShelf.append(el('div', 'shelf-label', 'Templates'));
  const groups = [];
  for (const t of templates) if (!groups.includes(t.group)) groups.push(t.group);
  for (const g of groups) {
    tShelf.append(el('div', 'group-label', g));
    const grid = el('div', 'card-grid');
    for (const t of templates.filter((x) => x.group === g)) {
      grid.append(card(t.name, () => onOpen('template', t),
        (anchor) => openMenu(anchor, [['Duplicate', () => onDuplicate(t)], ['Export', () => onExport(t)]])));
    }
    tShelf.append(grid);
  }
  root.append(tShelf);

  // Mine shelf
  const mShelf = el('div', 'shelf');
  mShelf.append(el('div', 'shelf-label', 'Mine'));
  if (!mine.length) {
    mShelf.append(el('div', 'empty', 'No saved tactics yet — tap New'));
  } else {
    const grid = el('div', 'card-grid');
    for (const m of mine) {
      grid.append(card(m.name, () => onOpen('mine', m),
        (anchor) => openMenu(anchor, [
          ['Rename', () => onRename(m)], ['Duplicate', () => onDuplicate(m)],
          ['Export', () => onExport(m)], ['Delete', () => onDelete(m)],
        ])));
    }
    mShelf.append(grid);
  }
  root.append(mShelf);
}

function card(name, onTap, onLong) {
  const b = el('button', 'card'); b.type = 'button';
  b.append(el('span', 'card-name', name));
  let timer = null, longFired = false;
  const start = () => { longFired = false; timer = setTimeout(() => { longFired = true; onLong(b); }, LONG_PRESS_MS); };
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  b.addEventListener('pointerdown', start);
  b.addEventListener('pointerup', cancel);
  b.addEventListener('pointerleave', cancel);
  b.addEventListener('pointercancel', cancel);
  b.addEventListener('click', () => { if (!longFired) onTap(); });
  return b;
}

let menuEl = null;
function closeMenu() {
  if (menuEl) { menuEl.remove(); menuEl = null; document.removeEventListener('pointerdown', outside, true); }
}
function outside(e) { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }
function openMenu(anchor, items) {
  closeMenu();
  menuEl = el('div', 'card-menu');
  for (const [label, fn] of items) {
    const item = el('button', 'menu-item', label); item.type = 'button';
    item.addEventListener('click', () => { closeMenu(); fn(); });
    menuEl.append(item);
  }
  const r = anchor.getBoundingClientRect();
  menuEl.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 168)) + 'px';
  menuEl.style.top = (r.bottom + 4) + 'px';
  document.body.append(menuEl);
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
}
