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
const { addItem, setItemQuantity, removeItem, getCartItemId, getItem, getQuantity, transferConfiguration } = compiled.exports;

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

const target = (id = 'tea-100', productKey = 'tea-presentation') => ({ productKey, configuration: configuration(id) });
const validate = identity => ({ ok: true, identity, available: true,
  presentation: { slug: 'current-slug', title: 'Current title', configurationLabel: 'Current target' } });
const transfer = (items, source = items[0], destination = target(), resolver = validate, pricing = noQuote) =>
  transferConfiguration(items, { expectedSource: source, target: destination }, resolver, pricing);
const sourceItems = q => add([], input('tea-presentation', configuration('tea-50'), q ?? 2)).items;
const rejected = (transition, original, reason) => {
  assert.deepEqual(transition.result, { ok: false, reason }); assert.equal(transition.items, original);
};

test('F1 transfer replaces source position; fresh target quote/metadata, unrelated objects untouched', () => {
  let items = add([], input('before', fixed)).items;
  items = add(items, input()).items; items = add(items, input('after', fixed)).items;
  const before = JSON.stringify(items), source = items[1];
  for (const item of items) { Object.freeze(item.configuration); Object.freeze(item.presentation); Object.freeze(item.pricing); Object.freeze(item); }
  Object.freeze(items);
  let quotes = 0;
  const result = transfer(items, source, target(), validate, line => {
    quotes++; assert.equal(line.configuration.id, 'tea-100'); assert.equal(line.quantity, 1);
    assert.equal(line.presentation.title, 'Current title'); return { status: 'ready', displayLinePrice: 'target quote' };
  });
  assert.equal(result.result.value.outcome, 'transferred'); assert.equal(result.result.value.movedQuantity, 1);
  assert.deepEqual(result.result.value.source, { productKey: source.productKey, configuration: source.configuration });
  assert.equal(result.items[0], items[0]); assert.equal(result.items[2], items[2]);
  assert.equal(result.items[1], result.result.value.item); assert.equal(quotes, 1);
  assert.equal(getItem(result.items, source.productKey, source.configuration), undefined);
  assert.equal(JSON.stringify(items), before);
});

for (const targetFirst of [true, false]) test(`F1 merge preserves target order (${targetFirst}) and quotes actual resulting quantity`, () => {
  const entries = targetFirst ? [input('tea-presentation', configuration('tea-100'), 3), input()] : [input(), input('tea-presentation', configuration('tea-100'), 3)];
  let items = []; for (const entry of entries) items = add(items, entry).items;
  items = add(items, input('other', fixed)).items;
  const source = getItem(items, 'tea-presentation', configuration('tea-50'));
  const result = transfer(items, source, target(), validate, line => {
    assert.equal(line.quantity, 4); assert.equal(line.presentation.configurationLabel, 'Current target');
    return { status: 'ready', displayLinePrice: 'fresh merged total' };
  });
  assert.equal(result.result.value.outcome, 'merged'); assert.equal(result.result.value.item.quantity, 4);
  assert.deepEqual(result.items.map(item => item.id), items.filter(item => item !== source).map(item => item.id));
  assert.equal(result.items[1], items[2]); assert.equal(result.items[0].pricing.displayLinePrice, 'fresh merged total');
});

test('F1 same identity unchanged bypasses both resolvers and preserves snapshot', () => {
  const items = sourceItems(); const fail = () => { throw Error('must not call'); };
  const result = transfer(items, items[0], target('tea-50'), fail, fail);
  assert.equal(result.items, items); assert.deepEqual(result.result, { ok: true, value: { outcome: 'unchanged', item: items[0] } });
});
test('F1 missing source does not recreate target', () => {
  const source = sourceItems()[0]; const items = [];
  rejected(transfer(items, source), items, 'not-found');
});
for (const [name, mutate] of [
  ['empty source key', s => ({ ...s, productKey: '' })],
  ['inconsistent source ID', s => ({ ...s, id: 'not canonical' })],
  ['malformed source configuration', s => ({ ...s, configuration: { kind: 'other' } })],
]) test(`F1 ${name}`, () => { const items = sourceItems(); rejected(transfer(items, mutate(items[0])), items, 'invalid-identity'); });
for (const destination of [target(''), target('tea-100', ''), target('tea-100', 'other'), { productKey: 'tea-presentation', configuration: { kind: 'other' } }, { productKey: 'tea-presentation', configuration: null }]) {
  test(`F1 malformed/cross-product target ${JSON.stringify(destination)}`, () => {
    const items = sourceItems(); rejected(transfer(items, items[0], destination), items, 'invalid-identity');
  });
}
for (const kind of ['source', 'target', 'inconsistent-target']) test(`F1 rejects affected duplicate/inconsistent identity ${kind}`, () => {
  let items = sourceItems(); const source = items[0];
  if (kind === 'source') items = [...items, { ...source }];
  else { items = add(items, input('tea-presentation', configuration('tea-100'))).items;
    items = [...items, { ...items[1], id: kind === 'target' ? items[1].id : 'wrong stored ID' }]; }
  rejected(transfer(items, source), items, 'invalid-identity');
});
test('F1 overflow rejects entire merge before pricing', () => {
  const items = add(sourceItems(), input('tea-presentation', configuration('tea-100'), Number.MAX_SAFE_INTEGER)).items;
  rejected(transfer(items, items[0], target(), validate, () => { throw Error('not reached'); }), items, 'invalid-quantity');
});
for (const q of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) test(`F1 invalid source quantity ${q}`, () => {
  const source = { ...sourceItems()[0], quantity: q }, items = [source]; rejected(transfer(items), items, 'invalid-quantity');
});
test('F1 source SET, including unchanged quantity, conflicts with editing snapshot', () => {
  const original = sourceItems();
  for (const q of [2, 3]) { const changed = setItemQuantity(original, original[0].id, q, noQuote).items;
    rejected(transfer(changed, original[0]), changed, 'conflict'); }
});
test('F1 clone and REMOVE→ADD same identity cannot bypass source precondition', () => {
  const original = sourceItems(); rejected(transfer(original, { ...original[0] }), original, 'conflict');
  const recreated = sourceItems(); rejected(transfer(recreated, original[0]), recreated, 'conflict');
});
test('F1 duplicate/competing transfer consumes source once', () => {
  const original = sourceItems(), first = transfer(original);
  rejected(transfer(first.items, original[0]), first.items, 'not-found');
  rejected(transfer(first.items, original[0], target('tea-200')), first.items, 'not-found');
  assert.equal(first.items[0].quantity, 2);
});
test('F1 unrelated mutation preserves source precondition', () => {
  const original = sourceItems(), items = add(original, input('unrelated', fixed)).items;
  assert.equal(transfer(items, original[0]).result.ok, true);
});
test('F1 races B/D: target ADD/SET after editor open uses actual quantity', () => {
  const original = sourceItems(), source = original[0];
  const added = add(original, input('tea-presentation', configuration('tea-100'), 3)).items;
  const changed = setItemQuantity(added, added[1].id, 5, noQuote).items;
  assert.equal(transfer(added, source).result.value.item.quantity, 5);
  assert.equal(transfer(changed, source).result.value.item.quantity, 7);
});
test('F1 race H: source REMOVE first fails transfer; transfer first makes stale SET/REMOVE fail', () => {
  const original = sourceItems(), source = original[0], removed = removeItem(original, source.id).items;
  rejected(transfer(removed, source), removed, 'not-found');
  const moved = transfer(original).items;
  assert.equal(setItemQuantity(moved, source.id, 3, noQuote).result.reason, 'not-found');
  assert.equal(removeItem(moved, source.id).result.reason, 'not-found');
});
for (const existing of [false, true]) test(`F1 unavailable target (existing=${existing}) preserves both lines`, () => {
  let items = sourceItems(); if (existing) items = add(items, input('tea-presentation', configuration('tea-100'))).items;
  rejected(transfer(items, items[0], target(), id => ({ ...validate(id), available: false })), items, 'unavailable');
});
test('F1 unavailable source is not a restriction on an available target', () => {
  const items = sourceItems(); assert.equal(transfer(items).result.ok, true); // source availability is not Cart truth
});
test('F1 missing/current invalid validation input fails closed', () => {
  const items = sourceItems();
  rejected(transferConfiguration(items, { expectedSource: items[0], target: target() }, undefined, noQuote), items, 'validation-unavailable');
  rejected(transfer(items, items[0], target(), () => ({ ok: false, reason: 'validation-unavailable' })), items, 'validation-unavailable');
  rejected(transfer(items, items[0], target(), () => ({ ...validate(target()), presentation: {} })), items, 'validation-unavailable');
  rejected(transfer(items, items[0], target(), () => validate(target('other'))), items, 'invalid-identity');
});
test('F1 expected resolver failure is forwarded; unexpected exception leaves snapshot unchanged', () => {
  const items = sourceItems();
  rejected(transfer(items, items[0], target(), () => ({ ok: false, reason: 'invalid-identity' })), items, 'invalid-identity');
  rejected(transfer(items, items[0], target(), () => { throw Error('validation failed'); }), items, 'unexpected-failure');
});
test('F1 missing quote clears stale prices; throwing quote rejects atomically', () => {
  const items = addItem([], input(), () => ({ status: 'ready', displayLinePrice: 'stale source' })).items;
  assert.deepEqual(transfer(items).result.value.item.pricing, { status: 'unavailable' });
  rejected(transfer(items, items[0], target(), validate, () => { throw Error('quote'); }), items, 'pricing-failed');
});

test('F1 merged unavailable quote does not reuse stale target total', () => {
  const items = addItem(sourceItems(), input('tea-presentation', configuration('tea-100'), 3), () => ({ status: 'ready', displayLinePrice: 'old target total' })).items;
  const result = transfer(items);
  assert.equal(result.result.value.item.quantity, 5);
  assert.deepEqual(result.result.value.item.pricing, { status: 'unavailable' });
  assert.equal(items[1].pricing.displayLinePrice, 'old target total');
});
test('F1 fixed source/target cannot become a configurable transfer', () => {
  const items = add([], input('tea-presentation', fixed)).items;
  rejected(transfer(items), items, 'invalid-identity');
  const selectable = sourceItems();
  rejected(transfer(selectable, selectable[0], { productKey: 'tea-presentation', configuration: fixed }), selectable, 'invalid-identity');
});
