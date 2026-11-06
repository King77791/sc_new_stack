import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import Module from 'node:module';
const { verifyTestFile, verifyContents } = Module.createRequire(import.meta.url)('./product-input-protection.cjs');
const baseline = JSON.parse(fs.readFileSync(new URL('./product-input-protection.baseline.json', import.meta.url), 'utf8'));
const original = execFileSync('git', ['show', `${baseline.revision}:frontend/scripts/basket-pricing.test.mjs`], { encoding: 'utf8' });

// Execute the actual R29 assertion with deterministic simulated git outputs.
// No protected file, index or HEAD is modified to test rejection behavior.
const source = fs.readFileSync(new URL('./basket-pricing.test.mjs', import.meta.url), 'utf8');
const start = source.indexOf("test('R29 protected tracked files match HEAD'");
const end = source.indexOf("test('R30 ", start);
const section = source.slice(start, end);
const body = section.slice(section.indexOf('  const targets'), section.lastIndexOf('});'));
const run = new Function('assert', 'execFileSync', `const root = '.';\n${body}`);
const allowed = ['frontend/features/cart/CartApplicationProvider.tsx', 'frontend/features/cart/cart-widget.adapter.ts'];
function check(paths) {
  run(assert, (command, args) => {
    assert.equal(command, 'git');
    assert.deepEqual(args.slice(0, 5), ['diff', 'HEAD', '--name-only', '--', 'AGENTS.md']);
    assert.ok(args.includes('frontend/features/cart'));
    assert.ok(args.includes('frontend/features/product/ProductCard'));
    return paths.join('\n');
  });
}

test('CR-9B1-01 R29 accepts clean state and exactly the two wiring paths', () => {
  check([]); check(allowed);
  for (const path of allowed) check([path]);
});

for (const path of [
  'AGENTS.md', 'knowledge/domain.md', 'frontend/features/cart/cart.model.ts',
  'frontend/features/cart/cart.types.ts', 'frontend/features/cart/CartProvider.tsx',
  'frontend/features/cart/cart-transfer-product.adapter.ts', 'frontend/features/cart/cart-pricing.fixtures.ts',
  'frontend/features/cart/CartApplicationProvider.tsx.extra', 'frontend/features/cart/cart-widget.adapter.ts.extra',
  'frontend/features/cart/CartWidget/CartWidget.tsx',
  'frontend/features/product/ProductCard/ProductCard.tsx',
  'frontend/components/SiteHeader/SiteHeader.tsx', 'frontend/styles/tokens.css',
]) test(`CR-9B1-01 R29 still rejects ${path}`, () => {
  assert.throws(() => check([path]), assert.AssertionError);
  assert.throws(() => check([...allowed, path]), assert.AssertionError);
});

test('CR-9B1-02 accepts the exact approved R29/R30 correction against independent baseline', () => {
  assert.equal(baseline.revision, '7689095178f65ee2f28e084e35e88c586d006d06');
  verifyTestFile(source, original);
});
const mutations = {
  'outside content': s => s.replace("test('R1 no discount", "test('CHANGED R1 no discount"),
  'R29 deletion': s => s.slice(0, start) + s.slice(end),
  'R30 deletion': s => s.replace(/test\('R30[^]*?\n\}\);/, ''),
  'R29 rename': s => s.replace('R29 protected tracked', 'RENAMED protected tracked'),
  'R30 rename': s => s.replace('R30 legacy regression', 'RENAMED legacy regression'),
  'empty R29 assertions': s => s.replace("assert.deepEqual(changed.filter(filename => !allowed.has(filename)), []);", 'assert.ok(true);'),
  'empty R30 assertions': s => s.replace('assert.doesNotThrow(() => verifyRepository(root));', 'assert.ok(true);'),
  'directory exclusion': s => s.replace("allowed.has(filename)", "filename.startsWith('frontend/features/cart/')"),
  'expanded block': s => s.replace('  const targets =', '  /* larger region */ const targets ='),
  'moved guard outside': s => s.replace('  assert.doesNotThrow(() => verifyRepository(root));', '').concat('\nassert.ok(true);\n'),
};
for (const [name, mutate] of Object.entries(mutations)) test(`CR-9B1-02 rejects ${name}`, () => {
  assert.throws(() => verifyTestFile(mutate(source), original), assert.AssertionError);
});

for (const filename of ['frontend/scripts/cart-domain.test.mjs', 'frontend/scripts/cart-transfer-product.test.mjs',
  'frontend/features/cart/cart.model.ts', 'frontend/features/cart/CartProvider.tsx', 'frontend/features/cart/cart.types.ts',
  'frontend/features/cart/cart-transfer-product.adapter.ts']) test(`fixed baseline rejects even committed changes to ${filename}`, () => {
  // The guard reads no current HEAD. A new commit containing this content still fails.
  assert.throws(() => verifyContents([filename], () => 'changed and committed', () => 'approved baseline'), assert.AssertionError);
});
test('fixed baseline still allows only the two approved wiring files', () => {
  verifyContents(allowed, () => 'approved wiring change', () => 'old wiring');
});
