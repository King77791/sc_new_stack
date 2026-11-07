import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const stub = name => function Component() { return name; };
const widget = stub('Widget'), cartProvider = stub('CartProvider');
const componentStubs = {
  'features/cart/CartProvider': { CartProvider: cartProvider },
  'features/cart/CartWidgetContainer': { CartWidgetContainer: widget },
  'components/SiteHeader/SiteHeader': { SiteHeader: stub('Header') },
  'components/SiteFooter/SiteFooter': { SiteFooter: stub('Footer') },
  'components/Notification/NotificationProvider': { NotificationProvider: stub('Notifications'), NotificationHost: stub('Host') },
};
function loader(overrides = {}) {
  const cache = new Map();
  function load(relative) {
    relative = relative.replace(/\\/g, '/').replace(/\.(ts|tsx)$/, '');
    if (overrides[relative]) return overrides[relative];
    if (componentStubs[relative]) return componentStubs[relative];
    if (cache.has(relative)) return cache.get(relative).exports;
    const filename = [relative + '.ts', relative + '.tsx'].map(p => path.join(frontend, p)).find(p => fs.existsSync(p));
    assert.ok(filename, relative);
    const compiled = new Module(filename); cache.set(relative, compiled);
    compiled.require = name => {
      if (name.endsWith('.css')) return {};
      if (name === 'next/font/local') return () => ({ variable: 'test-font' });
      if (name.startsWith('@/')) return load(name.slice(2));
      if (name.startsWith('.')) return load(path.relative(frontend, path.resolve(path.dirname(filename), name)));
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
const feature = name => load(`features/product-input/product-input.${name}`);
const { applicationProductSnapshot: snapshot } = feature('fixtures');
const { applicationProductInputs: application } = feature('application');
const { createProductInputSnapshot: construct } = feature('snapshot');
const { prepareProductInputs: prepare } = feature('validation');
const { productInputCards: cards } = feature('presentation');
const { productInputCartPricing: pricing } = feature('cart-pricing');
const { productInputTransferTarget: targetResolver } = feature('transfer');
const { productInputWidgetAvailability: availability } = feature('availability');
const { projectProductInputBasket: basket } = feature('basket');
const { toCartWidgetItems: widgetRows } = load('features/cart/cart-widget.adapter');
const cart = load('features/cart/cart.model');
const { formatBasketMoney: money } = load('features/basket/basket-money');
const { evaluateBasketCheckout: checkout } = load('features/basket/basket-checkout-eligibility');
const { normalizeConfigurations: normalize } = load('features/product/ProductCard/configuration-contract');
const { projectBasketPricing: directBasket } = load('features/basket/basket-pricing.projection');
const views = application.views;
const clone = () => structuredClone(snapshot);
const change = fn => { const next = clone(); fn(next); return prepare(construct(next)); };
const record = (key = 'tea-presentation') => snapshot.products.find(p => p.productKey === key);
function identity(key = 'tea-presentation', id = 'tea-50') {
  return { productKey: key, configuration: id === null ? { kind: 'fixed' } : { kind: 'selectable', id } };
}
function item(key = 'tea-presentation', id = 'tea-50', quantity = 1) {
  const target = identity(key, id);
  return { ...target, id: cart.getCartItemId(target), quantity,
    presentation: { slug: key, title: 'Canonical snapshot title', ...(id === null ? {} : { configurationLabel: 'Snapshot configuration' }) },
    pricing: { status: 'unavailable' } };
}
const line = (items, inputs = views) => basket(items, inputs).groups[0].lines[0];
const issue = (inputs, code) => inputs.issues.some(i => i.code === code);
const card = (key, inputs = views) => cards(inputs).find(p => p.slug === key);
const quote = (i, inputs = views) => pricing(inputs)(i);
const walk = element => !element || typeof element !== 'object' ? [] : [element, ...[element.props?.children].flat(Infinity).flatMap(walk)];

test('S1 one canonical immutable generation backs the application', () => {
  assert.equal(application.views.snapshot, snapshot); assert.equal(application.cards.length, 6);
});
test('S2 duplicate Product keys are typed and fail closed', () => {
  const inputs = change(s => s.products.push(s.products[0]));
  assert.ok(issue(inputs, 'duplicate-product')); assert.equal(card('tea-presentation', inputs), undefined);
  assert.equal(line([item()], inputs).quote.status, 'invalid-pricing-data');
});
test('S3 canonical membership and explicit-weight ordering survive adapters', () => {
  const inputs = change(s => s.products[0].purchase.definitions.reverse());
  assert.deepEqual(normalize(card('tea-presentation', inputs).weight.configurations).map(o => o.id), ['tea-50', 'tea-100', 'tea-200', 'tea-250']);
  assert.equal(targetResolver(inputs)(identity('tea-presentation', 'foreign')).reason, 'invalid-identity');
});
test('S4 fixed Product has one fixed definition without invented weight', () => {
  const i = item('teapot-pharaoh-presentation', null);
  assert.equal(line([i]).definition.configuration.kind, 'fixed');
  assert.equal(card(i.productKey).weight, undefined); assert.equal(line([i]).availability, 'available');
});
test('S5 missing Product keeps canonical snapshot and safe removal', () => {
  const i = item('missing', 'missing-slot'); const l = line([i]);
  assert.equal(l.item, i); assert.equal(l.canRemove, true); assert.equal(l.canIncrease, false);
  assert.equal(basket([i], views).groups[0].product.title, i.presentation.title);
});
test('S6 malformed and excluded preorder data is explicit, not repaired', () => {
  assert.ok(views.issues.some(i => i.productKey === 'preorder-tea-presentation' && i.code === 'excluded-preorder'));
  assert.equal(record('preorder-tea-presentation').purchase.definitions.length, 1);
  const inputs = change(s => s.products[0].purchase.definitions.pop());
  assert.ok(issue(inputs, 'definition')); assert.equal(card('tea-presentation', inputs), undefined);
  assert.equal(line([item()], inputs).quote.status, 'invalid-pricing-data');
});
test('S7 detached construction and deep immutability protect every nested consumer input', () => {
  const producer = clone(), owned = construct(producer); producer.products[0].commerce.prices[0].currentUnit.minor = 7;
  assert.equal(owned.products[0].commerce.prices[0].currentUnit.minor, 103000);
  assert.throws(() => { owned.products[0].availability[0].status = 'available-again'; }, TypeError);
  assert.throws(() => { application.cards[0].weight.configurations.push({}); }, TypeError);
  assert.ok(Object.isFrozen(owned.products[0].presentation.image));
});
test('S8 stable identity crosses Card, F1, Cart, Widget and Basket', () => {
  for (const p of application.cards) {
    const fixed = p.kind === 'ceramics' || p.weight.presentation === 'fixed';
    const ids = fixed ? [null] : p.weight.configurations.map(o => o.id);
    for (const id of ids) {
      const i = item(p.slug, id); assert.equal(line([i]).item.id, i.id);
      assert.equal(widgetRows([i], 'unavailable', application.widgetAvailability)[0].id, i.id);
      if (!fixed) assert.deepEqual(application.resolveTransferTarget(i).identity, identity(p.slug, id));
    }
  }
});
test('S9 all numeric fixture prices are positive safe integer RUB kopeks', () => {
  for (const p of snapshot.products) for (const price of p.commerce.prices) for (const amount of [price.originalUnit, price.currentUnit]) {
    assert.equal(amount.currency, 'RUB'); assert.ok(Number.isSafeInteger(amount.minor) && amount.minor > 0);
  }
});
test('S10 confirmed none has equal money and no badge/original/savings', () => {
  const p = basket([item()], views), c = card('tea-presentation');
  assert.equal(c.price.discount, undefined); assert.equal(p.groups[0].badge, undefined);
  assert.equal(p.groups[0].showSavings, false); assert.equal(p.totals.discountAmount.minor, 0);
});
test('S11 confirmed active retains explicit pairs, not a percent formula', () => {
  const q = line([item('discount-tea-presentation', 'discount-50', 4)]).quote;
  assert.equal(q.originalLine.minor, 340000); assert.equal(q.currentLine.minor, 256000);
  assert.equal(q.lineSavings.minor, 84000); assert.equal(card('discount-tea-presentation').price.discount.label, '−25%');
});
test('S12 all configurations use the same Product policy revision', () => {
  const p = record('discount-tea-presentation');
  assert.ok(p.commerce.prices.every(price => price.policyRevision === p.commerce.policy.policyRevision));
  assert.ok(p.commerce.prices.every(price => price.originalUnit.minor > price.currentUnit.minor));
});
test('S13 invalid badge hides metadata without destroying valid quotes', () => {
  const inputs = change(s => { s.products[1].commerce.policy.percentage.basisPoints = 20000; });
  assert.ok(issue(inputs, 'badge')); assert.equal(line([item('discount-tea-presentation', 'discount-50')], inputs).quote.status, 'ready');
  assert.equal(card('discount-tea-presentation', inputs).price.discount.label, '');
});
test('S14 stale policy revision is diagnosed and never mixed into current quotes', () => {
  const inputs = change(s => { s.products[0].commerce.prices[1].policyRevision = 'stale'; });
  assert.ok(issue(inputs, 'revision')); assert.equal(quote(item(), inputs).status, 'unavailable');
  assert.equal(line([item()], inputs).quote.status, 'stale');
});
test('S15 invalid money and overflow never become zero or stale strings', () => {
  const inputs = change(s => { s.products[0].commerce.prices[0].currentUnit.minor = 0; });
  assert.ok(issue(inputs, 'money')); assert.equal(quote(item(), inputs).status, 'unavailable');
  const i = item('tea-presentation', 'tea-50', Number.MAX_SAFE_INTEGER);
  assert.equal(quote(i).status, 'unavailable'); assert.equal(line([i]).quote.status, 'aggregation-overflow');
});
test('S16 construction never reads/parses old display prices', () => {
  const legacy = load('features/product/ProductCard/product-card.fixtures');
  const poisoned = structuredClone(legacy);
  for (const { data } of poisoned.productCardExamples) {
    Object.defineProperty(data, 'price', { get() { throw new Error('display price read'); } });
    if (data.weight?.presentation === 'selectable') for (const o of data.weight.configurations) Object.defineProperty(o, 'price', { get() { throw new Error('configuration display price read'); } });
  }
  const separate = loader({ 'features/product/ProductCard/product-card.fixtures': poisoned });
  const built = separate('features/product-input/product-input.application').applicationProductInputs;
  assert.equal(built.cards[0].price.current, '1 030 ₽');
});
test('S17 Card current strings come from exact numeric current prices', () => {
  for (const p of application.cards) {
    const source = record(p.slug), options = p.weight?.presentation === 'selectable' ? p.weight.configurations : [{ price: p.price }];
    options.forEach((o, index) => assert.equal(o.price.current, money(source.commerce.prices[index].currentUnit)));
  }
});
test('S18 Card original strings come from explicit original prices', () => {
  const c = card('discount-tea-presentation');
  c.weight.configurations.forEach((o, index) => assert.equal(o.price.discount.original, money(record(c.slug).commerce.prices[index].originalUnit)));
});
test('S19 Cart prepared line price handles Q > 1 using shared quote', () => {
  assert.deepEqual(quote(item('tea-presentation', 'tea-100', 3)), { status: 'ready', displayLinePrice: '5 940 ₽' });
});
test('S20 Basket uses exact current unit multiplied by Q', () => {
  assert.equal(line([item('tea-presentation', 'tea-100', 3)]).quote.currentLine.minor, 594000);
});
test('S21 all purchasable identities have Cart/Basket parity for several Q', () => {
  for (const p of application.cards) for (const price of record(p.slug).commerce.prices) for (const quantity of [1, 2, 7, 101]) {
    const i = { ...item(), ...price.identity, id: cart.getCartItemId(price.identity), quantity };
    assert.equal(quote(i).displayLinePrice, money(line([i]).quote.currentLine));
  }
});
test('S22 F1 uses shared target definition and shared target price', () => {
  const source = item('tea-presentation', 'tea-50', 2);
  const result = cart.transferConfiguration([source], { expectedSource: source, target: identity('tea-presentation', 'tea-100') }, application.resolveTransferTarget, application.resolvePricing);
  assert.equal(result.result.ok, true); assert.equal(result.items[0].pricing.displayLinePrice, '3 960 ₽');
  assert.equal(result.items[0].pricing.displayLinePrice, money(line(result.items).quote.currentLine));
});
test('S23 Widget status matches Basket for available/unavailable/fixed/unknown', () => {
  for (const i of [item(), item('availability-tea-presentation', 'availability-200'), item('teapot-pharaoh-presentation', null), item('missing', 'foreign')]) {
    const row = widgetRows([i], 'unavailable', application.widgetAvailability)[0];
    assert.equal(row.unavailable === true, line([i]).availability !== 'available');
  }
});
test('S24 identity and canonical quantities are never rebuilt from labels or title', () => {
  const inputs = change(s => { s.products[0].presentation.title = 'New title'; });
  const i = item(); assert.equal(basket([i], inputs).groups[0].lines[0].item, i);
  assert.deepEqual(targetResolver(inputs)(i).identity, identity()); assert.equal(i.presentation.title, 'Canonical snapshot title');
});
test('S25 available target is explicitly validated', () => {
  assert.equal(application.resolveTransferTarget(identity()).available, true);
});
test('S26 unavailable target rejects atomically and keeps source reference', () => {
  const source = item('availability-tea-presentation', 'availability-50'), items = [source];
  const result = cart.transferConfiguration(items, { expectedSource: source, target: identity(source.productKey, 'availability-200') }, application.resolveTransferTarget, application.resolvePricing);
  assert.equal(result.result.reason, 'unavailable'); assert.equal(result.items, items);
});
test('S27 unknown Product fails target validation and availability', () => {
  assert.equal(application.resolveTransferTarget(identity('missing', 'x')).reason, 'validation-unavailable');
  assert.equal(line([item('missing', 'x')]).availability, 'unknown');
});
test('S28 unknown configuration is not authorized by current Product', () => {
  assert.equal(application.resolveTransferTarget(identity('tea-presentation', 'foreign')).reason, 'invalid-identity');
  assert.equal(line([item('tea-presentation', 'foreign')]).canIncrease, false);
});
test('S29 fixed quote works while F1 retains existing fixed-target rejection', () => {
  const i = item('pressed-puer-presentation', null, 2);
  assert.equal(quote(i).displayLinePrice, '3 000 ₽'); assert.equal(application.resolveTransferTarget(i).reason, 'invalid-identity');
});
test('S30 transfer merge uses actual target Q and preserves exact post-merge parity', () => {
  const source = item('discount-tea-presentation', 'discount-50', 2), target = item(source.productKey, 'discount-100', 3);
  const result = cart.transferConfiguration([source, target], { expectedSource: source, target }, application.resolveTransferTarget, application.resolvePricing);
  assert.equal(result.result.value.outcome, 'merged'); assert.equal(result.items.length, 1); assert.equal(result.items[0].quantity, 5);
  assert.equal(result.items[0].pricing.displayLinePrice, '6 000 ₽'); assert.equal(line(result.items).quote.currentLine.minor, 600000);
});
test('S31 missing Product remains removable using canonical Cart command', () => {
  const i = item('missing', 'foreign'); assert.equal(line([i]).canRemove, true);
  assert.deepEqual(cart.removeItem([i], i.id).items, []);
});
test('S32 availability retains existing line and permits decrease/remove', () => {
  const i = item('availability-tea-presentation', 'availability-200', 3);
  const l = line([i]); assert.equal(l.item, i); assert.equal(l.canIncrease, false); assert.equal(l.canDecrease, true);
  assert.equal(cart.setItemQuantity([i], i.id, 2, application.resolvePricing).result.ok, true);
  assert.equal(cart.removeItem([i], i.id).result.ok, true);
});
test('S33 real application imports inject the shared generation into Provider, RootLayout and DailyTop', () => {
  const { CartApplicationProvider } = load('features/cart/CartApplicationProvider');
  const element = CartApplicationProvider({ children: 'server children' });
  assert.equal(element.type, cartProvider); assert.equal(element.props.children, 'server children');
  assert.equal(element.props.resolvePricing, application.resolvePricing);
  assert.equal(element.props.resolveTransferTarget, application.resolveTransferTarget);
  const root = load('app/layout').default({ children: 'page' });
  assert.equal(walk(root).find(e => e.type === widget).props.availability, application.widgetAvailability);
  const daily = load('features/home/DailyTop/daily-top.data').homeDailyTopProducts;
  assert.equal(daily.length, 4); for (const p of daily) assert.ok(application.cards.includes(p));
});
test('S34 application never imports the independent old Cart numeric resolver', () => {
  const separate = loader({ 'features/cart/cart-pricing.fixtures': new Proxy({}, { get() { throw new Error('legacy quote used'); } }) });
  const { CartApplicationProvider } = separate('features/cart/CartApplicationProvider');
  assert.equal(CartApplicationProvider({ children: null }).props.resolvePricing(item('tea-presentation', 'tea-50', 3)).displayLinePrice, '3 090 ₽');
});
test('S35 existing CartItem prepared pricing is not dynamically refreshed by new inputs', () => {
  const created = cart.addItem([], item(), application.resolvePricing).result.value.item;
  const inputs = change(s => { s.products[0].commerce.prices[0].currentUnit.minor = 104000; s.products[0].commerce.prices[0].originalUnit.minor = 104000; });
  assert.equal(quote(created, inputs).displayLinePrice, '1 040 ₽'); assert.equal(created.pricing.displayLinePrice, '1 030 ₽');
});
test('S36 snapshot provenance is fixture-only and cannot claim backend authority', () => {
  const p = basket([item()], views); assert.equal(p.authority, 'fixture');
  assert.ok(checkout(p).reasons.includes('fixture-only-authority'));
  const inputs = change(s => { s.context.source = 'backend'; }); assert.ok(issue(inputs, 'snapshot'));
});
test('S37 Checkout is never enabled', () => {
  assert.equal(checkout(basket([item()], views)).checkoutActionAvailable, false);
});
test('S38 protected baseline and exact allowed wiring semantics remain intact', () => {
  const { verifyRepository } = Module.createRequire(import.meta.url)('./product-input-protection.cjs');
  verifyRepository(path.resolve(frontend, '..'));
  const providerSource = fs.readFileSync(path.join(frontend, 'features/cart/CartApplicationProvider.tsx'), 'utf8');
  const ast = ts.createSourceFile('provider.tsx', providerSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const functions = ast.statements.filter(ts.isFunctionDeclaration);
  assert.equal(functions.length, 1); assert.equal(functions[0].body.statements.length, 1);
  assert.ok(ts.isReturnStatement(functions[0].body.statements[0]));
  assert.equal(ast.statements.filter(s => ts.isVariableStatement(s)).length, 0);
  const i = Object.freeze({ ...item(), presentation: Object.freeze(item().presentation), pricing: Object.freeze({ status: 'unavailable' }) });
  const original = JSON.stringify(i), rows = widgetRows(Object.freeze([i]), 'missing price', application.widgetAvailability);
  assert.equal(JSON.stringify(i), original); assert.equal(rows[0].id, i.id); assert.equal(rows[0].quantity, i.quantity);
  assert.equal(rows[0].displayLinePrice, 'missing price'); assert.equal('items' in application, false);
});
test('S39 no second Cart store or hidden optimistic mutation is introduced', () => {
  const source = item(), items = Object.freeze([source]);
  basket(items, views); application.resolvePricing(source); application.resolveTransferTarget(identity());
  widgetRows(items, 'unavailable', application.widgetAvailability);
  assert.equal(items[0], source); assert.equal(items[0].quantity, 1);
  const result = cart.transferConfiguration(items, { expectedSource: { ...source }, target: identity('tea-presentation', 'tea-100') }, application.resolveTransferTarget, application.resolvePricing);
  assert.equal(result.result.reason, 'conflict'); assert.equal(result.items, items);
});
test('S40 integration preserves Gate 8B partial coverage/issues and canonical references', () => {
  const inputs = change(s => { s.products[0].commerce.prices.pop(); });
  const items = [item(), item('tea-presentation', 'tea-250')];
  const projected = basket(items, inputs);
  assert.deepEqual(projected, directBasket(items, inputs.products, inputs.bundles, inputs.snapshot.context, inputs.availability));
  assert.equal(projected.coverage, 'partially-unavailable'); assert.equal(projected.totals, undefined);
  assert.equal(projected.groups[0].lines[1].item, items[1]); assert.ok(issue(inputs, 'price-missing'));
});

for (const amount of [NaN, Infinity, -1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1]) test(`edge invalid money ${amount}`, () => {
  const inputs = change(s => { s.products[0].commerce.prices[0].currentUnit.minor = amount; });
  assert.ok(issue(inputs, 'money')); assert.equal(quote(item(), inputs).status, 'unavailable');
});
for (const patch of [{ source: 'backend' }, { catalogRevision: 'stale' }, { pricingRevision: 'stale' }]) test(`edge context conflict ${JSON.stringify(patch)}`, () => {
  const inputs = change(s => { s.products[0].commerce.prices[0].context = { ...s.context, ...patch }; });
  assert.ok(issue(inputs, 'revision')); assert.equal(line([item()], inputs).quote.status, 'stale');
});
test('edge unavailable/invalid/absent policies never become none', () => {
  for (const status of ['unavailable', 'invalid', undefined]) {
    const inputs = change(s => { if (status) s.products[0].commerce.policy.status = status; else delete s.products[0].commerce.policy; });
    assert.ok(issue(inputs, 'policy')); assert.notEqual(line([item()], inputs).quote.status, 'ready');
    assert.equal(card('tea-presentation', inputs), undefined);
  }
});
test('edge duplicate configuration, prices and availability fail closed', () => {
  for (const mutate of [s => { s.products[0].purchase.definitions[1] = s.products[0].purchase.definitions[0]; },
    s => s.products[0].commerce.prices.push(s.products[0].commerce.prices[0]),
    s => s.products[0].availability.push(s.products[0].availability[0])]) {
    const inputs = change(mutate); assert.ok(inputs.issues.length > views.issues.length);
    assert.equal(card('tea-presentation', inputs), undefined); assert.equal(line([item()], inputs).canRemove, true);
  }
});
test('edge partial Product and malformed snapshot do not crash consumers', () => {
  for (const mutate of [s => { delete s.products[0].purchase; }, s => { delete s.products[0].presentation; },
    s => { s.products[0].commerce = null; }, s => { s.products[0].availability = null; }]) {
    const inputs = change(mutate); assert.ok(inputs.issues.length); assert.doesNotThrow(() => cards(inputs));
    assert.doesNotThrow(() => basket([item()], inputs)); assert.equal(line([item()], inputs).canRemove, true);
  }
  const inputs = prepare({ ...snapshot, products: null }); assert.ok(issue(inputs, 'snapshot')); assert.deepEqual(cards(inputs), []);
});
test('edge fixed unavailable keeps current CartItem but excludes unsafe fixed Card purchase', () => {
  const inputs = change(s => { s.products.find(p => p.productKey === 'teapot-pharaoh-presentation').availability[0].status = 'unavailable'; });
  const i = item('teapot-pharaoh-presentation', null, 2);
  assert.equal(card(i.productKey, inputs), undefined); assert.equal(line([i], inputs).availability, 'unavailable');
  assert.ok(issue(inputs, 'fixed-purchase-unavailable'));
  assert.equal(widgetRows([i], 'unavailable', availability(inputs))[0].unavailable, true);
  assert.equal(line([i], inputs).item, i); assert.equal(line([i], inputs).quote.status, 'ready');
});
test('edge missing/unknown availability never authorizes F1 increase', () => {
  for (const status of ['unknown', 'not-purchasable', 'unavailable']) {
    const inputs = change(s => { s.products[0].availability[0].status = status; });
    const result = targetResolver(inputs)(identity()); assert.ok(!result.ok || !result.available);
    assert.equal(line([item()], inputs).canIncrease, false);
    assert.equal(widgetRows([item()], 'unavailable', availability(inputs))[0].unavailable, true);
  }
  assert.equal(widgetRows([item()], 'unavailable', [])[0].unavailable, true);
});
test('edge fractional kopeks formatting is exact and parity does not reapply percentage', () => {
  const inputs = change(s => { const p = s.products[1]; for (const price of p.commerce.prices) { price.originalUnit.minor = 101; price.currentUnit.minor = 86; } });
  const i = item('discount-tea-presentation', 'discount-50', 4);
  assert.equal(quote(i, inputs).displayLinePrice, '3,44 ₽'); assert.equal(line([i], inputs).quote.currentLine.minor, 344);
});
test('edge unavailable source can transfer to available target, stale source cannot', () => {
  const source = item('availability-tea-presentation', 'availability-200', 2);
  const result = cart.transferConfiguration([source], { expectedSource: source, target: identity(source.productKey, 'availability-50') }, application.resolveTransferTarget, application.resolvePricing);
  assert.equal(result.result.ok, true); assert.equal(result.items[0].pricing.displayLinePrice, '2 060 ₽');
  assert.equal(result.items[0].pricing.displayLinePrice, money(line(result.items).quote.currentLine));
});

test('edge invalid currency is typed without conversion or a Card price', () => {
  const inputs = change(s => { s.products[0].commerce.prices[0].currentUnit.currency = 'USD'; });
  assert.ok(issue(inputs, 'money')); assert.equal(line([item()], inputs).quote.status, 'incompatible-currency');
  assert.equal(quote(item(), inputs).status, 'unavailable'); assert.equal(card('tea-presentation', inputs), undefined);
});
test('edge large safe Q and aggregate overflow retain exact line amounts and no full total', () => {
  const quantity = Number(BigInt(Number.MAX_SAFE_INTEGER) / BigInt(103000));
  const a = item('tea-presentation', 'tea-50', quantity), b = item('tea-presentation', 'tea-100', 1);
  assert.equal(quote(a).displayLinePrice, money(line([a]).quote.currentLine));
  const inputs = change(s => { const p = s.products[0].commerce.prices[1]; p.originalUnit.minor = 198000000; p.currentUnit.minor = 198000000; });
  const projected = basket([a, b], inputs); assert.equal(projected.coverage, 'complete');
  assert.equal(projected.totals, undefined); assert.ok(projected.issues.some(i => i.code === 'aggregation-overflow'));
});
test('edge null snapshot yields typed issues and safe missing-Cart projection', () => {
  const inputs = prepare(null); assert.ok(issue(inputs, 'snapshot'));
  assert.deepEqual(cards(inputs), []); assert.equal(quote(item(), inputs).status, 'unavailable');
  assert.equal(basket([item()], inputs).groups[0].lines[0].canRemove, true);
});
test('edge invalid mood metadata never reaches a purchasable renderer', () => {
  const inputs = change(s => { s.products[0].presentation.moods[0] = null; });
  assert.ok(issue(inputs, 'presentation')); assert.equal(card('tea-presentation', inputs), undefined);
  assert.equal(line([item()], inputs).canRemove, true);
});
test('edge configuration label/weight mismatch and missing/extra slots are never repaired', () => {
  for (const mutate of [s => { s.products[0].purchase.definitions[0].label = '100 г.'; },
    s => { s.products[0].purchase.definitions[0].weightGrams = 75; },
    s => { s.products[0].purchase.definitions.push({ ...s.products[0].purchase.definitions[0], configuration: { kind: 'selectable', id: 'new' } }); }]) {
    const inputs = change(mutate); assert.ok(issue(inputs, 'definition'));
    assert.equal(card('tea-presentation', inputs), undefined); assert.equal(line([item()], inputs).canIncrease, false);
  }
});
test('edge source conflicts and invalid price identities are diagnosed', () => {
  for (const mutate of [s => { s.products[0].commerce.productKey = 'foreign'; },
    s => { s.products[0].commerce.prices[0].identity = identity('foreign', 'foreign'); },
    s => { s.products[0].availability[0].identity = identity('foreign', 'foreign'); }]) {
    const inputs = change(mutate); assert.ok(inputs.issues.some(i => i.productKey === 'tea-presentation'));
    assert.equal(card('tea-presentation', inputs), undefined); assert.equal(line([item()], inputs).canRemove, true);
  }
});
