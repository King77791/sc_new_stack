import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

function load(name) {
  const filename = fileURLToPath(new URL(`../components/Notification/${name}.ts`, import.meta.url));
  const compiled = new Module(filename);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText, filename);
  return compiled.exports;
}
const { createNotificationController } = load('notification.controller');
const { notificationMessage, cartAddedEvent } = load('notification.types');
const event = { type: 'favorite.added', payload: { productKey: 'tea', title: 'Tea' } };
function setup(reduced = false) {
  let now = 0, serial = 0;
  const tasks = new Map();
  const controller = createNotificationController({
    now: () => now,
    set: (callback, delay) => { const id = ++serial; tasks.set(id, { callback, at: now + delay }); return id; },
    clear: id => tasks.delete(id),
  });
  controller.connect(); controller.setReducedMotion(reduced);
  const tick = amount => {
    const end = now + amount;
    while (true) {
      const next = [...tasks.entries()].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at; tasks.delete(next[0]); next[1].callback();
    }
    now = end;
  };
  return { controller, tick, tasks, state: controller.getSnapshot };
}

test('FIFO preserves identical dispatches with distinct IDs; stale completions cannot advance next', () => {
  const { controller: c, state, tick } = setup();
  c.notify(event); c.notify(event); c.notify(event);
  assert.deepEqual([state().active.id, ...state().pending.map(e => e.id)], [1, 2, 3]);
  for (let id = 1; id <= 3; id++) {
    assert.equal(state().active.id, id);
    c.enter(id); assert.equal(state().phase, 'entering');
    c.complete(id, 'entering'); assert.equal(state().phase, 'resting');
    c.complete(id, 'exiting'); assert.equal(state().phase, 'resting');
    tick(1250); c.complete(id, 'exiting');
    c.complete(id, 'entering'); c.complete(id, 'exiting');
    assert.equal(state().active?.id, id < 3 ? id + 1 : undefined);
  }
  c.complete(999, 'entering'); assert.equal(state().active, null);
});

test('normal lifecycle: REST starts at ENTER completion, then EXIT and next occurrence', () => {
  const { controller: c, state, tick } = setup();
  c.notify(event); c.notify(event); c.enter(1);
  tick(625); assert.equal(state().phase, 'entering');
  c.complete(1, 'entering'); tick(1249); assert.equal(state().phase, 'resting');
  tick(1); assert.equal(state().phase, 'exiting');
  c.complete(1, 'exiting'); assert.equal(state().active.id, 2); assert.equal(state().phase, 'starting');
  c.complete(1, 'entering'); c.complete(1, 'exiting'); tick(1000);
  assert.equal(state().active.id, 2); assert.equal(state().phase, 'starting');
});

test('hover and focus preserve remaining REST time until both leave', () => {
  const { controller: c, state, tick } = setup(true);
  c.notify(event); c.enter(1); tick(400);
  c.pause('hover', true); tick(5000); c.pause('focus', true); c.pause('hover', false); tick(5000);
  assert.equal(state().paused, true);
  c.pause('focus', false); tick(849); assert.ok(state().active);
  tick(1); assert.equal(state().active, null);
});

test('reduced motion uses 1250ms REST only and progresses FIFO without transition events', () => {
  const { controller: c, state, tick } = setup(true);
  c.notify(event); c.notify(event); c.enter(1);
  assert.equal(state().phase, 'resting'); tick(1250);
  assert.equal(state().active.id, 2); c.enter(2); tick(1250); assert.equal(state().active, null);
});

test('disconnect cancels timers; reconnect resumes remaining REST, not full duration', () => {
  const { controller: c, state, tick, tasks } = setup(true);
  c.notify(event); c.enter(1); tick(300); c.disconnect();
  assert.equal(tasks.size, 0); tick(10000); assert.ok(state().active);
  c.connect(); tick(949); assert.ok(state().active); tick(1); assert.equal(state().active, null);
});

test('missing transition events have bounded fallback; toggling reduced motion cannot strand a phase', () => {
  const { controller: c, state, tick } = setup();
  c.notify(event); c.enter(1); tick(705); assert.equal(state().phase, 'resting');
  tick(1250); assert.equal(state().phase, 'exiting'); c.setReducedMotion(true); assert.equal(state().active, null);
  tick(1000); assert.equal(state().active, null);
});

test('semantic presentation and successful ADD snapshot preserve addedQuantity', () => {
  const added = cartAddedEvent({ item: { id: 'line', productKey: 'tea', presentation: { title: 'Tea', configurationLabel: '50 г.' }, quantity: 5 }, addedQuantity: 1 });
  assert.equal(added.payload.addedQuantity, 1);
  assert.equal(added.payload.title, 'Tea');
  assert.equal(notificationMessage(added), 'Товар добавлен в корзину');
  assert.equal(notificationMessage(event), 'Товар добавлен в избранное');
});

test('F1: latest transform attempt replaces EXIT watchdog; canceled callback cannot remove active', () => {
  const { controller: c, state, tick, tasks } = setup();
  c.notify(event); c.notify(event); c.enter(1); c.complete(1, 'entering'); tick(1250);
  const staleWatchdog = [...tasks.values()][0].callback;
  tick(450); c.transitionStarted(1, 'exiting');
  assert.equal(tasks.size, 1);
  tick(255); staleWatchdog();
  assert.equal(state().active.id, 1); assert.equal(state().phase, 'exiting'); assert.equal(tasks.size, 1);
  tick(449); assert.equal(state().active.id, 1);
  tick(1); assert.equal(state().active.id, 2); assert.equal(state().phase, 'starting');
  c.enter(2); tick(705); tick(1250); tick(705);
  assert.equal(state().active, null); assert.equal(tasks.size, 0);
});

test('F1: EXIT without transitionend completes once; stale run/end cannot advance next occurrence', () => {
  const { controller: c, state, tick, tasks } = setup();
  c.notify(event); c.notify(event); c.enter(1); c.complete(1, 'entering'); tick(1250);
  tick(704); assert.equal(state().phase, 'exiting');
  tick(1); assert.equal(state().active.id, 2);
  c.transitionStarted(1, 'exiting'); c.complete(1, 'exiting');
  assert.equal(state().active.id, 2); assert.equal(tasks.size, 0);
});

for (const phase of ['entering', 'exiting']) {
  test(`F2: reconnect during ${phase} recovers entire FIFO without transition events`, () => {
    const { controller: c, state, tick, tasks } = setup();
    c.notify(event); c.notify(event); c.enter(1);
    if (phase === 'exiting') { c.complete(1, 'entering'); tick(1250); }
    tick(100); const canceledCallback = [...tasks.values()][0].callback;
    const oldConnection = c.connect(); c.disconnect();
    assert.equal(tasks.size, 0); tick(10000);
    assert.equal(state().phase, phase);
    const newConnection = c.connect(); assert.notEqual(oldConnection, newConnection);
    assert.equal(tasks.size, 1);
    c.complete(1, phase, oldConnection); c.transitionStarted(1, phase, oldConnection); canceledCallback();
    assert.equal(state().phase, phase); assert.equal(tasks.size, 1);
    tick(705);
    if (phase === 'entering') { assert.equal(state().phase, 'resting'); tick(1250); tick(705); }
    assert.equal(state().active.id, 2);
    c.enter(2); tick(705); tick(1250); tick(705);
    assert.equal(state().active, null); assert.equal(tasks.size, 0);
  });
}

test('F2: repeated connect/cleanup/connect keeps exactly one watchdog', () => {
  const { controller: c, state, tick, tasks } = setup();
  c.notify(event); c.enter(1);
  for (let attempt = 0; attempt < 4; attempt++) {
    const connection = c.connect(); assert.equal(c.connect(), connection); assert.equal(tasks.size, 1);
    c.disconnect(); assert.equal(tasks.size, 0); c.connect(); assert.equal(tasks.size, 1);
  }
  tick(705); assert.equal(state().phase, 'resting');
  tick(1250); tick(705); assert.equal(state().active, null); assert.equal(tasks.size, 0);
});

test('F2: paused REST remount preserves remaining time and drops old DOM hover/focus', () => {
  const { controller: c, state, tick, tasks } = setup(true);
  c.notify(event); c.enter(1); tick(400); c.pause('hover', true); c.pause('focus', true);
  c.disconnect(); tick(5000); c.connect();
  assert.equal(state().paused, false); assert.equal(tasks.size, 1);
  tick(849); assert.ok(state().active); tick(1); assert.equal(state().active, null);
});

test('F2: reduced-motion reconnect and runtime preference changes leave no orphan timer', () => {
  const { controller: c, state, tick, tasks } = setup();
  c.notify(event); c.notify(event); c.enter(1); tick(100);
  c.disconnect(); c.setReducedMotion(true); c.connect();
  assert.equal(state().phase, 'resting'); tick(1250); assert.equal(state().active.id, 2);
  c.enter(2); tick(300); c.disconnect(); c.connect(); tick(949); assert.ok(state().active);
  tick(1); assert.equal(state().active, null); assert.equal(tasks.size, 0);
});
