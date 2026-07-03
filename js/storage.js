// storage.js — PURE serialize/deserialize (top), browser persistence (bottom).
const KEY_PREFIX = 'goalpad:scene:';

export function serialize(scene) {
  return JSON.stringify(scene);
}

export function deserialize(str) {
  const raw = JSON.parse(str); // throws on invalid JSON
  return {
    name: raw.name || 'Untitled',
    field: raw.field,
    players: Array.isArray(raw.players) ? raw.players : [],
    ball: raw.ball || { x: 0, y: 0 },
    annotations: Array.isArray(raw.annotations) ? raw.annotations : [],
    steps: Array.isArray(raw.steps) ? raw.steps : [],
  };
}

// ---- Browser-only below (localStorage / DOM used inside functions only) ----

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
