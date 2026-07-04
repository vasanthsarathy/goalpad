import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistory } from '../js/history.js';

const clone = (o) => JSON.parse(JSON.stringify(o));

test('reset clears the stacks', () => {
  const h = createHistory(clone);
  h.reset({ n: 0 });
  assert.equal(h.canUndo(), false);
  assert.equal(h.canRedo(), false);
});

test('record then undo returns the prior state; redo replays forward', () => {
  const h = createHistory(clone);
  h.reset({ n: 0 });
  h.record({ n: 1 });
  h.record({ n: 2 });
  assert.equal(h.canUndo(), true);
  assert.deepEqual(h.undo({ n: 2 }), { n: 1 });
  assert.deepEqual(h.undo({ n: 1 }), { n: 0 });
  assert.equal(h.canUndo(), false);
  assert.deepEqual(h.redo({ n: 0 }), { n: 1 });
  assert.deepEqual(h.redo({ n: 1 }), { n: 2 });
  assert.equal(h.canRedo(), false);
});

test('undo on an empty stack returns null', () => {
  const h = createHistory(clone);
  h.reset({ n: 0 });
  assert.equal(h.undo({ n: 0 }), null);
});

test('a new record after undo clears the redo stack', () => {
  const h = createHistory(clone);
  h.reset({ n: 0 });
  h.record({ n: 1 });
  h.undo({ n: 1 });
  assert.equal(h.canRedo(), true);
  h.record({ n: 9 });
  assert.equal(h.canRedo(), false);
});

test('returned states are clones (mutating them does not corrupt history)', () => {
  const h = createHistory(clone);
  h.reset({ n: 0 });
  h.record({ n: 1 });
  const u = h.undo({ n: 1 });
  u.n = 42;
  assert.deepEqual(h.redo({ n: 42 }), { n: 1 });
});

test('respects the cap on the undo stack', () => {
  const h = createHistory(clone, 3);
  h.reset({ n: 0 });
  for (let i = 1; i <= 10; i++) h.record({ n: i });
  let count = 0;
  while (h.undo({ n: -1 })) count++;
  assert.equal(count, 3);
});
