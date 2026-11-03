import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';
import ts from 'typescript';

const filename = fileURLToPath(new URL('../features/product/ProductCard/pending-feedback.ts', import.meta.url));
const compiled = new Module(filename);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, filename);
const { createPendingFeedback, PENDING_FEEDBACK_DELAY } = compiled.exports;

function harness() {
  let now = 0, id = 0, visible = false;
  const jobs = new Map(), changes = [], callbacks = [];
  const clock = {
    schedule(callback, delay) { callbacks.push(callback); jobs.set(++id, { callback, at: now + delay }); return id; },
    cancel(handle) { jobs.delete(handle); },
  };
  const feedback = createPendingFeedback(value => { visible = value; changes.push(value); }, clock);
  return {
    feedback, changes, callbacks, jobs,
    get visible() { return visible; },
    advance(ms) {
      now += ms;
      for (const [key, job] of jobs) if (job.at <= now) { jobs.delete(key); job.callback(); }
    },
  };
}

test('A: completion before threshold never shows spinner, including a stale callback', () => {
  const h = harness(); h.feedback.start(); h.advance(PENDING_FEEDBACK_DELAY - 1);
  assert.equal(h.visible, false); h.feedback.finish(); h.advance(1000); h.callbacks[0]();
  assert.equal(h.changes.includes(true), false); assert.equal(h.jobs.size, 0);
});
test('B/C: loader appears only at threshold and completion hides it without a minimum hold', () => {
  const h = harness(); h.feedback.start(); h.advance(PENDING_FEEDBACK_DELAY - 1);
  assert.equal(h.visible, false); h.advance(1); assert.equal(h.visible, true);
  h.feedback.finish(); assert.equal(h.visible, false); assert.equal(h.jobs.size, 0);
});
test('D: failed operation uses the same immediate cleanup', () => {
  const h = harness(); h.feedback.start(); h.advance(500); assert.equal(h.visible, true);
  try { throw new Error('Cart failed'); } catch { h.feedback.finish(); }
  assert.equal(h.visible, false); assert.equal(h.jobs.size, 0);
});
test('E: unmount cancels timer and rejects stale updates and subsequent starts', () => {
  const h = harness(); h.feedback.start(); h.feedback.dispose();
  const before = [...h.changes]; h.advance(1000); h.callbacks[0](); h.feedback.finish(); h.feedback.start();
  assert.deepEqual(h.changes, before); assert.equal(h.jobs.size, 0);
});
test('F: successive operations have independent delay and cannot inherit visibility', () => {
  const h = harness(); h.feedback.start(); h.advance(120); assert.equal(h.visible, true);
  h.feedback.finish(); h.feedback.start(); h.callbacks[0](); assert.equal(h.visible, false);
  h.advance(119); assert.equal(h.visible, false); h.advance(1); assert.equal(h.visible, true);
  h.feedback.finish(); h.feedback.start(); h.feedback.finish(); h.advance(1000);
  assert.equal(h.visible, false); assert.equal(h.jobs.size, 0);
});
