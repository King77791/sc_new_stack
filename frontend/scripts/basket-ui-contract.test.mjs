import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url)), cache = new Map();
let publicCart;
let projectionCalls = 0;
function load(relative) {
  const filename = ['.ts', '.tsx'].map(ext => path.resolve(root, relative + ext)).find(fs.existsSync);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = new Module(filename); cache.set(filename, compiled);
  compiled.require = name => {
    if (name.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) };
    if (name === 'next/link') return function Link({ href, children, ...props }) { return React.createElement('a', { href, ...props }, children); };
    if (name === 'next/image') return function Image(props) { return React.createElement('img', props); };
    let local;
    if (name.startsWith('@/')) local = name.slice(2);
    else if (name.startsWith('.')) local = path.relative(root, path.resolve(path.dirname(filename), name)).replaceAll('\\', '/');
    if (local === 'features/cart/CartProvider') return { useCart: () => publicCart };
    if (local) {
      const dependency = load(local);
      if (local === 'features/product-input/product-input.basket') return { ...dependency,
        projectProductInputBasket: (...args) => { projectionCalls++; return dependency.projectProductInputBasket(...args); } };
      return dependency;
    }
    return Module.createRequire(filename)(name);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, filename);
  return compiled.exports;
}
const { applicationProductInputs: app } = load('features/product-input/product-input.application');
const { projectProductInputBasket: project } = load('features/product-input/product-input.basket');
const { prepareProductInputs: prepare } = load('features/product-input/product-input.validation');
const { createProductInputSnapshot: snapshot } = load('features/product-input/product-input.snapshot');
const { toBasketView: adapt, basketFocusTarget: focusTarget, CHECKOUT_UNAVAILABLE } = load('features/basket/adapters/basket-ui.adapter');
const { createBasketInteractions: interactions } = load('features/basket/model/basket-interactions');
const { BasketView, BasketTransferEditor } = load('features/basket/ui/BasketView');
const { BasketFeature } = load('features/basket/ui/BasketFeature');
const cartModel = load('features/cart/cart.model');
const { formatBasketMoney: money } = load('features/basket/basket-money');
const { initialBasketInteractionState: idle } = load('features/basket/model/basket-interactions');
const id = (key = 'tea-presentation', config = 'tea-50') => ({ productKey: key,
  configuration: config === null ? { kind: 'fixed' } : { kind: 'selectable', id: config } });
function item(key = 'tea-presentation', config = 'tea-50', quantity = 1) {
  const identity = id(key, config);
  return cartModel.addItem([], { ...identity, quantity,
    presentation: { slug: key, title: 'Snapshot title', configurationLabel: config ?? undefined } }, app.resolvePricing).result.value.item;
}
function fixtureCart(items = [], gate, failure) {
  let current = items;
  const calls = [];
  const execute = (method, args, apply) => {
    calls.push({ method, args });
    const run = () => { if (failure) return { ok: false, reason: failure }; const t = apply(); current = t.items; return t.result; };
    return gate ? gate.promise.then(run) : Promise.resolve(run());
  };
  return { calls, get items() { return current; }, get itemCount() { return current.length; }, get hasItems() { return current.length > 0; },
    getItem: (key, config) => cartModel.getItem(current, key, config),
    getQuantity: (key, config) => cartModel.getQuantity(current, key, config),
    setItemQuantity: (itemId, quantity) => execute('SET', [itemId, quantity], () => cartModel.setItemQuantity(current, itemId, quantity, app.resolvePricing)),
    removeItem: itemId => execute('REMOVE', [itemId], () => cartModel.removeItem(current, itemId)),
    transferConfiguration: input => execute('TRANSFER', [input], () => cartModel.transferConfiguration(current, input, app.resolveTransferTarget, app.resolvePricing)),
    addItem: input => execute('ADD', [input], () => cartModel.addItem(current, input, app.resolvePricing)),
    externalQuantity(itemId, quantity) { current = cartModel.setItemQuantity(current, itemId, quantity, app.resolvePricing).items; },
    externalRemove(itemId) { current = cartModel.removeItem(current, itemId).items; },
  };
}
const latch = () => { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; };
const change = mutate => { const value = structuredClone(app.views.snapshot); mutate(value); return prepare(snapshot(value)); };
const view = (items, inputs = app.views) => adapt(project(items, inputs));
const html = (v, extra = {}) => renderToStaticMarkup(React.createElement(BasketView, {
  view: v, interaction: idle, headingRef: { current: null }, onAction() {}, onEdit() {}, ...extra,
}));
const makeActions = (cart, inputs = app.views) => { const states = []; return { states,
  actions: interactions(() => cart, () => inputs, state => states.push(state)) }; };
const rows = v => v.groups.flatMap(g => g.configurations);

test('G1 one Product group contains several canonical configurations', () => {
  const v = view([item(), item('tea-presentation', 'tea-100')]); assert.equal(v.groups.length, 1); assert.equal(rows(v).length, 2);
});
test('G2 grouping uses canonical productKey even with identical titles', () => {
  const inputs = change(s => { s.products[0].presentation.title = s.products[1].presentation.title; });
  const v = view([item(), item('discount-tea-presentation', 'discount-50')], inputs); assert.equal(v.groups.length, 2);
  assert.equal(v.groups[0].presentation.title, v.groups[1].presentation.title);
});
test('G3 group order follows first canonical occurrence', () => {
  const v = view([item('pressed-puer-presentation', null), item(), item('tea-presentation', 'tea-100')]);
  assert.deepEqual(v.groups.map(g => g.productKey), ['pressed-puer-presentation', 'tea-presentation']);
});
test('G4 configurations follow explicit Gate 8B canonical weight contract', () => {
  const input = [item('tea-presentation', 'tea-250'), item(), item('tea-presentation', 'tea-100')];
  assert.deepEqual(rows(view(input)).map(l => l.item.configuration.id), ['tea-50', 'tea-100', 'tea-250']);
  assert.equal(input[0].configuration.id, 'tea-250');
});
test('G5 fixed ceramics has one row without invented weight', () => {
  const v = view([item('teapot-pharaoh-presentation', null)]); assert.equal(rows(v)[0].label, 'За штуку'); assert.equal(rows(v)[0].canTransfer, false);
});
test('G6 missing Product retains snapshot reference/title and safe removal', () => {
  const i = item('missing', 'unknown'), v = view([i]); assert.equal(rows(v)[0].item, i);
  assert.equal(v.groups[0].presentation.title, i.presentation.title); assert.equal(rows(v)[0].canRemove, true);
});
test('G7 unavailable Product line remains visible with quantity', () => {
  const i = item('availability-tea-presentation', 'availability-200', 3), v = view([i]);
  assert.equal(rows(v)[0].item.quantity, 3); assert.equal(rows(v)[0].availabilityLabel, 'Нет в наличии');
});
test('G8 renderer emits a single Product header for multiple configurations', () => {
  const markup = html(view([item(), item('tea-presentation', 'tea-100')]));
  assert.equal((markup.match(/class="productHeader"/g) ?? []).length, 1); assert.equal((markup.match(/data-row-id=/g) ?? []).length, 2);
});
test('Q1 increase reads actual current Q rather than stale rendered Q', async () => {
  const i = item(), c = fixtureCart([i]), { actions } = makeActions(c); c.externalQuantity(i.id, 7);
  await actions.quantity(i, 1); assert.equal(c.calls[0].args[1], 8); assert.equal(c.items[0].quantity, 8);
});
test('Q2 decrease reads actual Q and calls absolute SET Q-1', async () => {
  const i = item(), c = fixtureCart([i]), { actions } = makeActions(c); c.externalQuantity(i.id, 3);
  await actions.quantity(i, -1); assert.deepEqual(c.calls[0], { method: 'SET', args: [i.id, 2] });
});
test('Q3 Q=1 decrement uses REMOVE', async () => {
  const i = item(), c = fixtureCart([i]); await makeActions(c).actions.quantity(i, -1);
  assert.equal(c.calls[0].method, 'REMOVE'); assert.equal(c.items.length, 0);
});
test('Q4 quantity-zero SET is never called', async () => {
  const i = item(), c = fixtureCart([i]), { actions } = makeActions(c); await actions.quantity(i, -1); await actions.quantity(i, -1);
  assert.ok(c.calls.every(call => call.method !== 'SET' || call.args[1] > 0)); assert.ok(c.calls.every(call => call.method !== 'ADD'));
});
test('Q5 pending guards a row until command completion, without optimistic Q', async () => {
  const gate = latch(), i = item(), c = fixtureCart([i], gate), { actions, states } = makeActions(c);
  const first = actions.quantity(i, 1); assert.equal(states.at(-1).pending[0], i.id); assert.equal(c.items[0], i);
  assert.equal((await actions.remove(i)).reason, 'busy'); gate.release(); await first; assert.deepEqual(states.at(-1).pending, []);
});
test('Q6 rapid mixed repeated clicks produce only one pending command', async () => {
  const gate = latch(), i = item(), c = fixtureCart([i], gate), { actions } = makeActions(c);
  const first = actions.quantity(i, 1); const others = await Promise.all([actions.quantity(i, 1), actions.quantity(i, -1), actions.quantity(i, 1)]);
  assert.ok(others.every(r => r.reason === 'busy')); assert.equal(c.calls.length, 1); gate.release(); await first;
});
test('Q7 independent rows are not locked together', async () => {
  const gate = latch(), a = item(), b = item('tea-presentation', 'tea-100'), c = fixtureCart([a, b], gate), { actions } = makeActions(c);
  const pending = [actions.quantity(a, 1), actions.quantity(b, 1)]; assert.equal(c.calls.length, 2); gate.release(); await Promise.all(pending);
  assert.deepEqual(c.items.map(i => i.quantity), [2, 2]);
});
test('Q8 unavailable/unknown increase rejects while decrease/remove remain available', async () => {
  for (const i of [item('availability-tea-presentation', 'availability-200', 2), item('missing', 'unknown', 2)]) {
    const c = fixtureCart([i]), { actions } = makeActions(c); assert.equal((await actions.quantity(i, 1)).reason, 'unavailable');
    assert.equal(c.calls.length, 0); assert.equal((await actions.quantity(i, -1)).ok, true); assert.equal((await actions.remove(i)).ok, true);
  }
});
test('F1 transfer moves full source Q', async () => {
  const source = item('tea-presentation', 'tea-50', 4), c = fixtureCart([source]);
  const r = await makeActions(c).actions.transfer(source, id('tea-presentation', 'tea-100'));
  assert.equal(r.ok, true); assert.equal(c.items[0].quantity, 4); assert.equal(c.items[0].configuration.id, 'tea-100');
});
test('F2 public F1 receives the exact expectedSource reference', async () => {
  const source = item(), c = fixtureCart([source]); await makeActions(c).actions.transfer(source, id('tea-presentation', 'tea-100'));
  assert.equal(c.calls[0].args[0].expectedSource, source);
});
test('F3 target merge reads actual target quantity', async () => {
  const source = item('tea-presentation', 'tea-50', 2), target = item('tea-presentation', 'tea-100', 1), c = fixtureCart([source, target]);
  c.externalQuantity(target.id, 7); await makeActions(c).actions.transfer(source, target);
  assert.equal(c.items.length, 1); assert.equal(c.items[0].quantity, 9);
});
test('F4 unavailable target cannot transfer or merge', async () => {
  const source = item('availability-tea-presentation', 'availability-50'), c = fixtureCart([source]);
  const r = await makeActions(c).actions.transfer(source, id(source.productKey, 'availability-200'));
  assert.equal(r.reason, 'unavailable'); assert.equal(c.calls.length, 0); assert.equal(c.items[0], source);
});
test('F5 changed source produces explicit conflict; cloning cannot satisfy source precondition', async () => {
  const source = item(), c = fixtureCart([source]), { actions, states } = makeActions(c); c.externalQuantity(source.id, 2);
  assert.equal((await actions.transfer(source, id('tea-presentation', 'tea-100'))).reason, 'conflict');
  assert.match(states.at(-1).errors[source.id], /откройте.*заново/); assert.equal(c.calls.length, 0);
  assert.equal((await actions.transfer({ ...c.items[0] }, id('tea-presentation', 'tea-100'))).reason, 'conflict');
});
test('F6 fixed Product has no editor targets or active transfer button', () => {
  const i = item('pressed-puer-presentation', null), c = fixtureCart([i]); assert.deepEqual(makeActions(c).actions.targets(i), []);
  assert.doesNotMatch(html(view([i])), /data-action="edit"/);
});
test('F7 pending transfer locks source and target but not an independent row', async () => {
  const gate = latch(), source = item(), target = item('tea-presentation', 'tea-100'), other = item('pressed-puer-presentation', null), c = fixtureCart([source, target, other], gate), { actions } = makeActions(c);
  const pending = actions.transfer(source, target); assert.equal((await actions.quantity(target, 1)).reason, 'busy');
  assert.equal((await actions.quantity(source, -1)).reason, 'busy'); const independent = actions.quantity(other, 1);
  gate.release(); await Promise.all([pending, independent]); assert.equal(c.calls.length, 2);
});
test('F8 transfer is exactly one public command, never ADD+REMOVE', async () => {
  const source = item(), c = fixtureCart([source]); await makeActions(c).actions.transfer(source, id('tea-presentation', 'tea-100'));
  assert.deepEqual(c.calls.map(call => call.method), ['TRANSFER']);
});
test('P1 explicit O/C prices survive presentation unchanged', () => {
  const v = view([item('discount-tea-presentation', 'discount-50', 4)]), l = rows(v)[0];
  assert.equal(l.original, '3 400 ₽'); assert.equal(l.price, '2 560 ₽');
});
test('P2 Product-level policy covers all configurations', () => {
  const v = view([item('discount-tea-presentation', 'discount-50'), item('discount-tea-presentation', 'discount-100')]);
  assert.equal(v.groups[0].badge, '−25%'); assert.ok(rows(v).every(l => l.original));
});
test('P3 one discount badge per Product group, not per configuration', () => {
  const markup = html(view([item('discount-tea-presentation', 'discount-50'), item('discount-tea-presentation', 'discount-100')]));
  assert.equal((markup.match(/data-discount-badge/g) ?? []).length, 1);
});
test('P4 line total parity with canonical Cart resolver', () => {
  const i = item('tea-presentation', 'tea-100', 3); assert.equal(rows(view([i]))[0].price, i.pricing.displayLinePrice);
});
test('P5 group total is Gate 8B group total', () => {
  const items = [item(), item('tea-presentation', 'tea-100', 3)], p = project(items, app.views);
  assert.equal(adapt(p).groups[0].totals.current, money(p.groups[0].totals.currentSubtotal));
});
test('P6 Basket total is Gate 8B merchandise total', () => {
  const items = [item(), item('pressed-puer-presentation', null, 2)], p = project(items, app.views);
  assert.equal(adapt(p).summary.totals.current, money(p.totals.currentSubtotal));
});
test('P7 partial quote has no false group/Basket totals and retains REMOVE', () => {
  const inputs = change(s => { s.products[0].commerce.prices.pop(); }), v = view([item(), item('tea-presentation', 'tea-250')], inputs);
  assert.equal(v.summary.totals, undefined); assert.equal(v.groups[0].totals, undefined);
  assert.equal(rows(v)[0].price, '1 030 ₽'); assert.equal(rows(v)[1].price, undefined); assert.equal(rows(v)[1].canRemove, true);
  assert.match(html(v), /Стоимость уточняется/);
});
test('P8 line overflow never prints zero or an unsafe total', () => {
  const v = view([item('tea-presentation', 'tea-50', Number.MAX_SAFE_INTEGER)]);
  assert.equal(rows(v)[0].price, undefined); assert.equal(v.summary.totals, undefined); assert.match(v.summary.priceStatus, /предел/);
});
test('U1 empty state offers only existing home route and no totals/editor', () => {
  const markup = html(view([])); assert.match(markup, /В корзине пока пусто/); assert.match(markup, /href="\/"/);
  assert.doesNotMatch(markup, /Итого товаров|data-action="edit"|href="\/catalog"/);
});
test('U2 Checkout is a disabled button without backend/action', () => {
  const markup = html(view([item()])); assert.ok(markup.includes(CHECKOUT_UNAVAILABLE));
  assert.match(markup, /<button[^>]*class="checkout"[^>]*disabled=""/);
  assert.doesNotMatch(markup, /href="\/checkout|<form\b|\sformaction=|\saction=/);
});
test('U3 summary uses sum Q, not line count', () => {
  const v = view([item('tea-presentation', 'tea-50', 3), item('tea-presentation', 'tea-100', 2)]);
  assert.equal(v.summary.quantity, 5); assert.equal(rows(v).length, 2);
});
test('U4 single semantic summary follows all Product groups in DOM', () => {
  const markup = html(view([item(), item('pressed-puer-presentation', null)]));
  assert.ok(markup.indexOf('<aside') > markup.lastIndexOf('</section>')); assert.equal((markup.match(/<aside/g) ?? []).length, 1);
});
test('U5 native keyboard controls have distinct accessible row labels', () => {
  const markup = html(view([item(), item('tea-presentation', 'tea-100')]));
  assert.match(markup, /aria-label="Увеличить количество:/); assert.match(markup, /aria-label="Уменьшить количество:/);
  assert.match(markup, /aria-label="Удалить:/); assert.doesNotMatch(markup, /tabindex="-[2-9]|tabindex="[1-9]/);
  const i = item(), c = fixtureCart([i]), { actions } = makeActions(c);
  const editor = renderToStaticMarkup(React.createElement(BasketTransferEditor, { source: i, interactions: actions,
    pending: false, stale: false, onConfirm() {}, onCancel() {} }));
  assert.equal((editor.match(/type="radio"/g) ?? []).length, 4); assert.match(editor, /<legend/);
});
test('U6 removal focus picks next, then previous, then heading fallback', () => {
  assert.equal(focusTarget(['a', 'b', 'c'], 'b', ['a', 'c']), 'c');
  assert.equal(focusTarget(['a', 'b'], 'b', ['a']), 'a'); assert.equal(focusTarget(['a'], 'a', []), undefined);
});
test('U7 local errors render in persistent polite live region', () => {
  const i = item(), markup = html(view([i]), { interaction: { pending: [], errors: { [i.id]: 'Ошибка команды' } } });
  assert.match(markup, /role="status" aria-live="polite" aria-atomic="true">Ошибка команды/);
});
test('U8 responsive CSS has fluid minmax tracks and 16px mobile gutters; geometry verified by smoke separately', () => {
  const css = fs.readFileSync(path.join(root, 'features/basket/ui/Basket.module.css'), 'utf8');
  assert.match(css, /calc\(100% - 32px\)/); assert.match(css, /minmax\(0, 1fr\)/);
  const markup = html(view([item()])); assert.doesNotMatch(markup, /style="[^\"]*width:\s*(1065|1530)px/);
});
test('route actually mounts the application consumer and calls the real shared projector with canonical items', () => {
  const page = load('app/basket/page'); assert.deepEqual(page.metadata.robots, { index: false, follow: false });
  assert.equal(page.default().type, BasketFeature); publicCart = fixtureCart([item()]);
  const before = projectionCalls; const markup = renderToStaticMarkup(React.createElement(BasketFeature));
  assert.ok(projectionCalls > before); assert.match(markup, /1 030 ₽/); assert.match(markup, /data-row-id=/);
  assert.equal(publicCart.calls.length, 0);
});
test('CR-G9B2-01 changes only S37 name and obsolete filesystem assertion', () => {
  const file = 'frontend/scripts/product-input-integration.test.mjs';
  const original = execFileSync('git', ['show', `c2476e81fe5ef0fd3a35ac766bb8cd1dcfbe0f5a:${file}`], { cwd: path.resolve(root, '..'), encoding: 'utf8' });
  const expected = original.replace('S37 Checkout is never enabled and no Basket UI route is created', 'S37 Checkout is never enabled')
    .replace("  assert.equal(fs.existsSync(path.join(frontend, 'app/basket')), false);\n", '');
  assert.equal(fs.readFileSync(path.resolve(root, '../', file), 'utf8').replaceAll('\r\n', '\n'), expected.replaceAll('\r\n', '\n'));
});
test('edge local rejected/throwing command leaves canonical data intact and clears pending', async () => {
  const i = item(), c = fixtureCart([i], undefined, 'pricing-failed'), { actions, states } = makeActions(c);
  assert.equal((await actions.quantity(i, 1)).ok, false); assert.equal(c.items[0], i); assert.deepEqual(states.at(-1).pending, []);
  assert.ok(states.at(-1).errors[i.id]);
  c.setItemQuantity = () => { throw new Error('unavailable transport'); };
  assert.equal((await actions.quantity(i, 1)).reason, 'unexpected-failure');
});
test('edge unmount suppresses stale completion UI, without rolling back canonical success', async () => {
  const gate = latch(), i = item(), c = fixtureCart([i], gate), { actions, states } = makeActions(c);
  const p = actions.quantity(i, 1); actions.disconnect(); const count = states.length; gate.release();
  assert.equal((await p).reason, 'cancelled'); assert.equal(c.items[0].quantity, 2); assert.equal(states.length, count);
});
test('edge transfer racing a pending source SET is blocked; reopening uses new reference', async () => {
  const gate = latch(), i = item(), c = fixtureCart([i], gate), { actions } = makeActions(c);
  const p = actions.quantity(i, 1); assert.equal((await actions.transfer(i, id('tea-presentation', 'tea-100'))).reason, 'busy');
  gate.release(); await p; assert.equal((await actions.transfer(i, id('tea-presentation', 'tea-100'))).reason, 'conflict');
  assert.equal((await actions.transfer(c.items[0], id('tea-presentation', 'tea-100'))).ok, true);
});
test('edge editor source removal never recreates old quantity', async () => {
  const i = item(), c = fixtureCart([i]), { actions } = makeActions(c); c.externalRemove(i.id);
  assert.equal((await actions.transfer(i, id('tea-presentation', 'tea-100'))).reason, 'not-found'); assert.equal(c.items.length, 0);
});
test('edge near safe-integer quantity blocks increase without SET overflow', async () => {
  const i = item('tea-presentation', 'tea-50', Number.MAX_SAFE_INTEGER), c = fixtureCart([i]);
  assert.equal((await makeActions(c).actions.quantity(i, 1)).reason, 'invalid-quantity'); assert.equal(c.calls.length, 0);
});
test('edge missing image, long title and unknown configuration keep safe UI', () => {
  const inputs = change(s => { s.products[0].presentation.image = undefined; s.products[0].presentation.title = 'Очень длинное название '.repeat(20); });
  const markup = html(view([item(), item('tea-presentation', 'foreign')], inputs));
  assert.match(markup, /Изображение отсутствует/); assert.match(markup, /Очень длинное/); assert.match(markup, /foreign/);
});
test('edge invalid policy/badge and stale/missing prices are safely presented', () => {
  const i = item('discount-tea-presentation', 'discount-50');
  for (const mutate of [s => { s.products[1].commerce.policy.status = 'invalid'; },
    s => { s.products[1].commerce.prices[0].policyRevision = 'stale'; },
    s => { s.products[1].commerce.prices.shift(); }]) {
    const v = view([i], change(mutate)); assert.equal(v.summary.totals, undefined); assert.equal(rows(v)[0].canRemove, true);
  }
  const v = view([i], change(s => { s.products[1].commerce.policy.percentage.basisPoints = 20000; }));
  assert.equal(v.groups[0].badge, undefined); assert.equal(rows(v)[0].price, '640 ₽');
});
test('edge no-discount Product has no savings, badge or crossed price', () => {
  const v = view([item()]); assert.equal(v.groups[0].totals.savings, undefined); assert.equal(v.groups[0].badge, undefined);
  assert.doesNotMatch(html(v), /<del|data-discount-badge/);
});
