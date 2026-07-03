// app.js — entry point. Owns the current scene and wires modules together.
import { createScene } from './scene.js';
import { renderField } from './field.js';
import { renderTokens } from './tokens.js';
import { renderAnnotations, initTools } from './tools.js';

const board = document.getElementById('board');
const layerField = document.getElementById('layer-field');
const layerTokens = document.getElementById('layer-tokens');
const layerAnnotations = document.getElementById('layer-annotations');
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
});

render();
console.log('[goalpad] loaded');
