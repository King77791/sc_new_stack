import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';
import ts from 'typescript';

function load(relative) {
  const filename = fileURLToPath(new URL(relative, import.meta.url));
  const compiled = new Module(filename);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText, filename);
  return compiled.exports;
}
const { toCartWidgetItems } = load('../features/cart/cart-widget.adapter.ts');
const { resolveCartFixturePricing } = load('../features/cart/cart-pricing.fixtures.ts');
const makeItem = (configurationId = 'tea-50', quantity = 1) => ({
  id: JSON.stringify(['tea-presentation', ['selectable', configurationId]]),
  productKey: 'tea-presentation', configuration: { kind: 'selectable', id: configurationId }, quantity,
  presentation: { slug: 'navigation-slug', title: 'Полное название чая', configurationLabel: configurationId === 'tea-50' ? '50 г.' : '100 г.' },
});
const quoted = item => ({ ...item, pricing: resolveCartFixturePricing(item) });
const unavailableLabel = 'Explicit test-only unavailable label';

test('mapping preserves identity, navigation, title, quantity, configuration and exact line total', () => {
  const item = quoted(makeItem('tea-50', 2));
  assert.deepEqual(toCartWidgetItems([item], unavailableLabel), [{
    id: item.id, slug: 'navigation-slug', title: 'Полное название чая',
    displayLinePrice: '2 060 ₽', configurationLabel: '50 г.', quantity: 2,
  }]);
});

test('PRICE-1/2: explicit ready quotes supply the whole line and change with quantity', () => {
  const one = toCartWidgetItems([quoted(makeItem())], unavailableLabel)[0];
  const two = toCartWidgetItems([quoted(makeItem('tea-50', 2))], unavailableLabel)[0];
  assert.equal(one.displayLinePrice, '1 030 ₽');
  assert.equal(two.displayLinePrice, '2 060 ₽');
  assert.equal(one.id, two.id);
  assert.equal(two.configurationLabel, '50 г.');
});

test('PRICE-3: unavailable uses only explicit policy, without stale totals or filtering positions', () => {
  const items = [quoted(makeItem('tea-50', 3))];
  const mapped = toCartWidgetItems(items, unavailableLabel);
  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].quantity, 3);
  assert.equal(mapped[0].displayLinePrice, unavailableLabel);
  assert.equal(items[0].pricing.status, 'unavailable');
});

test('PRICE-4: configurations remain separate, with distinct exact pricing and canonical order', () => {
  const items = [quoted(makeItem('tea-100')), quoted(makeItem('tea-50', 2))];
  const mapped = toCartWidgetItems(items, unavailableLabel);
  assert.equal(mapped.length, 2);
  assert.notEqual(mapped[0].id, mapped[1].id);
  assert.deepEqual(mapped.map(item => item.displayLinePrice), ['1 980 ₽', '2 060 ₽']);
  assert.deepEqual(mapped.map(item => item.id), items.map(item => item.id));
});

test('fixed products preserve optional label and use the same mapping', () => {
  const item = { id: 'fixed-local-id', productKey: 'teapot-pharaoh-presentation', configuration: { kind: 'fixed' },
    quantity: 1, presentation: { slug: 'teapot', title: 'Чайник' } };
  const mapped = toCartWidgetItems([quoted(item)], unavailableLabel)[0];
  assert.equal(mapped.displayLinePrice, '9 300 ₽');
  assert.equal(mapped.configurationLabel, undefined);
  assert.equal(mapped.quantity, 1);
});

test('empty remains empty and adapter never mutates the canonical snapshot', () => {
  const item = quoted(makeItem());
  Object.freeze(item.presentation); Object.freeze(item.pricing); Object.freeze(item);
  const items = Object.freeze([item]);
  assert.equal(toCartWidgetItems(items, unavailableLabel)[0].title, item.presentation.title);
  assert.deepEqual(toCartWidgetItems([], unavailableLabel), []);
});
