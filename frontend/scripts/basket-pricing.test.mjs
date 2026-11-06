import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

// In-memory TS loading follows existing deterministic suites; no emitted files.
const cache = new Map();
function load(relative) {
  const filename = path.resolve(path.dirname(fileURLToPath(import.meta.url)), relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = new Module(filename); cache.set(filename, compiled);
  compiled.require = name => name.startsWith('.') ? load(path.relative(path.dirname(fileURLToPath(import.meta.url)), path.resolve(path.dirname(filename), `${name}.ts`))) : Module.createRequire(filename)(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  return compiled.exports;
}
const fixtures = load('../features/basket/basket-pricing.fixtures.ts');
const { makeBasketFixture: fixture, makeBasketCartItem: item, makeBasketRoundingFixture: rounding, basketFixtureContext: context } = fixtures;
const { projectBasketPricing: project } = load('../features/basket/basket-pricing.projection.ts');
const { evaluateBasketCheckout: eligible } = load('../features/basket/basket-checkout-eligibility.ts');
const { acceptsBasketQuote: accepts } = load('../features/basket/basket-pricing.quote.ts');
const { formatBasketMoney: format, rub, moneyIssue } = load('../features/basket/basket-money.ts');
const { safeProductHref: href } = load('../features/basket/basket-product.adapter.ts');
const cart = load('../features/cart/cart.model.ts');
const read = (f, items = [item(f.bundle)], bundle = f.bundle, availability = f.availability) => project(items, [f.product], [bundle], context, availability);
const line = p => p.groups[0].lines[0];
const amounts = t => t && [t.referenceSubtotal.minor, t.currentSubtotal.minor, t.discountAmount.minor];
const changePrice = (f, patch, slot = 0) => ({ ...f.bundle, prices: f.bundle.prices.map((p, i) => i === slot ? { ...p, ...patch } : p) });
const noQuote = () => ({ status: 'unavailable' });
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

test('R1 no discount uses equal original/current', () => {
  const p = read(fixture('plain', false)); assert.deepEqual(amounts(p.totals), [100000, 100000, 0]);
});
test('R2 active policy gives ready line and positive savings', () => {
  const q = line(read(fixture())).quote; assert.equal(q.status, 'ready'); assert.equal(q.currentLine.minor, 85000); assert.equal(q.lineSavings.minor, 15000); assert.equal(q.showOriginal, true);
});
test('R3 multiple configurations share one Product and policy revision', () => {
  const f = fixture(), p = read(f, [item(f.bundle), item(f.bundle, 1, 2), item(f.bundle, 2)]);
  assert.equal(p.groups.length, 1); assert.deepEqual(amounts(p.groups[0].totals), [780000, 663000, 117000]);
  assert.deepEqual(p.groups[0].lines.map(l => l.quote.binding.policyRevision), ['policy-1', 'policy-1', 'policy-1']);
});
test('R4 configurations keep distinct catalog prices, never own policies', () => {
  const f = fixture(), p = read(f, [item(f.bundle), item(f.bundle, 1)]);
  assert.deepEqual(p.groups[0].lines.map(l => l.quote.currentUnit.minor), [85000, 153000]);
});
test('R5 Q multiplies prepared unit prices', () => {
  const f = fixture(), q = line(read(f, [item(f.bundle, 0, 3)])).quote;
  assert.equal(q.currentUnit.minor, 85000); assert.equal(q.currentLine.minor, 255000);
});
test('R6 group monetary invariant', () => {
  const f = fixture(), t = read(f, [item(f.bundle), item(f.bundle, 2, 5)]).groups[0].totals;
  assert.equal(t.referenceSubtotal.minor - t.discountAmount.minor, t.currentSubtotal.minor);
});
test('R7 Basket totals equal sum of groups and counts stay distinct', () => {
  const a = fixture('a'), b = fixture('b', false, true);
  const p = project([item(a.bundle, 0, 2), item(b.bundle, 0, 3), item(a.bundle, 1)], [a.product, b.product], [a.bundle, b.bundle], context);
  assert.deepEqual(amounts(p.totals), [680000, 623000, 57000]);
  assert.deepEqual([p.itemCount, p.totalQuantity, p.productGroupCount], [3, 6, 2]);
});
test('R8 no double discount, including group rounding trap', () => {
  const f = rounding(), p = read(f, [item(f.bundle, 0, 4)]);
  assert.deepEqual(amounts(p.totals), [404, 344, 60]); assert.notEqual(p.totals.currentSubtotal.minor, 343);
});
test('R9 no discount has no old-price/badge/savings presentation', () => {
  const p = read(fixture('plain', false)); assert.equal(line(p).quote.showOriginal, false); assert.equal(p.groups[0].badge, undefined); assert.equal(p.groups[0].showSavings, false);
});
test('R10 15 percent badge survives rounded unit prices', () => {
  const p = read(rounding()); assert.equal(line(p).quote.status, 'ready'); assert.equal(p.groups[0].badge.basisPoints, 1500);
});
test('R11 invalid badge is diagnostic, invalid monetary policy blocks', () => {
  const f = fixture(), bundle = { ...f.bundle, policy: { ...f.bundle.policy, percentage: { status: 'confirmed', basisPoints: 0 } } };
  const p = read(f, undefined, bundle); assert.equal(line(p).quote.status, 'ready'); assert.equal(p.groups[0].badge, undefined); assert.equal(p.groups[0].diagnostics[0].code, 'badge-invalid');
  assert.equal(line(read(f, undefined, { ...bundle, policy: { ...bundle.policy, status: 'invalid' } })).quote.status, 'invalid-pricing-data');
});
test('R12 invalid O/C rejected for active and none', () => {
  const f = fixture(); assert.equal(line(read(f, undefined, changePrice(f, { originalUnit: rub(1) }))).quote.status, 'invalid-pricing-data');
  const n = fixture('n', false); assert.equal(line(read(n, undefined, changePrice(n, { currentUnit: rub(2) }))).quote.status, 'invalid-pricing-data');
});
test('R13 partial group keeps ready prices, no partial full totals', () => {
  const f = fixture(), p = read(f, [item(f.bundle), item(f.bundle, 1)], { ...f.bundle, prices: [f.bundle.prices[0]] });
  assert.equal(p.coverage, 'partially-unavailable'); assert.equal(line(p).quote.status, 'ready'); assert.equal(p.groups[0].totals, undefined); assert.equal(p.totals, undefined); assert.equal(eligible(p).projectionReady, false);
});
test('R14 all prices unavailable retains canonical lines', () => {
  const f = fixture(), items = [item(f.bundle)]; const p = read(f, items, { ...f.bundle, prices: [] });
  assert.equal(p.coverage, 'unavailable'); assert.equal(line(p).item, items[0]); assert.equal(p.totals, undefined);
});
test('R15 policy refresh without Cart mutation changes quotes and aggregates', () => {
  const f = fixture(), items = [item(f.bundle)], old = read(f, items);
  const bundle = { ...f.bundle, policy: { ...f.bundle.policy, policyRevision: 'policy-2' }, prices: f.bundle.prices.map(p => ({ ...p, policyRevision: 'policy-2', currentUnit: rub(p.originalUnit.minor - 100) })) };
  const next = read(f, items, bundle); assert.equal(line(next).quote.currentLine.minor, 99900); assert.notDeepEqual(old.totals, next.totals);
});
test('R16 disabling policy needs coherent equal prices, drops presentation', () => {
  const f = fixture(), bundle = { ...f.bundle, policy: { ...f.bundle.policy, policyRevision: 'off', state: 'none' }, prices: f.bundle.prices.map(p => ({ ...p, policyRevision: 'off', currentUnit: p.originalUnit })) };
  const p = read(f, undefined, bundle); assert.equal(line(p).quote.showOriginal, false); assert.equal(p.groups[0].badge, undefined); assert.equal(p.totals.discountAmount.minor, 0);
});
test('R17 one configuration price refresh updates aggregates', () => {
  const f = fixture(), items = [item(f.bundle), item(f.bundle, 1)];
  const p = read(f, items, changePrice(f, { priceRevision: 'new', currentUnit: rub(80000) })); assert.equal(p.totals.currentSubtotal.minor, 233000); assert.equal(p.groups[0].lines[1].quote.binding.priceRevision, 'price-1-1');
});
test('R18 SET quotes resulting canonical Q', () => {
  const f = fixture(), before = [item(f.bundle)]; const next = cart.setItemQuantity(before, before[0].id, 4, noQuote);
  assert.equal(line(read(f, next.items)).quote.currentLine.minor, 340000);
});
test('R19 REMOVE excludes configuration and preserves Product group', () => {
  const f = fixture(), before = [item(f.bundle), item(f.bundle, 1)]; const next = cart.removeItem(before, before[0].id);
  const p = read(f, next.items); assert.equal(p.groups.length, 1); assert.equal(p.itemCount, 1); assert.equal(p.totals.currentSubtotal.minor, 153000);
});
const transfer = (f, items) => cart.transferConfiguration(items, { expectedSource: items[0], target: f.bundle.prices[1].identity }, identity => ({ ok: true, identity, available: true, presentation: { slug: f.product.slug, title: f.product.title, configurationLabel: '100 г.' } }), noQuote);
test('R20 TRANSFER uses target unit price, not source total', () => {
  const f = fixture(), next = transfer(f, [item(f.bundle, 0, 2)]); assert.equal(next.result.value.outcome, 'transferred');
  const p = read(f, next.items); assert.equal(p.itemCount, 1); assert.equal(p.totals.currentSubtotal.minor, 306000);
});
test('R21 MERGE sums actual target Q and removes source once', () => {
  const f = fixture(), next = transfer(f, [item(f.bundle, 0, 2), item(f.bundle, 1, 3)]);
  const p = read(f, next.items); assert.equal(next.result.value.outcome, 'merged'); assert.equal(p.itemCount, 1); assert.equal(p.totalQuantity, 5); assert.equal(p.totals.currentSubtotal.minor, 765000);
});
test('R22 stale revisions, bindings and generation rejected', () => {
  const f = fixture(), q = line(read(f)).quote;
  assert.equal(line(read(f, undefined, changePrice(f, { policyRevision: 'old' }))).quote.status, 'stale');
  assert.equal(accepts(q, q, 'r1', 'r1'), true); assert.equal(accepts(q, q, 'r1', 'r2'), false);
  assert.equal(accepts(q, line(read(f, [item(f.bundle, 0, 2)])).quote, 'r1', 'r1'), false);
});
test('R23 fixed Product uses fixed identity and one definition', () => {
  const p = read(fixture('fixed', true, true)); assert.equal(line(p).definition.configuration.kind, 'fixed'); assert.equal(line(p).canTransfer, false);
});
test('R24 selectable Tea slots normalized by explicit weight', () => {
  const f = fixture(), p = read(f, [item(f.bundle, 3), item(f.bundle, 0), item(f.bundle, 2)]);
  assert.deepEqual(p.groups[0].lines.map(l => l.definition.weightGrams), [50, 200, 250]);
});
test('R25 line/group/Basket overflow never returns zero', () => {
  const f = fixture('huge', false, true), max = Number.MAX_SAFE_INTEGER;
  const bundle = changePrice(f, { originalUnit: rub(max), currentUnit: rub(max) });
  assert.equal(line(read(f, [item(f.bundle, 0, 2)], bundle)).quote.status, 'aggregation-overflow');
  const a = fixture('a', false, true), b = fixture('b', false, true);
  const p = project([item(a.bundle), item(b.bundle)], [a.product, b.product], [changePrice(a, { originalUnit: rub(max), currentUnit: rub(max) }), b.bundle], context);
  assert.equal(p.coverage, 'complete'); assert.equal(p.totals, undefined); assert.equal(p.issues.at(-1).scope, 'basket');
});
test('R26 non-RUB rejected without conversion', () => {
  const f = fixture(); assert.equal(line(read(f, undefined, changePrice(f, { currentUnit: { currency: 'USD', minor: 10 } }))).quote.status, 'incompatible-currency');
});
test('R27 missing Product keeps snapshots and safe actions only', () => {
  const f = fixture(), items = [item(f.bundle)], p = project(items, [], [f.bundle], context);
  assert.equal(line(p).item, items[0]); assert.equal(p.groups[0].product.title, 'Snapshot QA title'); assert.equal(p.groups[0].product.image, undefined);
  assert.equal(line(p).canIncrease, false); assert.equal(line(p).canTransfer, false); assert.equal(line(p).canRemove, true); assert.equal(line(p).canDecrease, true); assert.equal(p.totals, undefined);
});
test('R28 deeply frozen input immutable and outputs serialize without bigint', () => {
  const f = freeze(fixture()), items = freeze([item(f.bundle)]), before = JSON.stringify([f, items]);
  const p = read(f, items); assert.equal(JSON.stringify([f, items]), before); assert.equal(line(p).item, items[0]); assert.doesNotThrow(() => JSON.stringify(p));
});
test('R29 protected tracked files match HEAD', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const targets = ['AGENTS.md', 'knowledge', 'frontend/features/cart', 'frontend/features/product/ProductCard', 'frontend/components/SiteHeader', 'frontend/styles'];
  const allowed = new Set(['frontend/features/cart/CartApplicationProvider.tsx', 'frontend/features/cart/cart-widget.adapter.ts']);
  const changed = execFileSync('git', ['diff', 'HEAD', '--name-only', '--', ...targets], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
  assert.deepEqual(changed.filter(filename => !allowed.has(filename)), []);
});
test('R30 legacy regression suite files remain unchanged (executed separately)', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const { verifyRepository } = Module.createRequire(import.meta.url)('./product-input-protection.cjs');
  assert.doesNotThrow(() => verifyRepository(root));
});

test('empty Cart has mathematical zero totals and disabled Checkout', () => {
  const p = project([], [], [], context); assert.deepEqual(amounts(p.totals), [0, 0, 0]); assert.equal(p.coverage, 'complete'); assert.equal(p.issues.length, 0); assert.equal(eligible(p).projectionReady, false);
});
test('count overflow does not corrupt canonical quantity', () => {
  const a = fixture('a'), b = fixture('b'); const items = [item(a.bundle, 0, Number.MAX_SAFE_INTEGER), item(b.bundle)];
  const p = project(items, [a.product, b.product], [a.bundle, b.bundle], context);
  assert.equal(p.totalQuantity, undefined); assert.equal(items[0].quantity, Number.MAX_SAFE_INTEGER); assert.ok(p.issues.some(i => i.reason === 'Total quantity exceeds safe range'));
});
for (const q of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) test(`invalid Q ${q} returns typed issue`, () => {
  const f = fixture(), p = read(f, [item(f.bundle, 0, q)]); assert.equal(line(p).quote.status, 'invalid-pricing-data'); assert.ok(eligible(p).reasons.includes('invalid-quantity'));
});
test('duplicate Products, bundles, Cart IDs and price identities fail closed', () => {
  const f = fixture(), i = item(f.bundle);
  assert.equal(project([i], [f.product, f.product], [f.bundle], context).groups[0].product.status, 'ambiguous');
  assert.equal(line(project([i], [f.product], [f.bundle, f.bundle], context)).quote.status, 'invalid-pricing-data');
  assert.equal(line(read(f, [i, i])).quote.status, 'invalid-pricing-data');
  assert.equal(line(read(f, [i], { ...f.bundle, prices: [...f.bundle.prices, f.bundle.prices[0]] })).quote.status, 'invalid-pricing-data');
});
test('partial policy/catalog/source update is stale across Product bundle', () => {
  const f = fixture();
  for (const patch of [{ policyRevision: 'new' }, { context: { ...context, catalogRevision: 'other' } }, { context: { ...context, pricingRevision: 'other' } }, { context: { ...context, source: 'backend' } }]) {
    const p = read(f, [item(f.bundle)], changePrice(f, patch, 1)); assert.equal(line(p).quote.status, 'stale');
  }
});
test('badge-only refresh preserves binding and monetary quotes', () => {
  const f = fixture(), old = read(f), bundle = { ...f.bundle, policy: { ...f.bundle.policy, percentage: { status: 'invalid' } } };
  const next = read(f, undefined, bundle); assert.deepEqual(next.totals, old.totals); assert.deepEqual(line(next).quote, line(old).quote); assert.equal(next.groups[0].badge, undefined);
});
test('source conflict yields unchanged projection', () => {
  const f = fixture(), before = [item(f.bundle)], changed = cart.setItemQuantity(before, before[0].id, 2, noQuote).items;
  const result = cart.transferConfiguration(changed, { expectedSource: before[0], target: f.bundle.prices[1].identity }, () => { throw Error('not called'); }, noQuote);
  assert.equal(result.result.reason, 'conflict'); assert.equal(result.items, changed); assert.deepEqual(read(f, result.items).totals, read(f, changed).totals);
});
test('Q to Q2 to Q requires fresh request generation', () => {
  const f = fixture(), old = line(read(f)).quote; const sameQ = line(read(f, [item(f.bundle)])).quote;
  assert.equal(accepts(old, sameQ, 1, 3), false); assert.equal(accepts(old, sameQ, undefined, undefined), false);
});
test('ready prices survive unavailable availability; fixed unknown stays unknown', () => {
  const f = fixture('fixed', true, true), p = read(f, undefined, f.bundle, []);
  assert.equal(line(p).quote.status, 'ready'); assert.equal(line(p).availability, 'unknown'); assert.equal(eligible(p).projectionReady, false);
  const next = read(f, undefined, f.bundle, [{ ...f.availability[0], status: 'unavailable' }]); assert.equal(line(next).quote.status, 'ready'); assert.equal(line(next).canIncrease, false);
});
test('safe navigation fallback rejects escape and malformed slugs', () => {
  assert.equal(href('чай'), '/product/%D1%87%D0%B0%D0%B9');
  for (const slug of ['//evil', '../x', 'a/b', 'javascript:x', '%2f', 'x?y', '\ud800', '', ' x']) assert.equal(href(slug), undefined);
});
test('groups follow canonical first occurrence; invalid weight preserves relative order', () => {
  const a = fixture('a'), b = fixture('b'), items = [item(b.bundle), item(a.bundle, 3), item(a.bundle, 0)];
  const bad = { ...a.product, weight: { ...a.product.weight, configurations: a.product.weight.configurations.map(o => ({ ...o, weightGrams: undefined })) } };
  const p = project(items, [bad, b.product], [a.bundle, b.bundle], context);
  assert.deepEqual(p.groups.map(g => g.productKey), ['b', 'a']); assert.deepEqual(p.groups[1].lines.map(l => l.item), items.slice(1)); assert.equal(p.groups[1].diagnostics[0].code, 'ordering-fallback');
});
test('RUB formatting is exact for cents, thousands and max-safe minor', () => {
  for (const [minor, display] of [[0, '0 ₽'], [1, '0,01 ₽'], [101, '1,01 ₽'], [100000, '1 000 ₽'], [Number.MAX_SAFE_INTEGER, '90 071 992 547 409,91 ₽']]) assert.equal(format(rub(minor)), display);
});
for (const minor of [-1, 0.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) test(`invalid money ${minor}`, () => {
  assert.equal(moneyIssue(rub(minor)), 'invalid-pricing-data'); assert.throws(() => format(rub(minor)), RangeError);
});
test('missing policy never defaults to no-discount', () => {
  const f = fixture(); assert.equal(line(read(f, undefined, { ...f.bundle, policy: undefined })).quote.status, 'unavailable');
});
test('missing badge preserves money and emits diagnostic', () => {
  const f = fixture(), p = read(f, undefined, { ...f.bundle, policy: { ...f.bundle.policy, percentage: undefined } }); assert.equal(line(p).quote.status, 'ready'); assert.equal(p.groups[0].diagnostics[0].code, 'badge-unavailable');
});
test('Checkout readiness differs from fixture authority and no integration', () => {
  const e = eligible(read(fixture())); assert.equal(e.projectionReady, true); assert.equal(e.authority, 'fixture'); assert.equal(e.checkoutActionAvailable, false); assert.ok(e.reasons.includes('fixture-only-authority')); assert.ok(e.reasons.includes('checkout-integration-missing'));
});
test('programming exceptions are not relabeled unavailable', () => {
  const f = fixture(), bundle = { ...f.bundle, get prices() { throw Error('programming failure'); } };
  assert.throws(() => read(f, undefined, bundle), /programming failure/);
});

test('group overflow preserves complete line coverage and blocks full totals', () => {
  const f = fixture('group-huge', false), max = Number.MAX_SAFE_INTEGER;
  const bundle = { ...f.bundle, prices: f.bundle.prices.map(p => ({ ...p, originalUnit: rub(max), currentUnit: rub(max) })) };
  const p = read(f, [item(f.bundle), item(f.bundle, 1)], bundle);
  assert.equal(p.coverage, 'complete'); assert.equal(p.groups[0].coverage, 'complete');
  assert.equal(p.groups[0].totals, undefined); assert.equal(p.totals, undefined);
  assert.ok(p.groups[0].issues.some(i => i.code === 'aggregation-overflow' && i.scope === 'group'));
  assert.ok(eligible(p).reasons.includes('overflow'));
});
test('partial Basket retains complete totals of unaffected Product', () => {
  const a = fixture('a'), b = fixture('b');
  const p = project([item(a.bundle), item(b.bundle)], [a.product, b.product], [a.bundle, { ...b.bundle, prices: [] }], context);
  assert.deepEqual(amounts(p.groups[0].totals), [100000, 85000, 15000]); assert.equal(p.groups[1].totals, undefined); assert.equal(p.totals, undefined);
});
test('identity/membership errors are typed and never become purchase permission', () => {
  const f = fixture(), i = item(f.bundle);
  for (const bad of [{ ...i, configuration: null }, { ...i, configuration: { kind: 'other' } }, { ...i, id: 'wrong' },
    { ...i, configuration: { kind: 'selectable', id: 'unknown' }, id: cart.getCartItemId({ productKey: i.productKey, configuration: { kind: 'selectable', id: 'unknown' } }) }]) {
    const p = read(f, [bad]); assert.equal(line(p).quote.status, 'invalid-pricing-data'); assert.equal(line(p).canIncrease, false); assert.equal(line(p).canTransfer, false);
  }
});
test('malformed Product options fail closed without expected-data exceptions', () => {
  const f = fixture(), product = { ...f.product, weight: { presentation: 'selectable', configurations: null } };
  const p = project([item(f.bundle)], [product], [f.bundle], context);
  assert.equal(line(p).quote.status, 'invalid-pricing-data'); assert.equal(line(p).availability, 'unknown');
});
test('unknown fixed availability and duplicate availability inputs never authorize increase', () => {
  const f = fixture('fixed', false, true);
  assert.equal(line(read(f, undefined, f.bundle, [])).canIncrease, false);
  assert.equal(line(read(f, undefined, f.bundle, [...f.availability, ...f.availability])).availability, 'unknown');
});
test('preorder and disabled configurations cannot increase with an available override', () => {
  const f = fixture(), preorder = { ...f.product, purchasePresentation: 'preorder' };
  const p = project([item(f.bundle)], [preorder], [f.bundle], context, f.availability);
  assert.equal(line(p).availability, 'not-purchasable'); assert.equal(line(p).canIncrease, false);
  const disabled = { ...f.product, weight: { ...f.product.weight, configurations: f.product.weight.configurations.map(o => ({ ...o, disabled: true })) } };
  const q = project([item(f.bundle)], [disabled], [f.bundle], context, f.availability);
  assert.equal(line(q).availability, 'unavailable'); assert.equal(line(q).canIncrease, false); assert.equal(line(q).quote.status, 'ready');
});
test('ADD refreshes resulting quote and policy/price revision invalidate acceptance', () => {
  const f = fixture(), before = [item(f.bundle)], old = line(read(f, before)).quote;
  const input = before[0]; const next = cart.addItem(before, { ...input, quantity: 1 }, noQuote);
  assert.equal(line(read(f, next.items)).quote.binding.quantity, 2);
  const repriced = line(read(f, before, changePrice(f, { priceRevision: 'price-2' }))).quote;
  assert.equal(accepts(old, repriced, 1, 1), false);
  const bundle = { ...f.bundle, policy: { ...f.bundle.policy, policyRevision: 'policy-2' }, prices: f.bundle.prices.map(p => ({ ...p, policyRevision: 'policy-2' })) };
  assert.equal(accepts(old, line(read(f, before, bundle)).quote, 1, 1), false);
});
for (const patch of [{ priceRevision: '' }, { policyRevision: '' }, { quantityRule: 'tiered' }, { application: 'unconfirmed' },
  { context: { ...context, source: 'unknown' } }, { identity: { productKey: 'other', configuration: { kind: 'fixed' } } }]) {
  test(`invalid configuration input ${JSON.stringify(patch)} fails closed`, () => {
    const f = fixture(); assert.equal(line(read(f, undefined, changePrice(f, patch))).quote.status, 'invalid-pricing-data');
  });
}
test('invalid monetary units are blocked, including zero and absent values', () => {
  const f = fixture();
  for (const minor of [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(line(read(f, undefined, changePrice(f, { currentUnit: rub(minor) }))).quote.status, 'invalid-pricing-data');
  assert.equal(line(read(f, undefined, changePrice(f, { currentUnit: undefined }))).quote.status, 'invalid-pricing-data');
});
test('backend provenance still cannot enable missing Checkout integration', () => {
  const f = fixture(), backend = { ...context, source: 'backend' };
  const bundle = { ...f.bundle, context: backend, policy: { ...f.bundle.policy, context: backend }, prices: f.bundle.prices.map(p => ({ ...p, context: backend })) };
  const e = eligible(project([item(f.bundle)], [f.product], [bundle], backend, f.availability));
  assert.equal(e.projectionReady, true); assert.equal(e.authority, 'backend'); assert.equal(e.checkoutActionAvailable, false); assert.deepEqual(e.reasons, ['checkout-integration-missing']);
});
