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

export function saveNamed(name, scene) {
  localStorage.setItem(KEY_PREFIX + name, serialize({ ...scene, name }));
}

export function listSaved() {
  const names = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(KEY_PREFIX)) names.push(key.slice(KEY_PREFIX.length));
  }
  return names.sort();
}

export function loadNamed(name) {
  const str = localStorage.getItem(KEY_PREFIX + name);
  return str ? deserialize(str) : null;
}

export function deleteNamed(name) {
  localStorage.removeItem(KEY_PREFIX + name);
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
