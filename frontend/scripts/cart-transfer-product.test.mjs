import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

function load(relative, dependencies = {}) {
  const file = fileURLToPath(new URL(relative, import.meta.url)), compiled = new Module(file);
  compiled.require = name => dependencies[name] ?? Module.createRequire(file)(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
  return compiled.exports;
}
const contract = load('../features/product/ProductCard/configuration-contract.ts');
const { resolveProductTransferTarget: resolve } = load('../features/cart/cart-transfer-product.adapter.ts', {
  '@/features/product/ProductCard/configuration-contract': contract,
});
const { productCardExamples } = load('../features/product/ProductCard/product-card.fixtures.ts');
const products = productCardExamples.map(example => example.data);
const identity = (productKey = products[0].slug, id = 'tea-100') => ({ productKey, configuration: { kind: 'selectable', id } });

test('F1 adapter validates target by Product + opaque ID and returns current metadata', () => {
  const result = resolve(products, identity());
  assert.deepEqual(result, { ok: true, identity: identity(), available: true,
    presentation: { slug: products[0].slug, title: products[0].title, configurationLabel: '100 г.' } });
});
test('F1 adapter current availability flip, including unavailable source, is read at execution', () => {
  const original = products[0];
  let product = { ...original, weight: { ...original.weight, configurations: original.weight.configurations.map(o => ({ ...o, disabled: o.id === 'tea-50' })) } };
  assert.equal(resolve([product], identity()).available, true);
  product = { ...product, weight: { ...product.weight, configurations: product.weight.configurations.map(o => ({ ...o, disabled: true })) } };
  assert.equal(resolve([product], identity()).available, false);
});
test('F1 adapter missing/ambiguous Product data fail closed', () => {
  assert.equal(resolve([], identity()).reason, 'validation-unavailable');
  assert.equal(resolve([products[0], products[0]], identity()).reason, 'validation-unavailable');
});
test('F1 adapter rejects unknown configuration rather than trusting labels or another Product', () => {
  assert.equal(resolve(products, identity(products[0].slug, 'discount-100')).reason, 'invalid-identity');
});
for (const index of [2, 3, 4]) test(`F1 adapter unsupported preorder/fixed/Ceramics ${index}`, () => {
  assert.equal(resolve(products, identity(products[index].slug)).reason, 'invalid-identity');
});
test('F1 adapter malformed four-slot Product input is validation-unavailable', () => {
  const p = products[0];
  for (const configurations of [p.weight.configurations.slice(1), [...p.weight.configurations, p.weight.configurations[0]], p.weight.configurations.map(o => ({ ...o, id: 'duplicate' }))]) {
    assert.equal(resolve([{ ...p, weight: { ...p.weight, configurations } }], identity()).reason, 'validation-unavailable');
  }
});
test('F1 adapter malformed metadata/availability or missing nested input fails closed', () => {
  const p = products[0];
  for (const product of [{ ...p, title: '' }, { ...p, weight: null }, { ...p, weight: { ...p.weight, configurations: p.weight.configurations.map(o => ({ ...o, disabled: 'false' })) } }]) {
    assert.equal(resolve([product], identity()).reason, 'validation-unavailable');
  }
});
