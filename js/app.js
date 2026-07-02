// app.js — entry point. Owns the current scene and wires modules together.
import { createScene } from './scene.js';
import { renderField } from './field.js';

const board = document.getElementById('board');
const layerField = document.getElementById('layer-field');

const scene = createScene({ preset: '11v11', teamA: 11, teamB: 11, half: false });

function render() {
  renderField(board, layerField, scene.field);
}

render();
console.log('[goalpad] loaded');
