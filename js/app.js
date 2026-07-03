// app.js — entry point. Owns the current scene and wires modules together.
import { createScene, applyStep } from './scene.js';
import { renderField } from './field.js';
import { renderTokens } from './tokens.js';
import { renderAnnotations, initTools } from './tools.js';
import { createStepController } from './steps.js';
import { saveNamed, listSaved, loadNamed, deleteNamed, exportScene, importSceneFile } from './storage.js';

const board = document.getElementById('board');
const layerField = document.getElementById('layer-field');
const layerTokens = document.getElementById('layer-tokens');
const layerAnnotations = document.getElementById('layer-annotations');
const scrub = document.getElementById('scrub');
const stepLabel = document.getElementById('step-label');
let currentTool = 'select';

let scene = createScene({ preset: '11v11', teamA: 11, teamB: 11, half: false });

function render() {
  renderField(board, layerField, scene.field);
  renderAnnotations(layerAnnotations, scene);
  renderTokens(board, layerTokens, scene, () => {});
}

// Tool selection.
document.querySelectorAll('.tool').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentTool = btn.dataset.tool;
    document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    // Tokens only drag in select mode; ignore pointer events on them otherwise.
    layerTokens.style.pointerEvents = currentTool === 'select' ? 'auto' : 'none';
  });
});

initTools(board, layerAnnotations, () => scene, () => currentTool, () => renderAnnotations(layerAnnotations, scene));

// ---- Setup panel ----
const panelSetup = document.getElementById('panel-setup');
const elPreset = document.getElementById('setup-preset');
const elTeamA = document.getElementById('setup-teamA');
const elTeamB = document.getElementById('setup-teamB');
const elHalf = document.getElementById('setup-half');

function openSetup() {
  elPreset.value = scene.field.preset;
  elTeamA.value = scene.field.teamA;
  elTeamB.value = scene.field.teamB;
  elHalf.checked = scene.field.half;
  elTeamA.disabled = elTeamB.disabled = (elPreset.value !== 'custom');
  panelSetup.hidden = false;
}
function closeSetup() { panelSetup.hidden = true; }

// Presets lock team counts to equal sizes; custom allows independent counts.
const PRESET_COUNTS = { '11v11': 11, '9v9': 9, '7v7': 7 };
elPreset.addEventListener('change', () => {
  const n = PRESET_COUNTS[elPreset.value];
  const custom = elPreset.value === 'custom';
  elTeamA.disabled = elTeamB.disabled = !custom;
  if (!custom) { elTeamA.value = n; elTeamB.value = n; }
});

document.getElementById('btn-setup').addEventListener('click', openSetup);
document.getElementById('setup-cancel').addEventListener('click', closeSetup);
document.getElementById('setup-apply').addEventListener('click', () => {
  const field = {
    preset: elPreset.value,
    teamA: Math.max(1, Math.min(11, Number(elTeamA.value) || 1)),
    teamB: Math.max(1, Math.min(11, Number(elTeamB.value) || 1)),
    half: elHalf.checked,
  };
  scene = createScene(field, scene.name);
  closeSetup();
  render();
  buildSteps();
});

// ---- Steps bar (add step / play / scrub) ----
let steps = null;

function applyPositions(snapshot, fractionalIndex) {
  applyStep(scene, snapshot);         // write coords onto the model
  renderTokens(board, layerTokens, scene, () => {}); // redraw tokens at new coords
  if (fractionalIndex != null) {
    scrub.value = String(fractionalIndex);
    updateStepLabel(fractionalIndex);
  }
}

function updateStepLabel(pos) {
  const total = scene.steps.length;
  const shown = total === 0 ? 0 : Math.round(pos) + 1;
  stepLabel.textContent = `Step ${total === 0 ? 0 : shown} / ${total}`;
}

function refreshScrubRange() {
  const max = Math.max(0, scene.steps.length - 1);
  scrub.max = String(max);
  scrub.value = String(max);
  updateStepLabel(max);
}

function buildSteps() {
  steps = createStepController({
    scene,
    applyPositions,
    onStepsChanged: () => refreshScrubRange(),
  });
  refreshScrubRange();
}

document.getElementById('btn-add-step').addEventListener('click', () => steps.addStep());
document.getElementById('btn-play').addEventListener('click', () => steps.play());
scrub.addEventListener('input', () => steps.scrubTo(Number(scrub.value)));
document.getElementById('btn-step-prev').addEventListener('click', () => {
  const v = Math.max(0, Math.round(Number(scrub.value)) - 1);
  scrub.value = String(v); steps.scrubTo(v);
});
document.getElementById('btn-step-next').addEventListener('click', () => {
  const v = Math.min(Number(scrub.max), Math.round(Number(scrub.value)) + 1);
  scrub.value = String(v); steps.scrubTo(v);
});

function loadScene(next) {
  scene = next;
  render();
  buildSteps();
}

// ---- Save/Load panel ----
const panelSaveLoad = document.getElementById('panel-saveload');
const savedList = document.getElementById('saved-list');
const saveName = document.getElementById('save-name');

function refreshSavedList() {
  savedList.replaceChildren();
  for (const name of listSaved()) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = name;
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', () => {
      const s = loadNamed(name);
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

buildSteps();

render();
console.log('[goalpad] loaded');
