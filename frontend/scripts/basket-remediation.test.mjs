import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
function loader(overrides = {}) {
  const cache = new Map();
  function load(relative) {
    relative = relative.replaceAll('\\', '/').replace(/\.(ts|tsx)$/, '');
    if (overrides[relative]) return overrides[relative];
    if (cache.has(relative)) return cache.get(relative).exports;
    const filename = ['.ts', '.tsx'].map(ext => path.join(root, relative + ext)).find(fs.existsSync);
    assert.ok(filename, relative);
    const compiled = new Module(filename); cache.set(relative, compiled);
    compiled.require = name => {
      if (overrides[name]) return overrides[name];
      if (name.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) };
      if (name === 'next/link') return function Link({ children, ...props }) { return React.createElement('a', props, children); };
      if (name === 'next/image') return function Image(props) { return React.createElement('img', props); };
      if (name.startsWith('@/')) return load(name.slice(2));
      if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name)));
      return Module.createRequire(filename)(name);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText, filename);
    return compiled.exports;
  }
  return load;
}
const load = loader();
const { reconcileBasketGroupOrder: reconcile } = load('features/basket/model/basket-group-order');
const { applicationProductInputs: app } = load('features/product-input/product-input.application');
const model = load('features/cart/cart.model');
const { projectProductInputBasket: project } = load('features/product-input/product-input.basket');
const { toBasketView: adapt, basketFocusTarget } = load('features/basket/adapters/basket-ui.adapter');
const { toCartWidgetItems: widget } = load('features/cart/cart-widget.adapter');
const { BasketView } = load('features/basket/ui/BasketView');
const { CartWidget } = load('features/cart/CartWidget/CartWidget');
const { BasketPromoCode } = load('features/basket/ui/BasketPromoCode');
const identity = (productKey = 'tea-presentation', id = 'tea-50') => ({ productKey, configuration: { kind: 'selectable', id } });
function item(productKey = 'tea-presentation', id = 'tea-50', quantity = 1) {
  return model.addItem([], { ...identity(productKey, id), quantity,
    presentation: { title: productKey, slug: productKey, configurationLabel: id } }, app.resolvePricing).result.value.item;
}
const A = item(), A100 = item('tea-presentation', 'tea-100'), B = item('discount-tea-presentation', 'discount-50'), C = item('long-title-tea-presentation', 'long-50');
const keys = items => adapt(project(items, app.views)).groups.map(group => group.productKey);
const initial = [A, B, C, A100], originalOrder = keys(initial);
const markup = view => renderToStaticMarkup(React.createElement(BasketView, { view,
  interaction: { pending: [], errors: {} }, headingRef: { current: null }, onAction() {}, onEdit() {} }));
const view = (items = [A], inputs = app.views) => adapt(project(items, inputs));
const walk = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk)
  : [node, ...walk(node.props?.children)];

test('T1/T2 REMOVE first configuration retains UI order while canonical order changes', () => {
  const before = JSON.stringify(initial), next = model.removeItem(initial, A.id).items;
  assert.notDeepEqual(keys(next), originalOrder);
  assert.deepEqual(reconcile(originalOrder, keys(next)), originalOrder);
  assert.deepEqual(next, [B, C, A100]); assert.equal(JSON.stringify(initial), before);
});
test('REMOVE later configuration retains order; last configuration removes only its group', () => {
  const next = model.removeItem(initial, A100.id).items;
  assert.deepEqual(reconcile(originalOrder, keys(next)), originalOrder);
  assert.deepEqual(reconcile(originalOrder, keys(model.removeItem(next, A.id).items)), [B.productKey, C.productKey]);
});
test('T3 F1 merge preserves UI order, canonical target position, actual Q and fresh objects', () => {
  const result = model.transferConfiguration(initial, { expectedSource: A, target: A100 }, app.resolveTransferTarget, app.resolvePricing);
  assert.equal(result.result.ok, true); assert.equal(result.result.value.outcome, 'merged');
  assert.equal(result.items[2].quantity, 2); assert.notEqual(result.items[2], A100);
  assert.deepEqual(reconcile(originalOrder, keys(result.items)), originalOrder);
  assert.equal(result.items[0], B); assert.equal(result.items[1], C);
});
test('T3 transfer to absent target retains canonical source position and UI group order', () => {
  const result = model.transferConfiguration(initial, { expectedSource: A, target: identity('tea-presentation', 'tea-200') }, app.resolveTransferTarget, app.resolvePricing);
  assert.equal(result.result.ok, true); assert.equal(result.result.value.outcome, 'transferred');
  assert.equal(result.items[0].configuration.id, 'tea-200');
  assert.deepEqual(reconcile(originalOrder, keys(result.items)), originalOrder);
});
test('deleted group re-adds at the end, clearing forgets history', () => {
  const remaining = reconcile(originalOrder, [B.productKey, C.productKey]);
  assert.deepEqual(reconcile(remaining, originalOrder), [B.productKey, C.productKey, A.productKey]);
  assert.deepEqual(reconcile(originalOrder, []), []);
  assert.deepEqual(reconcile([], [C.productKey, A.productKey]), [C.productKey, A.productKey]);
});
test('reconciliation is pure and idempotent on frozen keys, including duplicate inputs', () => {
  const previous = Object.freeze(['a', 'b']), incoming = Object.freeze(['b', 'a', 'a']);
  assert.equal(reconcile(previous, incoming), previous);
  const result = reconcile(previous, ['c', 'b', 'b']);
  assert.deepEqual(result, ['b', 'c']); assert.equal(reconcile(result, ['c', 'b']), result);
  assert.deepEqual(previous, ['a', 'b']); assert.deepEqual(incoming, ['b', 'a', 'a']);
});

// Small hook runner exercises real component outputs/events and render-phase retries.
// It is not a DOM renderer or proof of browser Strict Mode/focus behavior.
function hookRunner(moduleName, exportName, overrides = {}) {
  const slots = []; let cursor = 0, dirty = false, tree;
  const hooks = { ...React, useEffect() {}, useId() { return `test-${cursor++}`; },
    useState(initialValue) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initialValue === 'function' ? initialValue() : initialValue;
      return [slots[index], value => { const next = typeof value === 'function' ? value(slots[index]) : value;
        if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true; } }];
    },
    useRef(value) { const index = cursor++; if (!(index in slots)) slots[index] = { current: value }; return slots[index]; },
  };
  const Component = loader({ ...overrides, react: hooks })(moduleName)[exportName];
  return { render() { let retries = 0; do { cursor = 0; dirty = false; tree = Component(); assert.ok(++retries < 10); } while (dirty); return tree; } };
}
test('BasketFeature keeps only mount-local order and uses fresh canonical lines on re-render', () => {
  let current = initial;
  const runner = hookRunner('features/basket/ui/BasketFeature', 'BasketFeature', {
    'features/cart/CartProvider': { useCart: () => ({ items: current, getItem: (p, c) => model.getItem(current, p, c) }) },
  });
  const output = () => runner.render().props.children.props.view;
  assert.deepEqual(output().groups.map(g => g.productKey), originalOrder);
  current = model.removeItem(current, A.id).items;
  const next = output(); assert.deepEqual(next.groups.map(g => g.productKey), originalOrder);
  assert.equal(next.groups[0].configurations[0].item, A100);
  current = model.setItemQuantity(current, A100.id, 5, app.resolvePricing).items;
  assert.equal(output().groups[0].configurations[0].item, current[2]);
  assert.equal(output().groups[0].configurations[0].item.quantity, 5);
  current = []; assert.deepEqual(output().groups, []);
  current = [C, A]; assert.deepEqual(output().groups.map(g => g.productKey), [C.productKey, A.productKey]);
});
test('separate BasketFeature mounts start from current projection, without shared order history', () => {
  const make = items => hookRunner('features/basket/ui/BasketFeature', 'BasketFeature', {
    'features/cart/CartProvider': { useCart: () => ({ items, getItem: (p, c) => model.getItem(items, p, c) }) },
  }).render().props.children.props.view.groups.map(g => g.productKey);
  assert.deepEqual(make(initial), originalOrder);
  assert.deepEqual(make([B, C, A100]), [B.productKey, C.productKey, A.productKey]);
});
test('real React StrictMode server render converges and preserves canonical items on repeated renders', () => {
  const before = JSON.stringify(initial);
  const { BasketFeature } = loader({ 'features/cart/CartProvider': {
    useCart: () => ({ items: initial, getItem: (p, c) => model.getItem(initial, p, c) }),
  } })('features/basket/ui/BasketFeature');
  for (let index = 0; index < 2; index++) {
    const html = renderToStaticMarkup(React.createElement(React.StrictMode, null, React.createElement(BasketFeature)));
    const rendered = [...html.matchAll(/data-product-key="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(rendered, originalOrder);
  }
  assert.equal(JSON.stringify(initial), before);
});
test('T18 focus fallback follows reconciled visible row order, next then previous', () => {
  const previous = [A.id, A100.id, B.id, C.id];
  assert.equal(basketFocusTarget(previous, A.id, [A100.id, B.id, C.id]), A100.id);
  assert.equal(basketFocusTarget(previous, A100.id, [B.id, C.id]), B.id);
  assert.equal(basketFocusTarget(previous, C.id, [A100.id, B.id]), B.id);
});

let pathname = '/';
const { FloatingCartWidget } = loader({ 'next/navigation': { usePathname: () => pathname } })('app/FloatingCartWidget');
for (const route of ['/basket', '/basket/', '/basket/nested', '/checkout', '/checkout/', '/checkout/payment']) {
  test(`T4/T5 route boundary hides ${route}`, () => { pathname = route; assert.equal(FloatingCartWidget({ children: 'widget' }), null); });
}
for (const route of ['/', '/product/tea', '/checkout-info', '/basket-info']) {
  test(`T6 route boundary preserves consumer ${route}`, () => {
    pathname = route; const consumer = React.createElement('aside'); assert.equal(FloatingCartWidget({ children: consumer }), consumer);
  });
}
test('T7/T8 six canonical lines stay six Widget rows/count and eight Basket units', () => {
  const items = [item('tea-presentation', 'tea-50', 2), item('tea-presentation', 'tea-100', 2), B,
    item('discount-tea-presentation', 'discount-100'), C, item('long-title-tea-presentation', 'long-100')];
  const rows = widget(items, 'Цена недоступна', app.widgetAvailability);
  const html = renderToStaticMarkup(React.createElement(CartWidget, { items: rows, onRemoveItem() {} }));
  assert.equal(rows.length, 6); assert.match(html, /6 позиций/); assert.equal((html.match(/<li\b/g) ?? []).length, 6);
  assert.equal(view(items).summary.quantity, 8); assert.equal(view(items).groups.length, 3);
});
test('T9 default promo is collapsed with accessible stable panel and input IDs', () => {
  const html = renderToStaticMarkup(React.createElement(BasketPromoCode));
  assert.match(html, /aria-expanded="false"/); assert.match(html, /aria-controls="[^"]+-panel"/);
  assert.match(html, /id="[^"]+-panel"[^>]*hidden=""/); assert.match(html, /<label for="[^"]+-input">Промокод/);
});
test('T10/T11 promo toggles, edits text, preserves value and IDs until unmount', () => {
  const runner = hookRunner('features/basket/ui/BasketPromoCode', 'BasketPromoCode');
  let tree = runner.render(), nodes = walk(tree), trigger = nodes.find(n => n.props?.['aria-controls']);
  const panelId = trigger.props['aria-controls']; assert.equal(trigger.props['aria-expanded'], false);
  trigger.props.onClick(); nodes = walk(runner.render());
  assert.equal(nodes.find(n => n.props?.id === panelId).props.hidden, false);
  nodes.find(n => n.type === 'input').props.onChange({ currentTarget: { value: 'TEST CODE' } });
  nodes = walk(runner.render()); nodes.find(n => n.props?.['aria-controls']).props.onClick();
  nodes = walk(runner.render()); assert.equal(nodes.find(n => n.type === 'input').props.value, 'TEST CODE');
  nodes.find(n => n.props?.['aria-controls']).props.onClick();
  nodes = walk(runner.render()); assert.equal(nodes.find(n => n.props?.id === panelId).props.hidden, false);
  assert.equal(nodes.find(n => n.type === 'input').props.value, 'TEST CODE');
  const fresh = hookRunner('features/basket/ui/BasketPromoCode', 'BasketPromoCode');
  assert.equal(walk(fresh.render()).find(n => n.type === 'input').props.value, '');
});
test('T12 Enter is prevented and Apply is disabled without a submission handler', () => {
  const runner = hookRunner('features/basket/ui/BasketPromoCode', 'BasketPromoCode');
  const nodes = walk(runner.render()); let prevented = false;
  nodes.find(n => n.type === 'input').props.onKeyDown({ key: 'Enter', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  const apply = nodes.find(n => n.type === 'button' && n.props['aria-label'] === 'Применить промокод');
  assert.equal(apply.props['aria-label'], 'Применить промокод');
  assert.equal(apply.props.disabled, true); assert.equal(apply.props.type, 'button'); assert.equal(apply.props.onClick, undefined);
  assert.equal(nodes.some(n => n.type === 'form'), false);
});
test('T13-T16 summary uses sum-Q copy, merchandise total, disabled actions and promo before Checkout', () => {
  const html = markup(view([A]));
  assert.match(html, /Товары, шт\./); assert.match(html, /<dt>Итого:<\/dt>/); assert.match(html, /Стоимость товаров без доставки/);
  assert.match(html, /<button[^>]*class="checkout"[^>]*disabled="">Оформление заказа пока недоступно/);
  assert.match(html, /<button[^>]*class="share"[^>]*disabled="">Поделиться корзиной/);
  assert.ok(html.indexOf('Есть промокод?') < html.indexOf('Оформление заказа пока недоступно'));
  assert.doesNotMatch(html, /К оплате|Итого к оплате|<form\b|href="\/checkout/);
});
test('no-discount and discount Summary use prepared values without reapplying percentages', () => {
  assert.doesNotMatch(markup(view([A])), /<dt>Экономия/);
  const v = view([item('discount-tea-presentation', 'discount-50', 4)]), html = markup(v);
  assert.match(html, /<dt>Экономия<\/dt><dd>840 ₽/); assert.match(html, /<dt>Итого:<\/dt><dd>2 560 ₽/);
  assert.equal(v.summary.totals.original, '3 400 ₽');
});
test('partial, stale and overflow pricing never present a full Summary total', () => {
  const { prepareProductInputs } = load('features/product-input/product-input.validation');
  const { createProductInputSnapshot } = load('features/product-input/product-input.snapshot');
  for (const mutate of [s => { s.products[0].commerce.prices.pop(); }, s => {
    s.products[0].commerce.prices[0].context = { ...s.context, pricingRevision: 'stale' };
  }]) {
    const snapshot = structuredClone(app.views.snapshot); mutate(snapshot);
    const v = view([A, item('tea-presentation', 'tea-250')], prepareProductInputs(createProductInputSnapshot(snapshot)));
    assert.equal(v.summary.totals, undefined); assert.match(markup(v), /<dt>Итого:<\/dt><dd>Стоимость уточняется/);
  }
  const v = view([item('tea-presentation', 'tea-50', Number.MAX_SAFE_INTEGER)]);
  assert.equal(v.summary.totals, undefined); assert.match(markup(v), /превышает допустимый предел/);
  assert.doesNotMatch(markup(view([])), /Есть промокод|Поделиться корзиной|<aside/);
});
