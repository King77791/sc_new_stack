import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
function loader(original = false) {
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = new Module(filename); cache.set(filename, compiled);
    compiled.require = name => {
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name) + '.ts');
      return Module.createRequire(filename)(name);
    };
    // Fixed pre-demo revision: compare all Product records, not a weakened UI-presence assertion.
    const source = original && relative.endsWith('product-input.fixtures.ts')
      ? execFileSync('git', ['show', '92de422bdb9bbc83ada8dca4640416ac0a69b1e6:frontend/features/product-input/product-input.fixtures.ts'], { cwd: root, encoding: 'utf8' })
      : fs.readFileSync(filename, 'utf8');
    compiled._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
    return compiled.exports;
  }
  return load;
}
const load = loader(), oldLoad = loader(true), fixture = 'features/product-input/product-input.fixtures.ts';
const snapshot = load(fixture).applicationProductSnapshot, previous = oldLoad(fixture).applicationProductSnapshot;
const { prepareProductInputs } = load('features/product-input/product-input.validation.ts');
const { productInputCards } = load('features/product-input/product-input.presentation.ts');
const { lookupProductPage } = load('features/product-page/product-page.read-model.ts');
const { relatedProductCards } = load('features/product-page/product-page.presentation.ts');
const current = snapshot.products.find(product => product.productKey === 'tea-presentation');

test('demo identity, configuration IDs, prices, policy, availability and unrelated Products match pre-demo baseline', () => {
  const before = previous.products.find(product => product.productKey === current.productKey);
  assert.equal(current.productKey, 'tea-presentation'); assert.equal(current.presentation.slug, 'tea-presentation');
  assert.equal(current.presentation.title, 'Золотистый чай');
  for (const field of ['purchase', 'commerce', 'availability']) assert.deepEqual(current[field], before[field]);
  const presentation = { ...current.presentation, image: before.presentation.image };
  assert.deepEqual(presentation, before.presentation);
  assert.deepEqual(snapshot.products.filter(product => product.productKey !== current.productKey), previous.products.filter(product => product.productKey !== current.productKey));
  assert.deepEqual(snapshot.context, previous.context);
});
test('demo metadata remains fixture-only in a deeply frozen, detached shared generation', () => {
  assert.equal(current.detail.provenance, 'demonstration-fixture');
  assert.equal(snapshot.provenance, 'demonstration-fixture');
  assert.equal(snapshot.snapshotId, 'demo-product-input-10b2b-v1');
  assert.ok(Object.isFrozen(current.detail.gallery[0])); assert.ok(Object.isFrozen(current.presentation.image));
  assert.deepEqual(lookupProductPage(prepareProductInputs(snapshot), current.productKey).product.states, []);
});
test('approved main and ordered gallery descriptors match actual local WebP dimensions and alpha', async () => {
  assert.equal(current.presentation.image.src, '/images/products/tea-presentation/main.webp');
  assert.deepEqual(current.detail.gallery.map(image => image.src), [1, 2, 3, 4].map(index => `/images/products/tea-presentation/gallery-0${index}.webp`));
  for (const image of [current.presentation.image, ...current.detail.gallery]) {
    const file = path.join(root, 'public', image.src), metadata = await sharp(file).metadata();
    assert.equal(metadata.width, image.width); assert.equal(metadata.height, image.height); assert.equal(metadata.format, 'webp'); assert.ok(image.alt.trim());
    if (image === current.presentation.image) assert.equal(metadata.hasAlpha, true);
  }
});
test('demo detail validates, preserves prepared Brewing and explicit catalog labels without live links', () => {
  const product = lookupProductPage(prepareProductInputs(snapshot), current.productKey).product;
  assert.deepEqual(product.diagnostics, []);
  assert.deepEqual(product.detail.brewing, { preparingTime: '3–5 мин', temperature: '95–100 °C', amountPerBrewing: 'на 500 мл 5–7 г', infusionCount: '1 заваривание' });
  assert.deepEqual(product.detail.catalogLinks.category, { label: 'Пуэр', slug: 'puer' });
  assert.equal(product.country.label, 'Китай'); assert.equal(product.detail.catalogLinks.region.label, 'Юньнань');
});
test('related references resolve in explicit order with no self, duplicates or missing records', () => {
  const inputs = prepareProductInputs(snapshot), product = lookupProductPage(inputs, current.productKey).product;
  assert.equal(new Set(product.detail.relatedProductKeys).size, 5);
  assert.ok(!product.detail.relatedProductKeys.includes(product.productKey));
  assert.deepEqual(relatedProductCards(product, inputs).map(card => card.slug), product.detail.relatedProductKeys);
});
test('shared Card projection receives approved image only; all previous prices and other Cards remain unchanged', () => {
  const cards = productInputCards(prepareProductInputs(snapshot)), before = productInputCards(prepareProductInputs(previous));
  assert.deepEqual(cards.map(card => card.price), before.map(card => card.price));
  assert.deepEqual(cards.filter(card => card.slug !== current.productKey), before.filter(card => card.slug !== current.productKey));
  assert.deepEqual(cards.find(card => card.slug === current.productKey).image, current.presentation.image);
});
