// app.js — entry point. Owns the current scene and wires modules together.
// Task 1: just size the board's viewBox so the empty pitch fills the stage.

const board = document.getElementById('board');

// Temporary viewBox until the field module sets it (full pitch, landscape).
board.setAttribute('viewBox', '0 0 1050 680');

console.log('[goalpad] loaded');
