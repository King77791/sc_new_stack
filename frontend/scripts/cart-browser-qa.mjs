// Requires a separately started dev server and Chrome with --remote-debugging-port.
// Uses only Node built-ins; no test/browser dependency is installed.
import assert from 'node:assert/strict';

const baseUrl = process.env.CART_QA_URL ?? 'http://localhost:3010';
const debugUrl = process.env.CART_QA_CHROME ?? 'http://127.0.0.1:9333';
const target = await fetch(`${debugUrl}/json/new?about:blank`, { method: 'PUT' }).then(response => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
const problems = [];
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') problems.push(message.params.exceptionDetails);
  if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(message.params.type)) {
    problems.push(message.params);
  }
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function waitFor(expression) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${expression}`);
}
const waitForHydration = () => waitFor(`(() => {
  const node = [...document.querySelectorAll('button')].find(button => button.textContent === 'ADD target');
  const key = node && Object.keys(node).find(key => key.startsWith('__reactProps$'));
  return !!key && typeof node[key].onClick === 'function';
})()`);
async function click(text) {
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(node => node.textContent === ${JSON.stringify(text)});
    if (!button || button.disabled) throw new Error('Button unavailable: ' + ${JSON.stringify(text)});
    button.click();
  })()`);
  await waitFor(`!!document.querySelector('select') && ![...document.querySelectorAll('button')].find(node => node.textContent === 'ADD target').disabled`);
}
async function selectTarget(index) {
  await evaluate(`(() => { const node = document.querySelector('select'); node.value = '${index}'; node.dispatchEvent(new Event('change', { bubbles: true })); })()`);
}
async function quantity(value) {
  await evaluate(`(() => {
    const node = document.querySelector('input[inputmode="decimal"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, ${JSON.stringify(String(value))});
    node.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
}
const items = () => evaluate(`JSON.parse(document.querySelector('[data-testid="items"]').textContent)`);
const result = () => evaluate(`JSON.parse(document.querySelector('[data-testid="result"]').textContent)`);
async function count(expected) {
  await waitFor(`document.querySelector('[data-testid="summary"]')?.textContent === 'itemCount = ${expected}; hasItems = ${expected > 0}'`);
  assert.equal((await items()).length, expected);
}

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${baseUrl}/dev/cart-state` });
  await waitFor(`!!document.querySelector('select')`);
  await waitForHydration();
  // Prove that a hydrated event handler is live, then reset.
  await click('ADD target');
  await count(1);
  await click('Remount Provider (reset)');
  await count(0);

  await click('ADD target'); await count(1); // A
  await selectTarget(1); await click('ADD target'); await count(2); // B
  await selectTarget(0); await click('ADD target'); await count(2); // C
  assert.equal((await items())[0].quantity, 2);
  assert.equal((await result()).value.addedQuantity, 1);
  await selectTarget(4); await click('ADD target'); await count(3); // D
  await selectTarget(5); await click('ADD target'); await count(4); // E
  await selectTarget(0); await click('REMOVE target'); await count(3); // F
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[data-testid="quantities"] output'), node => Number(node.textContent))`), [0, 1, 0, 0, 1, 1]);
  for (const target of [1, 4, 5]) { await selectTarget(target); await click('REMOVE target'); }
  await count(0); // G
  console.log('PASS: browser scenarios A–G, shared observers and selectors');

  await selectTarget(0);
  await click('ADD twice in one batch');
  await count(1);
  assert.equal((await items())[0].quantity, 2);
  await quantity(1); await click('SET target');
  assert.equal((await items())[0].quantity, 1);
  for (const value of [0, -1, 1.5, 'NaN', 'Infinity']) {
    await quantity(value); await click('ADD target');
    assert.equal((await result()).reason, 'invalid-quantity');
    await click('SET target');
    assert.equal((await result()).reason, 'invalid-quantity');
    assert.equal((await items())[0].quantity, 1);
  }
  await quantity(1); await click('ADD with refreshed title');
  assert.match((await items())[0].presentation.title, /snapshot refreshed/);
  assert.equal((await items())[0].quantity, 2);
  await quantity(20); await click('SET target');
  assert.deepEqual((await items())[0].pricing, { status: 'unavailable' });
  assert.equal((await items())[0].quantity, 20);
  await selectTarget(5); await quantity(1); await click('ADD twice in one batch');
  assert.equal((await items())[1].quantity, 2);
  console.log('PASS: batching, SET, invalid inputs, snapshot refresh, missing pricing and fixed merge');

  const before = await items();
  await click('Remount consumer');
  assert.deepEqual(await items(), before);
  await evaluate(`window.__cartQaNavigationMarker = 'same-document'; document.querySelector('a[href="/dev/cart-state/observer"]').click()`);
  await waitFor(`location.pathname === '/dev/cart-state/observer' && !document.querySelector('select') && !!document.querySelector('[data-testid="items"]')`);
  assert.deepEqual(await items(), before);
  assert.equal(await evaluate(`window.__cartQaNavigationMarker`), 'same-document');
  await evaluate(`document.querySelector('a[href="/dev/cart-state"]').click()`);
  await waitFor(`location.pathname === '/dev/cart-state' && !!document.querySelector('select')`);
  assert.deepEqual(await items(), before);

  for (const width of [1280, 1440, 1920]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
    const layout = await evaluate(`(() => { const node = document.querySelector('main'); const rect = node.getBoundingClientRect(); return { width: rect.width, left: rect.left }; })()`);
    assert.ok(layout.width > 0 && layout.left >= 0);
    console.log(`PASS: viewport ${width}, no horizontal overflow`);
  }
  await click('Remount Provider (reset)'); await count(0);
  await click('ADD target'); await count(1);
  await send('Page.reload');
  await waitFor(`!!document.querySelector('select')`);
  await waitForHydration();
  await count(0);
  console.log('PASS: consumer remount, client navigation, Provider remount and reload lifecycle');
  assert.deepEqual(problems, [], 'Browser exceptions or console warnings/errors');
  console.log('PASS: browser exceptions = 0; console warnings/errors = 0 (including React, hydration, duplicate keys)');
} finally {
  socket.close();
  await fetch(`${debugUrl}/json/close/${target.id}`);
}
