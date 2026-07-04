// app.js — entry point. Owns the scene and the current frame index; wires all modules.
import { createScene, duplicateFrame, deleteFrame } from './scene.js';
import { renderField } from './field.js';
import { renderTokens, setTokenPositions } from './tokens.js';
import { renderMarkup, initTools } from './tools.js';
import { createStepController, activeMarkupIndex } from './steps.js';
import { saveNamed, listSaved, loadNamed, deleteNamed, exportScene, importSceneFile } from './storage.js';
import { LIBRARY } from './library.js';

const board = document.getElementById('board');
const layerField = document.getElementById('layer-field');
const layerAnnotations = document.getElementById('layer-annotations');
const layerTokens = document.getElementById('layer-tokens');

let scene = createScene({ preset: '11v11', teamA: 11, teamB: 11, half: 'full' });
let index = 0;               // current frame index
let currentTool = 'select';
let currentTeam = 'A';
let currentTextColor = '#1b1f27';

const frame = () => scene.frames[index];

// Full render of the current frame (field + tokens + its markup).
function render() {
  renderField(board, layerField, scene.field);
  renderTokens(board, layerTokens, scene, frame(), () => currentTool, () => {});
  renderMarkup(layerAnnotations, frame());
  refreshScrubRange();
}

// ---- Tools (bound once; read live state via accessors) ----
initTools(board, layerAnnotations, {
  getScene: () => scene,
  getFrame: () => frame(),
  getTool: () => currentTool,
  getTeam: () => currentTeam,
  getTextColor: () => currentTextColor,
  onSceneChange: () => { renderTokens(board, layerTokens, scene, frame(), () => currentTool, () => {}); },
  onMarkupChange: () => { renderMarkup(layerAnnotations, frame()); },
});

// Tool selection.
const textColors = document.getElementById('text-colors');
document.querySelectorAll('.tool').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentTool = btn.dataset.tool;
    document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    textColors.hidden = currentTool !== 'text';
  });
});
textColors.querySelectorAll('.swatch').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentTextColor = btn.dataset.color;
    textColors.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  });
});
// Team toggle.
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

function updateStepLabel(pos) {
  stepLabel.textContent = `Step ${Math.round(pos) + 1} / ${scene.frames.length}`;
}
function refreshScrubRange() {
  scrub.max = String(Math.max(0, scene.frames.length - 1));
  scrub.value = String(index);
  updateStepLabel(index);
  btnDel.disabled = scene.frames.length <= 1;
}

// Called by the controller during play/scrub: move tokens + swap active-frame markup.
function applyPositions(positionsMap, pos) {
  setTokenPositions(layerTokens, positionsMap);
  const mi = Math.max(0, Math.min(scene.frames.length - 1, activeMarkupIndex(pos)));
  renderMarkup(layerAnnotations, scene.frames[mi]);
  scrub.value = String(pos);
  updateStepLabel(pos);
}

// Settle onto an integer frame: make it current and fully re-render (so drag edits it).
function settleTo(i) {
  index = Math.max(0, Math.min(scene.frames.length - 1, Math.round(i)));
  render();
}

const steps = createStepController({ getScene: () => scene, applyPositions, onDone: (i) => settleTo(i) });

document.getElementById('btn-add-step').addEventListener('click', () => {
  index = duplicateFrame(scene, index);
  render();
});
btnDel.addEventListener('click', () => {
  if (deleteFrame(scene, index)) { index = Math.min(index, scene.frames.length - 1); render(); }
});
document.getElementById('btn-play').addEventListener('click', () => steps.play());
scrub.addEventListener('input', () => steps.scrubTo(Number(scrub.value)));
scrub.addEventListener('change', () => settleTo(Number(scrub.value)));
document.getElementById('btn-step-prev').addEventListener('click', () => { settleTo(index - 1); });
document.getElementById('btn-step-next').addEventListener('click', () => { settleTo(index + 1); });

// ---- Setup panel ----
const panelSetup = document.getElementById('panel-setup');
const elPreset = document.getElementById('setup-preset');
const elHalf = document.getElementById('setup-half');
const elTeamA = document.getElementById('setup-teamA');
const elTeamB = document.getElementById('setup-teamB');
const PRESET_COUNTS = { '11v11': 11, '9v9': 9, '7v7': 7 };

function openSetup() {
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
document.getElementById('btn-setup').addEventListener('click', openSetup);
document.getElementById('setup-cancel').addEventListener('click', () => { panelSetup.hidden = true; });
document.getElementById('setup-apply').addEventListener('click', () => {
  scene = createScene({
    preset: elPreset.value,
    half: elHalf.value,
    teamA: Math.max(0, Math.min(11, Number(elTeamA.value) || 0)),
    teamB: Math.max(0, Math.min(11, Number(elTeamB.value) || 0)),
    name: scene.name,
  });
  index = 0;
  panelSetup.hidden = true;
  render();
});

// ---- Save / Load ----
const panelSaveLoad = document.getElementById('panel-saveload');
const savedList = document.getElementById('saved-list');
const saveName = document.getElementById('save-name');

function loadScene(next) { scene = next; index = 0; render(); }

function refreshSavedList() {
  savedList.replaceChildren();
  for (const name of listSaved()) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = name;
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', () => {
      let s = null;
      try { s = loadNamed(name); } catch { window.alert('That saved play is from an older version and cannot be loaded.'); return; }
      if (s) { loadScene(s); panelSaveLoad.hidden = true; }
    });
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => { deleteNamed(name); refreshSavedList(); });
    const actions = document.createElement('span');
    actions.append(loadBtn, delBtn);
    li.append(label, actions);
    savedList.appendChild(li);
  }
}
document.getElementById('btn-saveload').addEventListener('click', () => {
  saveName.value = scene.name === 'Untitled' ? '' : scene.name;
  refreshSavedList();
  panelSaveLoad.hidden = false;
});
document.getElementById('saveload-close').addEventListener('click', () => { panelSaveLoad.hidden = true; });
document.getElementById('save-current').addEventListener('click', () => {
  const name = (saveName.value || 'Untitled').trim();
  scene.name = name;
  saveNamed(name, scene);
  refreshSavedList();
});
document.getElementById('export-current').addEventListener('click', () => {
  const name = (saveName.value || scene.name || 'scene').trim();
  exportScene({ ...scene, name });
});
document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  importSceneFile(file).then((s) => { loadScene(s); panelSaveLoad.hidden = true; })
    .catch(() => window.alert('Could not read that file.'));
  e.target.value = '';
});

// ---- Library ----
const panelLibrary = document.getElementById('panel-library');
const libTabs = document.getElementById('lib-tabs');
const libList = document.getElementById('lib-list');
let currentLibCat = 'tactics';

function buildLibList() {
  libList.replaceChildren();
  const items = LIBRARY.filter((p) => p.category === currentLibCat);
  const groups = [];
  for (const p of items) if (!groups.includes(p.group)) groups.push(p.group);
  for (const grp of groups) {
    const label = document.createElement('div');
    label.className = 'lib-group';
    label.textContent = grp;
    libList.appendChild(label);
    for (const p of items.filter((x) => x.group === grp)) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'lib-row';
      const nm = document.createElement('span');
      nm.className = 'lib-nm';
      nm.textContent = p.name;
      const ds = document.createElement('span');
      ds.className = 'lib-ds';
      ds.textContent = p.description;
      row.append(nm, ds);
      row.addEventListener('click', () => {
        loadScene(JSON.parse(JSON.stringify(p.scene)));
        panelLibrary.hidden = true;
      });
      libList.appendChild(row);
    }
  }
}

libTabs.querySelectorAll('.lib-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentLibCat = btn.dataset.cat;
    libTabs.querySelectorAll('.lib-tab').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    buildLibList();
  });
});
document.getElementById('btn-library').addEventListener('click', () => { buildLibList(); panelLibrary.hidden = false; });
document.getElementById('library-close').addEventListener('click', () => { panelLibrary.hidden = true; });

render();
console.log('[goalpad] loaded');
