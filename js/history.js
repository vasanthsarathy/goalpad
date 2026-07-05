// history.js — PURE snapshot undo/redo stacks. No DOM. The caller supplies a clone(state) fn.
export function createHistory(clone, cap = 50) {
  let baseline = null;
  const undoStack = [];
  const redoStack = [];
  return {
    reset(state) { baseline = clone(state); undoStack.length = 0; redoStack.length = 0; },
    record(state) {
      undoStack.push(baseline);
      if (undoStack.length > cap) undoStack.shift();
      redoStack.length = 0;
      baseline = clone(state);
    },
    undo(current) {
      if (!undoStack.length) return null;
      redoStack.push(clone(current));
      baseline = undoStack.pop();
      return clone(baseline);
    },
    redo(current) {
      if (!redoStack.length) return null;
      undoStack.push(clone(current));
      baseline = redoStack.pop();
      return clone(baseline);
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
  };
}
