// app.js — shell (Home + Watch/Build + autosave) with the Build tool/selection model.
import { createScene, duplicateFrame, deleteFrame, addPlayer, addCone, removePiece, pieceById } from './scene.js';
import { renderField } from './field.js';
import { renderTokens, setTokenPositions } from './tokens.js';
import { renderMarkup, initTools } from './tools.js';
import { createStepController, activeMarkupIndex } from './steps.js';
import { deserialize, exportScene, importSceneFile,
         newTactic, saveMine, listMine, loadMine, deleteMine, migrateLegacyPlays } from './storage.js';
import { LIBRARY } from './library.js';
import { renderHome } from './home.js';

const homeEl = document.getElementById('home');
const editorEl = document.getElementById('editor');
const docTitle = document.getElementById('doc-title');
const board = document.getElementById('board');
const layerField = document.getElementById('layer-field');
const layerAnnotations = document.getElementById('layer-annotations');
const layerTokens = document.getElementById('layer-tokens');
const importInput = document.getElementById('import-file');

let scene = createScene({ preset: '11v11', teamA: 11, teamB: 11, half: 'full' });
let index = 0;
let armed = null;      // null | 'chip:A|B|ball|cone' | 'ink:arrow|run|pen|text'
let selected = null;   // null | {type:'piece',id} | {type:'ink',index}
let selChip = null;
let currentDocId = null;
let currentName = 'Untitled';

const frame = () => scene.frames[index];
const mode = () => editorEl.dataset.mode;
function armedObj() {
  if (!armed) return null;
  const [t, k] = armed.split(':');
  return t === 'chip' ? { type: 'piece', kind: k } : { type: 'ink', tool: k };
}
const selInkIndex = () => (selected && selected.type === 'ink' ? selected.index : null);

function render() {
  renderField(board, layerField, scene.field);
  renderTokens(board, layerTokens, scene, frame(), {
    getMode: mode,
    getArmed: armedObj,
    selectedId: selected && selected.type === 'piece' ? selected.id : null,
    onSelect: selectPiece,
    onChange: autosave,
    onRemove: (id) => { removePiece(scene, id); clearSelection(); autosave(); },
  });
  renderMarkup(layerAnnotations, frame(), selInkIndex());
  refreshScrubRange();
}

function autosave() {
  if (!currentDocId) return;
  scene.name = currentName;
  saveMine({ id: currentDocId, name: currentName, scene, updatedAt: Date.now() });
}

initTools(board, layerAnnotations, {
  getScene: () => scene,
  getFrame: () => frame(),
  getArmed: armedObj,
  onSceneChange: () => { render(); autosave(); },
  onMarkupChange: () => { renderMarkup(layerAnnotations, frame(), selInkIndex()); autosave(); },
  onSelectInk: (i) => selectInk(i),
  onDeselect: () => clearSelection(),
});

// ---- Toolbar: chips + ink (arm/disarm) ----
function armClick(key) { armed = (armed === key) ? null : key; clearSelection(); refreshArmedUI(); }
function refreshArmedUI() {
  document.querySelectorAll('#toolbar .chip').forEach((b) => b.setAttribute('aria-pressed', String(armed === 'chip:' + b.dataset.chip)));
  document.querySelectorAll('#toolbar .tool').forEach((b) => b.setAttribute('aria-pressed', String(armed === 'ink:' + b.dataset.ink)));
}
document.querySelectorAll('#toolbar .chip').forEach((b) => b.addEventListener('click', () => armClick('chip:' + b.dataset.chip)));
document.querySelectorAll('#toolbar .tool').forEach((b) => b.addEventListener('click', () => armClick('ink:' + b.dataset.ink)));

// ---- Selection + contextual chip ----
function selectPiece(id) { selected = { type: 'piece', id }; render(); openSelChipForPiece(id); }
function selectInk(i) { selected = { type: 'ink', index: i }; render(); openSelChipForInk(i); }
function clearSelection() { selected = null; closeSelChip(); render(); }

function openSelChipForPiece(id) {
  const p = pieceById(scene, id);
  const g = layerTokens.querySelector(`[data-token-id="${id}"]`);
  if (!g) return;
  const items = (p && p.kind === 'ball')
    ? [['Delete', () => deletePiece(id)]]
    : [['Duplicate', () => duplicatePiece(id)], ['Delete', () => deletePiece(id)]];
  openSelChip(g, items);
}
function openSelChipForInk(i) {
  const node = layerAnnotations.querySelector(`[data-ann-index="${i}"]`);
  if (!node) return;
  openSelChip(node, [['Delete', () => deleteInk(i)]]);
}
function openSelChip(anchorEl, items) {
  closeSelChip();
  selChip = document.createElement('div');
  selChip.className = 'sel-chip';
  for (const [label, fn] of items) {
    const b = document.createElement('button'); b.className = 'sel-item'; b.type = 'button'; b.textContent = label;
    b.addEventListener('click', fn);
    selChip.append(b);
  }
  const r = anchorEl.getBoundingClientRect();
  selChip.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 168)) + 'px';
  selChip.style.top = (r.bottom + 6) + 'px';
  document.body.append(selChip);
}
function closeSelChip() { if (selChip) { selChip.remove(); selChip = null; } }

function duplicatePiece(id) {
  const p = pieceById(scene, id); if (!p) return;
  const pos = frame().positions[id] || { x: 0, y: 0 };
  if (p.kind === 'player') addPlayer(scene, p.team, pos.x + 20, pos.y + 20);
  else if (p.kind === 'cone') addCone(scene, pos.x + 20, pos.y + 20);
  render(); autosave(); openSelChipForPiece(id);
}
function deletePiece(id) { removePiece(scene, id); clearSelection(); autosave(); }
function deleteInk(i) { frame().markup.splice(i, 1); clearSelection(); autosave(); }

// ---- Steps / playback (unchanged from Stage 2) ----
const scrub = document.getElementById('scrub');
const stepLabel = document.getElementById('step-label');
const btnDel = document.getElementById('btn-del-step');

function updateStepLabel(pos) { stepLabel.textContent = `${Math.round(pos) + 1} / ${scene.frames.length}`; }
function refreshScrubRange() {
  scrub.max = String(Math.max(0, scene.frames.length - 1));
  scrub.value = String(index);
  updateStepLabel(index);
  btnDel.disabled = scene.frames.length <= 1;
}
function applyPositions(positionsMap, pos) {
  setTokenPositions(layerTokens, positionsMap);
  const mi = Math.max(0, Math.min(scene.frames.length - 1, activeMarkupIndex(pos)));
  renderMarkup(layerAnnotations, scene.frames[mi]);
  scrub.value = String(pos);
  updateStepLabel(pos);
}
function settleTo(i) { index = Math.max(0, Math.min(scene.frames.length - 1, Math.round(i))); render(); }

const steps = createStepController({ getScene: () => scene, applyPositions, onDone: (i) => settleTo(i) });

document.getElementById('btn-add-step').addEventListener('click', () => { index = duplicateFrame(scene, index); render(); autosave(); });
btnDel.addEventListener('click', () => { if (deleteFrame(scene, index)) { index = Math.min(index, scene.frames.length - 1); render(); autosave(); } });
document.getElementById('btn-play').addEventListener('click', () => steps.play());
scrub.addEventListener('input', () => steps.scrubTo(Number(scrub.value)));
scrub.addEventListener('change', () => settleTo(Number(scrub.value)));
document.getElementById('btn-step-prev').addEventListener('click', () => { settleTo(index - 1); });
document.getElementById('btn-step-next').addEventListener('click', () => { settleTo(index + 1); });

// ---- Setup panel (New sheet + in-Build pitch change) ----
const panelSetup = document.getElementById('panel-setup');
const elPreset = document.getElementById('setup-preset');
const elHalf = document.getElementById('setup-half');
const elTeamA = document.getElementById('setup-teamA');
const elTeamB = document.getElementById('setup-teamB');
const PRESET_COUNTS = { '11v11': 11, '9v9': 9, '7v7': 7 };
let setupMode = 'new';

function openSetup(m) {
  setupMode = m;
  elPreset.value = scene.field.preset;
  elHalf.value = scene.field.half;
  const custom = elPreset.value === 'custom';
  if (!custom) { elTeamA.value = elTeamB.value = PRESET_COUNTS[scene.field.preset]; }
  elTeamA.disabled = elTeamB.disabled = !custom;
  panelSetup.hidden = false;
}
elPreset.addEventListener('change', () => {
  const custom = elPreset.value === 'custom';
  elTeamA.disabled = elTeamB.disabled = !custom;
  if (!custom) { elTeamA.value = PRESET_COUNTS[elPreset.value]; elTeamB.value = PRESET_COUNTS[elPreset.value]; }
});
document.getElementById('setup-cancel').addEventListener('click', () => {
  panelSetup.hidden = true;
  if (setupMode === 'new') showHome();
});
document.getElementById('setup-apply').addEventListener('click', () => {
  scene = createScene({
    preset: elPreset.value, half: elHalf.value,
    teamA: Math.max(0, Math.min(11, Number(elTeamA.value) || 0)),
    teamB: Math.max(0, Math.min(11, Number(elTeamB.value) || 0)),
    name: currentName,
  });
  index = 0;
  panelSetup.hidden = true;
  if (setupMode === 'new') {
    const t = newTactic(currentName, scene);
    currentDocId = t.id; currentName = t.name;
    saveMine(t);
    enterEditor('build');
  } else {
    render(); autosave();
  }
});

// ---- Navigation / surfaces ----
function showHome() {
  editorEl.hidden = true;
  homeEl.hidden = false;
  renderHome(homeEl, {
    templates: LIBRARY,
    mine: listMine(),
    onOpen: openCard,
    onNew: startNew,
    onImport: () => importInput.click(),
    onRename: renameTactic,
    onDuplicate: duplicateTactic,
    onExport: exportTactic,
    onDelete: deleteTactic,
  });
}

function enterEditor(m) {
  homeEl.hidden = true;
  editorEl.hidden = false;
  setMode(m);
}

function setMode(m) {
  editorEl.dataset.mode = m;
  docTitle.textContent = currentName + (m === 'build' ? ' ✎' : '');
  armed = null; selected = null; closeSelChip(); refreshArmedUI();
  render();
}

function sceneOf(item) {
  if (item.scene) return deserialize(JSON.stringify(item.scene));
  const t = loadMine(item.id);
  return t ? t.scene : null;
}

// ---- Flows ----
function startNew() {
  currentDocId = null; currentName = 'Untitled';
  scene = createScene({ preset: '11v11', teamA: 11, teamB: 11, half: 'full' }); index = 0;
  openSetup('new');
}
function openCard(kind, item) {
  if (kind === 'template') {
    scene = deserialize(JSON.stringify(item.scene));
    currentDocId = null; currentName = item.name;
  } else {
    const t = loadMine(item.id);
    if (!t) { showHome(); return; }
    scene = t.scene; currentDocId = t.id; currentName = t.name;
  }
  index = 0;
  enterEditor('watch');
}
function onEdit() {
  if (!currentDocId) {
    const t = newTactic(currentName + ' (copy)', scene);
    currentDocId = t.id; currentName = t.name;
    saveMine(t);
  }
  setMode('build');
}
function renameCurrent() {
  const name = (window.prompt('Name this tactic', currentName) || '').trim();
  if (!name) return;
  currentName = name; scene.name = name;
  docTitle.textContent = currentName + ' ✎';
  autosave();
}

document.getElementById('btn-edit').addEventListener('click', onEdit);
document.getElementById('btn-done').addEventListener('click', () => setMode('watch'));
document.getElementById('btn-back').addEventListener('click', showHome);
document.getElementById('btn-setup').addEventListener('click', () => openSetup('edit'));
docTitle.addEventListener('click', () => { if (mode() === 'build') renameCurrent(); });

// ---- Card-menu actions ----
function renameTactic(item) {
  const name = (window.prompt('Rename tactic', item.name) || '').trim();
  if (!name) return;
  const t = loadMine(item.id); if (!t) return;
  t.name = name; t.scene.name = name; t.updatedAt = Date.now();
  saveMine(t);
  showHome();
}
function duplicateTactic(item) {
  const s = sceneOf(item); if (!s) return;
  saveMine(newTactic((item.name || 'Untitled') + ' (copy)', s));
  showHome();
}
function exportTactic(item) {
  const s = sceneOf(item); if (!s) return;
  exportScene({ ...s, name: item.name });
}
function deleteTactic(item) {
  if (!window.confirm(`Delete "${item.name}"?`)) return;
  deleteMine(item.id);
  showHome();
}

importInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  importSceneFile(file).then((s) => {
    const t = newTactic(s.name || 'Imported', s);
    saveMine(t);
    scene = t.scene; currentDocId = t.id; currentName = t.name; index = 0;
    enterEditor('watch');
  }).catch(() => window.alert('Could not read that file.'));
  e.target.value = '';
});

// ---- Launch ----
migrateLegacyPlays();
showHome();
console.log('[goalpad] loaded');
