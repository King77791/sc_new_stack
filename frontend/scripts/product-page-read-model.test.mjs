import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../', import.meta.url));
const cache = new Map();
const notFound = new Error('test-only Next notFound sentinel');
function load(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = new Module(filename); cache.set(filename, compiled);
  compiled.require = name => {
    if (name.endsWith('.css')) return { __esModule: true, default: {} };
    if (name === 'next/navigation') return { notFound() { throw notFound; } };
    if (name === 'next/image') return { __esModule: true, default: props => {
      const image = { ...props }; delete image.fill; delete image.priority; return React.createElement('img', image);
    } };
    if (name.startsWith('.') || name.startsWith('@/')) {
      const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
      return load([base + '.ts', base + '.tsx'].find(file => fs.existsSync(file)));
    }
    return Module.createRequire(filename)(name);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, filename);
  return compiled.exports;
}
const feature = name => load(`features/product-input/product-input.${name}.ts`);
const { applicationProductInputs: app } = feature('application');
const { createProductInputSnapshot: freeze } = feature('snapshot');
const { prepareProductInputs: prepare } = feature('validation');
const { productInputCards: cards } = feature('presentation');
const { lookupProductPage: lookup } = load('features/product-page/product-page.read-model.ts');
const { projectProductDetail } = feature('detail');
const route = load('app/product/[slug]/page.tsx');
const key = 'tea-presentation';
const copy = () => structuredClone(app.views.snapshot);
const changed = mutate => { const snapshot = copy(); mutate(snapshot); return prepare(freeze(snapshot)); };
const found = (inputs = app.views, slug = key) => { const result = lookup(inputs, slug); assert.equal(result.status, 'found'); return result.product; };

test('PDP resolves every shared record including excluded preorder, not only Cards', () => {
  assert.equal(app.cards.length, 6);
  for (const raw of app.views.snapshot.products) assert.equal(found(app.views, raw.presentation.slug).productKey, raw.productKey);
  const preorder = found(app.views, 'preorder-tea-presentation');
  assert.equal(preorder.availability, 'not-purchasable');
  assert.ok(preorder.configurations.every(option => !option.canAdd));
});
test('PDP retains stable standard IDs, explicit availability and unit quote', () => {
  const product = found();
  assert.deepEqual(product.configurations.map(option => [option.configuration.id, option.weightGrams, option.label]),
    [50, 100, 200, 250].map(weight => [`tea-${weight}`, weight, `${weight} г.`]));
  assert.equal(product.configurations[0].quote.currentUnit.minor, 103000);
  assert.equal(product.configurations[0].quote.binding.quantity, 1);
  assert.equal(product.configurations[0].canAdd, true);
  const partial = found(app.views, 'availability-tea-presentation');
  assert.equal(partial.availability, 'mixed');
  assert.deepEqual(partial.configurations.map(option => option.availability), ['available', 'available', 'unavailable', 'unavailable']);
});
test('PDP fixed Tea and ceramics have a single fixed configuration without invented physical data', () => {
  for (const slug of ['pressed-puer-presentation', 'teapot-pharaoh-presentation']) {
    const product = found(app.views, slug);
    assert.equal(product.configurations.length, 1);
    assert.deepEqual(product.configurations[0].configuration, { kind: 'fixed' });
    assert.equal(product.detail, undefined);
  }
});
test('PDP discount is explicit O/C, never recomputed from percentage', () => {
  const quote = found(app.views, 'discount-tea-presentation').configurations[0].quote;
  assert.equal(quote.status, 'ready'); assert.equal(quote.currentUnit.minor, 64000);
  assert.equal(quote.originalUnit.minor, 85000); assert.equal(quote.showOriginal, true);
});
test('PDP unknown and invalid slugs do not alias or fall back to a title', () => {
  for (const slug of ['missing', '', '../tea-presentation', 'tea/presentation', '%74ea-presentation', ' tea-presentation', 'tea-presentation?', '\ud800', 'Золотистый чай'])
    assert.equal(lookup(app.views, slug).status, 'not-found', slug);
});
test('PDP rejects duplicate slug, duplicate key and missing/mismatched essential identity', () => {
  const duplicate = changed(snapshot => snapshot.products.push(structuredClone(snapshot.products[0])));
  assert.equal(lookup(duplicate, key).status, 'ambiguous');
  for (const mutate of [raw => { raw.productKey = ''; }, raw => { raw.productKey = 'other-key'; }, raw => { raw.presentation.title = ''; }]) {
    const inputs = changed(snapshot => mutate(snapshot.products[0]));
    assert.equal(lookup(inputs, key).status, 'invalid-identity');
  }
  const inputs = changed(snapshot => { snapshot.products[1].productKey = key; });
  assert.equal(lookup(inputs, key).status, 'invalid-identity');
});
test('PDP missing generation fails closed', () => {
  assert.equal(lookup(prepare(null), key).status, 'input-unavailable');
});
test('PDP known fixed unavailable remains resolvable even when Card projection excludes it', () => {
  const slug = 'teapot-pharaoh-presentation';
  const inputs = changed(snapshot => { snapshot.products.find(product => product.productKey === slug).availability[0].status = 'unavailable'; });
  assert.ok(!cards(inputs).some(card => card.slug === slug));
  const product = found(inputs, slug);
  assert.equal(product.availability, 'unavailable'); assert.equal(product.configurations[0].canAdd, false);
});
test('PDP missing availability is unknown, never confirmed stock', () => {
  const inputs = changed(snapshot => { snapshot.products[0].availability = []; });
  assert.equal(found(inputs).availability, 'unknown');
  assert.ok(found(inputs).configurations.every(option => !option.canAdd));
});
for (const [name, mutate, expected] of [
  ['missing', raw => { raw.commerce.prices = []; }, 'unavailable'],
  ['invalid', raw => { raw.commerce.prices[0].currentUnit.minor = -1; }, 'invalid-pricing-data'],
  ['stale', raw => { raw.commerce.prices[0].context = { ...raw.commerce.prices[0].context, pricingRevision: 'old' }; }, 'stale'],
]) test(`PDP ${name} price preserves Product without fabricated money or purchase permission`, () => {
  const inputs = changed(snapshot => mutate(snapshot.products[0]));
  const option = found(inputs).configurations[0];
  assert.equal(option.quote.status, expected); assert.equal(option.quote.currentUnit, undefined); assert.equal(option.canAdd, false);
});
test('PDP invalid configurations are not repaired', () => {
  const inputs = changed(snapshot => { snapshot.products[0].purchase.definitions.pop(); });
  const product = found(inputs); assert.equal(product.configurations.length, 0); assert.equal(product.availability, 'unknown');
});
test('PDP optional detail roundtrips detached, immutable and without Card changes', () => {
  const snapshot = copy(), baseline = cards(prepare(freeze(copy())));
  snapshot.products[0].detail = { provenance: 'demonstration-fixture', gallery: [snapshot.products[0].presentation.image],
    characteristics: [{ key: 'material', label: 'Test label', value: 'Test value' }],
    brewing: { preparingTime: 'Test presentation' }, physical: { fixedWeightGrams: 357, volumeMl: 180 }, relatedProductKeys: ['teapot-pharaoh-presentation'] };
  const inputs = prepare(freeze(snapshot)), product = found(inputs);
  assert.deepEqual(product.detail, inputs.snapshot.products[0].detail);
  assert.notEqual(product.detail, inputs.snapshot.products[0].detail);
  assert.ok(Object.isFrozen(product.detail.gallery[0]));
  assert.deepEqual(cards(inputs), baseline);
});
test('PDP invalid optional detail cannot poison commerce or inject State/price/identity', () => {
  for (const detail of [{}, { provenance: 'approved' }, { provenance: 'demonstration-fixture', states: ['energy'] },
    { provenance: 'demonstration-fixture', physical: { volumeMl: '180' } },
    { provenance: 'demonstration-fixture', gallery: [{ src: 'https://example.org/a.png', alt: '', width: 1, height: 1 }] }]) {
    assert.deepEqual(projectProductDetail(detail, key).diagnostics, ['invalid-detail']);
    const product = found(changed(snapshot => { snapshot.products[0].detail = detail; }));
    assert.equal(product.detail, undefined); assert.equal(product.configurations[0].canAdd, true);
  }
});
test('PDP does not promote fixture moods or invent Gift Set/SKU/category metadata', () => {
  const product = found();
  assert.deepEqual(product.states, []); assert.equal(product.statesStatus, 'approved-source-unavailable');
  assert.equal(product.sku, undefined); assert.equal(product.category, undefined);
  assert.equal(lookup(app.views, 'gift-set').status, 'not-found');
  const inputs = changed(snapshot => { snapshot.products[0].presentation.kind = 'gift-set'; });
  assert.equal(lookup(inputs, key).status, 'invalid-identity');
});
test('PDP projection is serializable and does not mutate or freeze additional shared input', () => {
  const before = JSON.stringify(app.views), cardsBefore = JSON.stringify(app.cards);
  const product = found(); assert.deepEqual(JSON.parse(JSON.stringify(product)), product);
  assert.equal(JSON.stringify(app.views), before); assert.equal(JSON.stringify(app.cards), cardsBefore);
  assert.ok(Object.isFrozen(product));
  const mutableViews = structuredClone(app.views);
  const mutableBefore = JSON.stringify(mutableViews);
  lookup(mutableViews, key);
  assert.equal(JSON.stringify(mutableViews), mutableBefore);
  assert.equal(Object.isFrozen(mutableViews.products[0].weight.configurations[0]), false);
});
test('PDP missing optional metadata/image preserves identity and exposes no invented replacement', () => {
  const inputs = changed(snapshot => {
    delete snapshot.products[0].presentation.image;
    delete snapshot.products[0].presentation.country;
    delete snapshot.products[0].presentation.origin;
    delete snapshot.products[0].detail;
  });
  const product = found(inputs);
  assert.equal(product.productKey, key); assert.equal(product.image, undefined);
  assert.equal(product.country, undefined); assert.equal(product.origin, undefined);
  assert.equal(product.detail, undefined); assert.ok(product.configurations.every(option => !option.canAdd));
});
test('actual server route renders foundation shell, safe preorder and metadata without purchase controls', async () => {
  for (const slug of [key, 'preorder-tea-presentation']) {
    const element = await route.default({ params: Promise.resolve({ slug }) });
    const { NotificationProvider } = load('components/Notification/NotificationProvider.tsx');
    const html = renderToStaticMarkup(React.createElement(NotificationProvider, null, element));
    assert.match(html, /<main/); assert.match(html, /<h1/); assert.ok(html.includes(found(app.views, slug).title));
    const hero = html.match(/<section[^>]*aria-labelledby="product-title"[\s\S]*?<\/section>/)?.[0];
    assert.ok(hero); assert.doesNotMatch(hero, /<button|<dialog|<input|Состояния/);
    assert.doesNotMatch(html, /Как заваривать/);
    assert.equal((await route.generateMetadata({ params: Promise.resolve({ slug }) })).robots.index, false);
  }
  await assert.rejects(route.default({ params: Promise.resolve({ slug: 'unknown' }) }), error => error === notFound);
});
