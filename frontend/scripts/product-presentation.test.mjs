import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../', import.meta.url)), cache = new Map();
function load(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = new Module(filename); cache.set(filename, compiled);
  compiled.require = name => {
    if (name.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) };
    if (name === 'next/image') return { __esModule: true, default: props => {
      const image = { ...props }; delete image.fill; delete image.priority; return React.createElement('img', image);
    } };
    if (name === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
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
const { applicationProductInputs: app } = load('features/product-input/product-input.application.ts');
const { projectProductDetail } = load('features/product-input/product-input.detail.ts');
const { catalogTarget, implementedCatalogFamilies } = load('features/product-page/product-page.catalog.ts');
const { lookupProductPage } = load('features/product-page/product-page.read-model.ts');
const { productPagePrice, relatedProductCards } = load('features/product-page/product-page.presentation.ts');
const { ProductPresentation } = load('features/product-page/ProductPresentation.tsx');
const { NotificationProvider } = load('components/Notification/NotificationProvider.tsx');
const { galleryGesture } = load('features/product-page/gallery-gesture.ts');
const product = slug => lookupProductPage(app.views, slug).product;
// Explicit sparse input for omission tests; application now intentionally contains demo detail.
const tea = () => { const model = structuredClone(product('tea-presentation')); delete model.detail; return model; };
const render = (model, related = []) => renderToStaticMarkup(React.createElement(NotificationProvider, null,
  React.createElement(ProductPresentation, { product: model, related })));

test('catalog route families include corrected /category/{slug}, never /catalog/{slug}', () => {
  const ref = { label: 'Красный чай', slug: 'red' };
  assert.equal(catalogTarget('category', ref, ['category']).href, '/category/red');
  assert.equal(catalogTarget('region', { label: 'Китай', slug: 'china' }, ['region']).href, '/catalog/region/china');
  assert.equal(catalogTarget('taste', { label: 'Медовый', slug: 'honey' }, ['taste']).href, '/catalog/taste/honey');
  assert.deepEqual(implementedCatalogFamilies, []);
  assert.equal(catalogTarget('category', ref).href, undefined);
});
test('catalog links require explicit safe slugs and labels; malformed references never become hrefs', () => {
  for (const slug of ['javascript:alert(1)', '//example.org', '../red', 'red/black', '%72ed', ' red', 'red?', '\ud800'])
    assert.equal(catalogTarget('category', { slug, label: 'Label' }), undefined);
  const projected = projectProductDetail({ provenance: 'demonstration-fixture', catalogLinks: {
    region: { label: 'Китай', slug: 'china' }, category: { label: '', slug: 'red' },
    tastes: [{ label: 'Медовый', slug: 'honey' }, { label: 'Пряный', slug: 'spicy' }, { label: 'Дубликат', slug: 'honey' }, { label: 'Bad', slug: '//bad' }],
  } }, 'tea-presentation');
  assert.deepEqual(projected.detail.catalogLinks.tastes.map(ref => ref.slug), ['honey', 'spicy']);
  assert.equal(projected.detail.catalogLinks.category, undefined);
  assert.equal(projected.diagnostics.length, 3);
});
test('breadcrumbs and attribute rows use text for missing routes, retain current Product last, do not map Country to Region', () => {
  const model = tea();
  assert.equal(model.detail?.catalogLinks, undefined);
  const bare = render(model); assert.match(bare, /Страна:/); assert.doesNotMatch(bare, /href="\/catalog\/region/);
  model.detail = { provenance: 'demonstration-fixture', catalogLinks: { region: { label: 'Регион test', slug: 'explicit-region' },
    category: { label: 'Тип test', slug: 'red' }, tastes: [{ label: 'Taste one', slug: 'honey' }, { label: 'Taste two', slug: 'spicy' }] } };
  const html = render(model);
  assert.match(html, /aria-current="page">Золотистый чай/); assert.match(html, /Регион test/); assert.match(html, /Taste one/); assert.match(html, /Taste two/);
  assert.doesNotMatch(html, /href="\/(?:catalog|category)/);
});
test('hero displays unit O/C from shared quote without quantity arithmetic and no PDP purchase controls', () => {
  const model = product('discount-tea-presentation'), html = render(model);
  assert.equal(productPagePrice(model).current, '640 ₽'); assert.equal(productPagePrice(model).original, '850 ₽');
  assert.match(html, /<del>/); assert.match(html, /640 ₽/); assert.match(html, /850 ₽/);
  assert.doesNotMatch(html, /<button|<input|<dialog/);
  const unavailable = render(product('preorder-tea-presentation'));
  assert.match(unavailable, /Цена недоступна/); assert.match(unavailable, /Товар недоступен для покупки/);
});
test('upper Brewing applies to Tea only, missing values omitted; removed two-part content never appears', () => {
  const model = tea();
  assert.doesNotMatch(render(model), /Параметры заваривания/);
  model.detail = { provenance: 'demonstration-fixture', brewing: { preparingTime: 'TEST duration', temperature: 'TEST temperature' } };
  const html = render(model);
  assert.match(html, /Параметры заваривания/); assert.match(html, /TEST duration/);
  assert.doesNotMatch(html, /Кол-во завариваний|Идеальный чай|Как заваривать/);
  model.kind = 'ceramics'; assert.doesNotMatch(render(model), /Параметры заваривания|TEST duration/);
});
test('physical attributes use explicit metadata only, no artificial fixed selector', () => {
  const fixed = structuredClone(product('pressed-puer-presentation'));
  fixed.detail = { provenance: 'demonstration-fixture', physical: { fixedWeightGrams: 357 } };
  assert.match(render(fixed), /357 г\./); assert.doesNotMatch(render(fixed), /<select|Выберите вес/);
  const ceramic = structuredClone(product('teapot-pharaoh-presentation'));
  assert.doesNotMatch(render(ceramic), /Объём:/);
  ceramic.detail = { provenance: 'demonstration-fixture', physical: { volumeMl: 180 }, characteristics: [{ key: 'material', label: 'Материал:', value: 'TEST material' }] };
  assert.match(render(ceramic), /180 мл/); assert.match(render(ceramic), /TEST material/);
});
test('explicit related ordering skips self/duplicates/missing; existing ProductCard renders, empty relations omit section', () => {
  const model = tea();
  const projection = projectProductDetail({ provenance: 'demonstration-fixture', relatedProductKeys: [model.productKey, 'teapot-pharaoh-presentation', 'missing', 'pressed-puer-presentation', 'teapot-pharaoh-presentation'] }, model.productKey);
  model.detail = projection.detail;
  const related = relatedProductCards(model, app.views);
  assert.deepEqual(related.map(card => card.slug), ['teapot-pharaoh-presentation', 'pressed-puer-presentation']);
  const html = render(model, related);
  assert.match(html, /Также рекомендуем/); assert.match(html, /data-presentation="responsive"/);
  assert.match(html, /href="\/product\/teapot-pharaoh-presentation"/);
  assert.ok(html.indexOf('href="/product/teapot-pharaoh-presentation"') < html.indexOf('href="/product/pressed-puer-presentation"'));
  assert.doesNotMatch(render(tea()), /Также рекомендуем/);
});
test('gallery fallback single and missing have no navigation; multiple media preserve order', () => {
  assert.doesNotMatch(render(tea()), /Следующее изображение/);
  const missing = tea(); delete missing.image; assert.match(render(missing), /Изображение недоступно/);
  const multi = tea(); multi.detail = { provenance: 'demonstration-fixture', gallery: [multi.image, product('teapot-pharaoh-presentation').image] };
  const html = render(multi);
  assert.match(html, /Следующее изображение/); assert.match(html, /Изображение 1 из 2/);
  assert.ok(html.indexOf('darjeeling-orange-valley.png') < html.lastIndexOf('teapot-pharaoh.png'));
});
test('gesture threshold accepts horizontal mouse/touch displacement, rejects jitter and vertical intent', () => {
  assert.equal(galleryGesture(-90, 2, 375), 1); assert.equal(galleryGesture(90, 2, 1920), -1);
  assert.equal(galleryGesture(-20, 0, 375), 0); assert.equal(galleryGesture(-90, 100, 375), 0);
});
