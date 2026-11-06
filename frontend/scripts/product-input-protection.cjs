/* eslint-disable @typescript-eslint/no-require-imports -- R30 is an existing synchronous test; its guard must be synchronously requireable. */
/* Gate 9B-1 protection contract. Changes to this guard/baseline require review.
 * The fixed Git object ID is independent of current HEAD, including after commits.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const ts = require('typescript');
const baseline = require('./product-input-protection.baseline.json');
const main = 'frontend/scripts/basket-pricing.test.mjs';
const names = ['R29 protected tracked files match HEAD', 'R30 legacy regression suite files remain unchanged (executed separately)'];
const normalize = text => text.replace(/\r\n/g, '\n');
const hash = text => createHash('sha256').update(text).digest('hex');

function splitTests(text) {
  text = normalize(text);
  const file = ts.createSourceFile(main, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(file.parseDiagnostics.length, 0, 'Invalid test syntax');
  const bodies = {};
  const regions = [];
  for (const statement of file.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) continue;
    const call = statement.expression;
    if (call.expression.getText(file) !== 'test' || !call.arguments[0] || !ts.isStringLiteral(call.arguments[0])) continue;
    const name = call.arguments[0].text;
    if (!names.includes(name)) continue;
    assert.ok(!bodies[name], 'Duplicate protected test');
    const callback = call.arguments[1];
    assert.ok(callback && ts.isArrowFunction(callback) && ts.isBlock(callback.body), 'Protected test must have its original block');
    const start = callback.body.getStart(file) + 1, end = callback.body.end - 1;
    bodies[name] = text.slice(start, end);
    regions.push({ start, end, name });
  }
  assert.equal(regions.length, 2, 'Missing or renamed protected test');
  for (const r of regions.sort((a, b) => b.start - a.start)) text = text.slice(0, r.start) + `/* protected body: ${r.name} */` + text.slice(r.end);
  return { outside: text, bodies };
}

function verifyTestFile(current, original) {
  const actual = splitTests(current), old = splitTests(original);
  assert.equal(actual.outside, old.outside, 'Existing content outside R29/R30 changed');
  for (const name of names) assert.equal(hash(actual.bodies[name]), baseline.approvedBodies[name], `Unapproved ${name} body`);
}

const wiring = new Set(['frontend/features/cart/CartApplicationProvider.tsx', 'frontend/features/cart/cart-widget.adapter.ts']);
function protectedPath(filename) {
  return filename === 'AGENTS.md' || ['knowledge/', 'frontend/scripts/', 'frontend/features/cart/',
    'frontend/features/product/ProductCard/', 'frontend/components/SiteHeader/', 'frontend/components/SiteFooter/',
    'frontend/components/Notification/', 'frontend/styles/'].some(prefix => filename.startsWith(prefix))
    || filename === 'frontend/lib/focus-ownership.ts' || filename === 'frontend/app/globals.css'
    || /^frontend\/features\/basket\/(basket-money|basket-pricing.types|basket-pricing.quote|basket-pricing.projection|basket-product.adapter|basket-checkout-eligibility)\.ts$/.test(filename);
}

/** Injected readers in deterministic tests simulate committed violations without modifying Git. */
function verifyRepository(root, readCurrent = filename => fs.readFileSync(path.join(root, filename), 'utf8')) {
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const files = git(['ls-tree', '-r', '--name-only', baseline.revision]).trim().split('\n');
  verifyContents(files, readCurrent, filename => git(['show', `${baseline.revision}:${filename}`]));
}
function verifyContents(files, readCurrent, readOriginal) {
  for (const filename of files.filter(protectedPath)) {
    if (wiring.has(filename)) continue;
    const original = readOriginal(filename);
    const current = readCurrent(filename);
    if (filename === main) verifyTestFile(current, original);
    else assert.equal(normalize(current), normalize(original), `Protected baseline changed: ${filename}`);
  }
}
module.exports = { splitTests, verifyTestFile, verifyRepository, verifyContents, protectedPath };
