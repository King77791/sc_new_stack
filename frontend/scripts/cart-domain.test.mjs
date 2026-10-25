// Node's built-in test runner and the project's existing TypeScript compiler.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';
import ts from 'typescript';

const filename = fileURLToPath(new URL('../features/cart/cart.model.ts', import.meta.url));
const compiled = new Module(filename);
compiled.filename = filename;
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
}).outputText, filename);
const { addItem, setItemQuantity, removeItem, getCartItemId, getItem, getQuantity } = compiled.exports;

const fixed = { kind: 'fixed' };
const configuration = id => ({ kind: 'selectable', id });
const input = (productKey = 'tea-presentation', option = configuration('tea-50'), quantity = 1) => ({
  productKey, configuration: option, quantity,
  presentation: { slug: productKey, title: 'Да Хун Пао', configurationLabel: option.kind === 'fixed' ? undefined : '50 г.' },
});
const noQuote = () => ({ status: 'unavailable' });
const add = (items, entry) => addItem(items, entry, noQuote);

test('scenarios A–G: merge, separate configurations, fixed products and complete removal', () => {
  let items = [];
  const verify = (count, hasItems) => {
    assert.equal(items.length, count);
    assert.equal(items.length > 0, hasItems);
  };
  items = add(items, input()).items;
  verify(1, true); // A
  assert.equal(getQuantity(items, 'tea-presentation', configuration('tea-50')), 1);
  items = add(items, input('tea-presentation', configuration('tea-100'))).items;
  verify(2, true); // B
  assert.equal(getQuantity(items, 'tea-presentation', configuration('tea-100')), 1);
  items = add(items, input()).items;
  verify(2, true); // C
  assert.equal(getQuantity(items, 'tea-presentation', configuration('tea-50')), 2);
  items = add(items, input('pressed-puer-presentation', fixed)).items;
  verify(3, true); // D
  items = add(items, input('teapot-pharaoh-presentation', fixed)).items;
  verify(4, true); // E
  items = removeItem(items, getCartItemId(input())).items;
  verify(3, true); // F
  assert.equal(getQuantity(items, 'tea-presentation', configuration('tea-50')), 0);
  assert.equal(getQuantity(items, 'tea-presentation', configuration('tea-100')), 1);
  for (const item of items) items = removeItem(items, item.id).items;
  verify(0, false); // G
  assert.deepEqual(items, []);
});

test('fixed ADD merges and reports added quantity separately from resulting quantity', () => {
  const first = add([], input('teapot', fixed));
  const second = add(first.items, input('teapot', fixed));
  assert.equal(second.items.length, 1);
  assert.equal(second.items[0].quantity, 2);
  assert.equal(second.result.value.addedQuantity, 1);
  assert.equal(second.result.value.item.presentation.title, 'Да Хун Пао');
});

test('SET is absolute, preserves order, and REMOVE deletes an entire line', () => {
  let items = add([], input('a', fixed, 3)).items;
  items = add(items, input('b', fixed)).items;
  items = setItemQuantity(items, items[0].id, 1, noQuote).items;
  assert.deepEqual(items.map(item => [item.productKey, item.quantity]), [['a', 1], ['b', 1]]);
  items = removeItem(items, items[0].id).items;
  assert.deepEqual(items.map(item => item.productKey), ['b']);
});

for (const quantity of [0, -1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
  test(`invalid quantity ${quantity} leaves ADD and SET state untouched`, () => {
    const items = add([], input()).items;
    for (const transition of [add(items, input('another', fixed, quantity)), setItemQuantity(items, items[0].id, quantity, noQuote)]) {
      assert.equal(transition.result.ok, false);
      assert.equal(transition.result.reason, 'invalid-quantity');
      assert.equal(transition.items, items);
    }
  });
}

test('ADD rejects safe-integer overflow after merge', () => {
  const items = add([], input('a', fixed, Number.MAX_SAFE_INTEGER)).items;
  assert.equal(add(items, input('a', fixed)).result.reason, 'invalid-quantity');
});

test('missing SET and REMOVE fail deterministically without implicit creation', () => {
  const items = add([], input()).items;
  for (const transition of [setItemQuantity(items, 'missing', 1, noQuote), removeItem(items, 'missing')]) {
    assert.equal(transition.result.reason, 'not-found');
    assert.equal(transition.items, items);
  }
});

test('repeated ADD refreshes snapshot and pricing without changing ID or order', () => {
  const items = add(add([], input('a', fixed)).items, input('b', fixed)).items;
  const refreshed = addItem(items, {
    ...input('a', fixed), presentation: { slug: 'new-slug', title: 'New title', configurationLabel: 'New label' },
  }, item => {
    assert.equal(item.quantity, 2); // quote the resulting line, not the added quantity
    return { status: 'ready', displayLinePrice: 'explicit line total' };
  }).items;
  assert.deepEqual(refreshed.map(item => item.id), items.map(item => item.id));
  assert.deepEqual(refreshed[0].presentation, { slug: 'new-slug', title: 'New title', configurationLabel: 'New label' });
  assert.equal(refreshed[0].pricing.displayLinePrice, 'explicit line total');
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].presentation.title, 'Да Хун Пао');
});

test('selector isolation and identity exclude quantity, display snapshot and pricing', () => {
  let items = add([], input()).items;
  items = add(items, input('tea-presentation', configuration('tea-100'), 3)).items;
  assert.equal(getQuantity(items, 'tea-presentation', configuration('tea-50')), 1);
  assert.equal(getQuantity(items, 'tea-presentation', configuration('tea-100')), 3);
  assert.equal(getQuantity(items, 'tea-presentation', configuration('tea-200')), 0);
  assert.equal(getQuantity(items, 'other-product', configuration('tea-50')), 0);
  assert.equal(getItem(items, 'tea-presentation', fixed), undefined);
  assert.notEqual(items[0].id, items[1].id);
  assert.equal(getCartItemId({ ...input(), quantity: 8, presentation: { title: 'Another' } }), items[0].id);
});

test('structured identity is deterministic and unambiguous for delimiter-like keys', () => {
  const identities = [
    input('a-b', configuration('c')), input('a', configuration('b-c')),
    input('a', fixed), input('a', configuration('fixed')),
    input('["a"]', configuration('"],[')), input('а/чай', configuration('50:г')),
  ];
  const ids = identities.map(getCartItemId);
  assert.equal(new Set(ids).size, identities.length);
  assert.deepEqual(identities.map(getCartItemId), ids);
});

test('unknown pricing never preserves a stale previous total', () => {
  const first = addItem([], input(), () => ({ status: 'ready', displayLinePrice: '1 030 ₽' }));
  const changed = setItemQuantity(first.items, first.items[0].id, 20, noQuote);
  assert.equal(changed.items[0].quantity, 20);
  assert.deepEqual(changed.items[0].pricing, { status: 'unavailable' });
});

test('quote failure is atomic and returns failure instead of successful ADD', () => {
  const items = add([], input()).items;
  const fail = () => { throw new Error('local quote failed'); };
  for (const transition of [addItem(items, input(), fail), setItemQuantity(items, items[0].id, 2, fail)]) {
    assert.equal(transition.result.reason, 'pricing-failed');
    assert.equal(transition.items, items);
  }
});

test('input snapshots are copied and empty identity is rejected', () => {
  const entry = input();
  const items = add([], entry).items;
  entry.presentation.title = 'Changed outside Cart';
  entry.configuration.id = 'changed';
  assert.equal(items[0].presentation.title, 'Да Хун Пао');
  assert.equal(items[0].configuration.id, 'tea-50');
  assert.equal(add(items, input('')).result.reason, 'invalid-identity');
  assert.equal(add(items, input('a', configuration(''))).result.reason, 'invalid-identity');
});
