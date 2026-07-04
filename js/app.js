// app.js — shell: Library home + Watch/Build editor modes + continuous autosave.
import { createScene, duplicateFrame, deleteFrame } from './scene.js';
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
let currentTool = 'select';
let currentTeam = 'A';
let currentDocId = null;   // Mine id, or null for a template preview
let currentName = 'Untitled';

const frame = () => scene.frames[index];

function render() {
  renderField(board, layerField, scene.field);
  renderTokens(board, layerTokens, scene, frame(), () => currentTool, autosave);
  renderMarkup(layerAnnotations, frame());
  refreshScrubRange();
}

function autosave() {
  if (!currentDocId) return;          // template preview → nothing to save yet
  scene.name = currentName;
  saveMine({ id: currentDocId, name: currentName, scene, updatedAt: Date.now() });
}

// ---- Tools (bound once; live state via accessors) ----
initTools(board, layerAnnotations, {
  getScene: () => scene,
  getFrame: () => frame(),
  getTool: () => currentTool,
  getTeam: () => currentTeam,
  onSceneChange: () => { renderTokens(board, layerTokens, scene, frame(), () => currentTool, autosave); autosave(); },
  onMarkupChange: () => { renderMarkup(layerAnnotations, frame()); autosave(); },
});

document.querySelectorAll('.tool').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentTool = btn.dataset.tool;
    document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  });
});
document.querySelectorAll('.team').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentTeam = btn.dataset.team;
    document.querySelectorAll('.team').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  });
});

// ---- Steps / playback ----
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
let setupMode = 'new';   // 'new' | 'edit'

function openSetup(mode) {
  setupMode = mode;
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

function enterEditor(mode) {
  homeEl.hidden = true;
  editorEl.hidden = false;
  setMode(mode);
  render();
}

function setMode(mode) {
  editorEl.dataset.mode = mode;
  docTitle.textContent = currentName + (mode === 'build' ? ' ✎' : '');
  if (mode === 'build') {
    currentTool = 'select';
    document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === 'select')));
  } else {
    currentTool = 'watch';   // non-'select' → piece dragging is disabled
  }
}

function sceneOf(item) {
  if (item.scene) return deserialize(JSON.stringify(item.scene)); // template
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
  if (!currentDocId) {                       // fork the template preview
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
docTitle.addEventListener('click', () => { if (editorEl.dataset.mode === 'build') renameCurrent(); });

// ---- Card-menu actions (operate on Home items) ----
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
