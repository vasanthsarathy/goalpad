// storage.js — PURE serialize/deserialize (top), browser persistence (bottom).
const KEY_PREFIX = 'goalpad:scene:';
const VALID_PRESETS = new Set(['11v11', '9v9', '7v7', 'custom']);
const VALID_HALF = new Set(['full', 'left', 'right']);

export function serialize(scene) {
  return JSON.stringify(scene);
}

export function deserialize(str) {
  const raw = JSON.parse(str); // throws on invalid JSON
  if (!raw || typeof raw !== 'object') throw new Error('Invalid scene');
  if (!raw.field || !VALID_PRESETS.has(raw.field.preset)) {
    throw new Error('Invalid scene: missing or unknown field preset');
  }
  if (!Array.isArray(raw.pieces) || !Array.isArray(raw.frames) || raw.frames.length < 1) {
    throw new Error('Invalid or legacy scene: expected pieces[] and frames[]');
  }
  for (const f of raw.frames) {
    if (!f || typeof f.positions !== 'object' || f.positions === null || !Array.isArray(f.markup)) {
      throw new Error('Invalid frame');
    }
  }
  return {
    name: raw.name || 'Untitled',
    field: {
      preset: raw.field.preset,
      half: VALID_HALF.has(raw.field.half) ? raw.field.half : 'full',
    },
    pieces: raw.pieces,
    frames: raw.frames,
  };
}

// ---- Browser-only below ----

export function listSaved() {
  const names = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(KEY_PREFIX)) names.push(key.slice(KEY_PREFIX.length));
  }
  return names.sort();
}

export function exportScene(scene) {
  const blob = new Blob([serialize(scene)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(scene.name || 'scene').replace(/[^\w.-]+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importSceneFile(file) {
  return file.text().then(deserialize);
}

// ---- Mine (saved tactics) + migration ----
const MINE_PREFIX = 'goalpad:mine:';
const MIGRATED_FLAG = 'goalpad:migrated:mine-v1';

function freshId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// pure: build a tactic record from a name + scene
export function newTactic(name, scene, tags = []) {
  const n = (name || 'Untitled').trim() || 'Untitled';
  return { id: freshId(), name: n, scene: { ...scene, name: n }, updatedAt: Date.now(), tags: Array.isArray(tags) ? tags : [] };
}

// pure: given legacy [{name, str}], return [{name, scene}] for entries that deserialize
export function validLegacyEntries(entries) {
  const out = [];
  for (const e of entries) {
    try { out.push({ name: e.name, scene: deserialize(e.str) }); } catch { /* skip invalid */ }
  }
  return out;
}

export function saveMine(tactic) {
  localStorage.setItem(MINE_PREFIX + tactic.id, JSON.stringify(tactic));
}

export function listMine() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(MINE_PREFIX)) continue;
    try {
      const rec = JSON.parse(localStorage.getItem(key));
      if (rec && rec.id && rec.scene) out.push({ id: rec.id, name: rec.name || 'Untitled', updatedAt: rec.updatedAt || 0, tags: rec.tags || [] });
    } catch { /* skip corrupt */ }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadMine(id) {
  const str = localStorage.getItem(MINE_PREFIX + id);
  if (!str) return null;
  try {
    const rec = JSON.parse(str);
    return { id: rec.id, name: rec.name || 'Untitled', updatedAt: rec.updatedAt || 0, tags: rec.tags || [], scene: deserialize(JSON.stringify(rec.scene)) };
  } catch {
    return null;
  }
}

export function deleteMine(id) { localStorage.removeItem(MINE_PREFIX + id); }

// one-time: copy legacy goalpad:scene:<name> plays into Mine
export function migrateLegacyPlays() {
  if (localStorage.getItem(MIGRATED_FLAG)) return 0;
  const entries = [];
  for (const name of listSaved()) {
    const str = localStorage.getItem(KEY_PREFIX + name);
    if (str) entries.push({ name, str });
  }
  const valid = validLegacyEntries(entries);
  for (const { name, scene } of valid) saveMine(newTactic(name, scene));
  localStorage.setItem(MIGRATED_FLAG, '1');
  return valid.length;
}

// ---- Scratchpad (the home board) ----
const SCRATCH_KEY = 'goalpad:scratch';

export function saveScratch(scene) {
  localStorage.setItem(SCRATCH_KEY, serialize(scene));
}

export function loadScratch() {
  const str = localStorage.getItem(SCRATCH_KEY);
  if (!str) return null;
  try { return deserialize(str); } catch { return null; }
}

// ---- Library search / tags ----
export function normalizeTags(str) {
  return [...new Set((str || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

export function filterLibrary(items, opts = {}) {
  const q = (opts.query || '').trim().toLowerCase();
  const tags = opts.tags || [];
  return items.filter((it) => {
    const itags = it.tags || [];
    if (tags.length && !tags.every((t) => itags.includes(t))) return false;
    if (!q) return true;
    const hay = `${it.name || ''} ${it.description || ''} ${itags.join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
}
