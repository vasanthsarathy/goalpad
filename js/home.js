// home.js — DOM: the Library browser (search + tag chips + Tactics/Drills/Mine icon rows).
import { deriveTags } from './library.js';
import { filterLibrary } from './storage.js';

const LONG_PRESS_MS = 450;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function renderLibrary(root, cbs) {
  const { library, mine, onOpen, onNew, onImport, onClose, onRename, onDuplicate, onExport, onDelete, onEditTags } = cbs;
  closeMenu();

  const items = [
    ...library.map((t) => ({ kind: 'template', ref: t, name: t.name, description: t.description, tags: deriveTags(t), category: t.category, group: t.group })),
    ...mine.map((m) => ({ kind: 'mine', ref: m, name: m.name, description: '', tags: m.tags || [], category: 'mine', group: 'Mine' })),
  ];
  const allTags = [...new Set(items.flatMap((i) => i.tags))].sort();
  let query = '';
  const active = new Set();

  root.replaceChildren();

  // header: wordmark + New / Import / Close
  const head = el('div', 'home-head');
  const brand = el('span', 'brand'); brand.append(document.createTextNode('goalpad'), el('span', 'dot'));
  const actions = el('div', 'home-actions');
  for (const [label, fn] of [['New', onNew], ['Import', onImport], ['Close', onClose]]) {
    const b = el('button', 'home-action', label); b.type = 'button'; b.addEventListener('click', () => fn());
    actions.append(b);
  }
  head.append(brand, actions);
  root.append(head);

  // search
  const search = el('input', 'lib-search'); search.type = 'search'; search.placeholder = 'Search tactics, drills, tags…';
  search.addEventListener('input', () => { query = search.value; renderResults(); });
  root.append(search);

  // tag chips
  const chipRow = el('div', 'lib-chips');
  for (const tag of allTags) {
    const c = el('button', 'lib-chip', tag); c.type = 'button'; c.setAttribute('aria-pressed', 'false');
    c.addEventListener('click', () => {
      if (active.has(tag)) active.delete(tag); else active.add(tag);
      c.setAttribute('aria-pressed', String(active.has(tag)));
      renderResults();
    });
    chipRow.append(c);
  }
  root.append(chipRow);

  // results
  const results = el('div', 'lib-results');
  root.append(results);

  const sectionOf = (i) => (i.kind === 'mine' ? 'MINE' : (i.category === 'drills' ? 'DRILLS' : 'TACTICS'));
  const iconOf = (i) => (i.kind === 'mine' ? '★' : (i.category === 'drills' ? '△' : '↗'));

  function rowFor(item) {
    const b = el('button', 'lib-row'); b.type = 'button';
    b.append(el('span', 'lib-icon', iconOf(item)), el('span', 'lib-nm', item.name), el('span', 'lib-tags', item.tags.join(' · ')));
    const menuItems = item.kind === 'mine'
      ? [['Rename', () => onRename(item.ref)], ['Tags', () => onEditTags(item.ref)], ['Duplicate', () => onDuplicate(item.ref)], ['Export', () => onExport(item.ref)], ['Delete', () => onDelete(item.ref)]]
      : [['Duplicate', () => onDuplicate(item.ref)], ['Export', () => onExport(item.ref)]];
    wireRow(b, () => onOpen(item.kind, item.ref), (anchor) => openMenu(anchor, menuItems));
    return b;
  }

  function renderResults() {
    const filtered = filterLibrary(items, { query, tags: [...active] });
    results.replaceChildren();
    for (const section of ['TACTICS', 'DRILLS', 'MINE']) {
      const secItems = filtered.filter((i) => sectionOf(i) === section);
      if (!secItems.length) continue;
      results.append(el('div', 'lib-section', section));
      const groups = [];
      for (const i of secItems) if (!groups.includes(i.group)) groups.push(i.group);
      for (const g of groups) {
        if (section !== 'MINE') results.append(el('div', 'lib-group', g));
        for (const item of secItems.filter((x) => x.group === g)) results.append(rowFor(item));
      }
    }
    if (!filtered.length) results.append(el('div', 'empty', 'No matches'));
  }

  renderResults();
}

function wireRow(b, onTap, onLong) {
  let timer = null, longFired = false;
  b.addEventListener('pointerdown', () => { longFired = false; timer = setTimeout(() => { longFired = true; onLong(b); }, LONG_PRESS_MS); });
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  b.addEventListener('pointerup', cancel);
  b.addEventListener('pointerleave', cancel);
  b.addEventListener('pointercancel', cancel);
  b.addEventListener('click', () => { if (!longFired) onTap(); });
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
