// Targeted integration QA using Chrome DevTools and Node built-ins only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base = process.env.CART_QA_URL ?? 'http://localhost:3012';
const debug = process.env.CART_QA_CHROME ?? 'http://127.0.0.1:9334';
const target = await fetch(`${debug}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const requests = new Map();
const problems = [];
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const request = requests.get(message.id);
    clearTimeout(request.timer);
    requests.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') problems.push(message.params);
  if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(message.params.type)) problems.push(message.params);
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 45000);
    requests.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}
async function waitFor(expression) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  throw new Error(`Timed out: ${expression}`);
}
const q = JSON.stringify;
const scope = id => `document.querySelector('[data-card="${id}"]')`;
const visible = `node => !!node.getClientRects().length`;
async function clickSelector(selector) {
  await evaluate(`(() => { const node = document.querySelector(${q(selector)}); if (!node || node.disabled) throw new Error('Unavailable: ' + ${q(selector)}); node.click(); })()`);
}
async function clickText(text) {
  await evaluate(`(() => { const node = [...document.querySelectorAll('button')].find(node => node.textContent === ${q(text)}); if (!node || node.disabled) throw new Error('Unavailable: ' + ${q(text)}); node.click(); })()`);
}
async function cardClick(id, selector) {
  await evaluate(`(() => { const node = [...${scope(id)}.querySelectorAll(${q(selector)})].find(${visible}); if (!node || node.disabled) throw new Error('Card control unavailable'); node.click(); })()`);
}
async function width(value) {
  await send('Emulation.setDeviceMetricsOverride', { width: value, height: 1000, deviceScaleFactor: 1, mobile: false });
  await waitFor(`window.innerWidth === ${value}`);
}
const items = () => evaluate(`JSON.parse(document.querySelector('[data-testid="items"]').textContent)`);
const cartQuantity = async (id = 'tea-50') => (await items()).find(item => item.configuration.kind === 'selectable' && item.configuration.id === id)?.quantity ?? 0;
async function cardQuantity(id, expected) {
  await waitFor(`(() => {
    const root = ${scope(id)};
    const full = [...root.querySelectorAll('button[aria-label^="Добавить ещё"]')].find(${visible});
    const compact = [...root.querySelectorAll('[role="group"][aria-label^="Количество:"] [role="status"]')].find(${visible});
    const quantity = full ? Number(full.getAttribute('aria-label').match(/выбрано ([0-9]+)/)[1]) : compact ? Number(compact.textContent) : 0;
    return quantity === ${expected};
  })()`);
}
async function reset() {
  await clickText('Reset integration');
  await waitFor(`document.querySelector('[data-testid="items"]').textContent === '[]'`);
}
async function fullSelect(id, label) {
  await cardClick(id, 'button[aria-haspopup="listbox"]');
  await evaluate(`(() => { const node = [...${scope(id)}.querySelectorAll('[role="option"]')].find(node => node.textContent === ${q(label)}); node.click(); })()`);
}
const fullAdd = id => cardClick(id, 'button[aria-label^="В корзину"], button[aria-label^="Добавить ещё"]');
async function diagnostic(action, targetIndex, amount = 1) {
  await evaluate(`(() => {
    const select = document.querySelector('select'); select.value = '${targetIndex}'; select.dispatchEvent(new Event('change', { bubbles: true }));
    const input = document.querySelector('input[inputmode="decimal"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '${amount}');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await clickText(`${action} target`);
  await waitFor(`![...document.querySelectorAll('button')].find(node => node.textContent === 'ADD target').disabled`);
}
async function openSheet(id = 'a') {
  await cardClick(id, 'button[aria-haspopup="dialog"]');
  await waitFor(`!!document.querySelector('dialog[open]')`);
  assert.equal(await evaluate(`document.querySelector('dialog').contains(document.activeElement)`), true);
}
async function sheetSelect(label) {
  await evaluate(`(() => { const node = [...document.querySelectorAll('dialog [aria-label="Выберите вес"] button')].find(node => node.textContent === ${q(label)}); node.click(); })()`);
}
const draft = () => evaluate(`Number(document.querySelector('dialog output').textContent)`);
async function draftTo(amount) {
  const current = await draft();
  for (let i = 0; i < Math.abs(current - amount); i++) {
    await clickSelector(`dialog button[aria-label="${current < amount ? 'Увеличить количество' : 'Уменьшить количество'}"]`);
  }
  assert.equal(await draft(), amount);
}
async function confirm(double = false) {
  await evaluate(`(() => { const button = [...document.querySelectorAll('dialog button')].find(node => node.textContent === 'Добавить в корзину'); button.click(); ${double ? 'button.click();' : ''} })()`);
  await waitFor(`!document.querySelector('dialog')`);
}
async function dismiss() {
  await clickSelector('dialog button[aria-label="Закрыть панель"]');
  await waitFor(`!document.querySelector('dialog') && document.body.style.overflow !== 'hidden'`);
}
async function key(key, code = key) {
  const windowsVirtualKeyCode = { Escape: 27, Tab: 9, Home: 36, ArrowDown: 40, Enter: 13 }[key];
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode });
}
async function screenshot(name) {
  await evaluate('document.fonts.ready');
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const filename = path.join(os.tmpdir(), `sc-product-cart-${name}.png`);
  fs.writeFileSync(filename, Buffer.from(shot.data, 'base64'));
  console.log(`SCREENSHOT: ${filename}`);
}

try {
  await send('Runtime.enable'); await send('Page.enable');
  await width(1440);
  await send('Page.navigate', { url: `${base}/dev/product-cart` });
  await waitFor(`(() => { const node = document.querySelector('[data-card="a"] button[aria-haspopup="listbox"]'); return node && Object.keys(node).some(key => key.startsWith('__reactProps$')); })()`);
  await fullAdd('a'); await fullAdd('a');
  assert.equal(await cartQuantity(), 2); await cardQuantity('a', 2); await cardQuantity('b', 2);
  console.log('PASS FULL-1 / FULL-4: repeated ADD and two-card synchronization');
  await fullSelect('a', '100 г.'); await cardQuantity('a', 0);
  await fullAdd('a'); assert.equal(await cartQuantity('tea-100'), 1);
  await fullSelect('a', '50 г.'); await cardQuantity('a', 2);
  await fullSelect('a', '100 г.'); await cardQuantity('a', 1);
  await diagnostic('REMOVE', 1); await cardQuantity('a', 0);
  await fullSelect('a', '50 г.'); await cardQuantity('a', 2);
  console.log('PASS FULL-2 / FULL-3: selector isolation and external REMOVE');
  await fullSelect('b', '100 г.'); await fullAdd('a'); await fullAdd('b');
  await cardQuantity('a', 3); await cardQuantity('b', 1);
  console.log('PASS FULL-5: independent configurations');

  for (const viewport of [1280, 1440, 1920]) {
    await width(viewport);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    assert.deepEqual(await evaluate(`(() => { const r = ${scope('a')}.querySelector('article').getBoundingClientRect(); return [r.width, r.height]; })()`), [360, 425]);
    console.log(`PASS desktop ${viewport}: full card 360×425, no overflow`);
  }
  await width(1440); await screenshot('full');
  await reset();
  await fullAdd('ceramics'); await fullAdd('ceramics-copy'); await fullAdd('ceramics');
  await cardQuantity('ceramics', 3); await cardQuantity('ceramics-copy', 3);
  await fullAdd('pressed'); await cardQuantity('pressed', 1);
  console.log('PASS fixed full ADD and merge');

  await reset(); await width(375);
  await openSheet(); assert.equal(await draft(), 1); assert.deepEqual(await items(), []);
  await confirm(true); await cardQuantity('a', 1); await cardQuantity('b', 1);
  assert.equal(await cartQuantity(), 1);
  console.log('PASS COMPACT-1 and double confirm: one ADD');
  await diagnostic('SET', 0, 2);
  await openSheet(); assert.equal(await draft(), 2); await confirm(true);
  assert.equal(await cartQuantity(), 2);
  console.log('PASS COMPACT-2: unchanged Confirm is SET, no doubling');

  await diagnostic('ADD', 1);
  await openSheet(); assert.equal(await draft(), 2);
  await sheetSelect('100 г.'); assert.equal(await draft(), 1);
  await sheetSelect('200 г.'); assert.equal(await draft(), 1);
  await sheetSelect('50 г.'); assert.equal(await draft(), 2);
  await draftTo(3); await sheetSelect('50 г.'); assert.equal(await draft(), 3); // same target keeps edits
  await dismiss(); assert.equal(await cartQuantity(), 2);
  console.log('PASS COMPACT-3: target switch loads target quantity, not previous draft');

  await diagnostic('REMOVE', 1);
  await openSheet(); await sheetSelect('100 г.'); await draftTo(3); await confirm();
  assert.equal(await cartQuantity(), 2); assert.equal(await cartQuantity('tea-100'), 3);
  await cardQuantity('a', 3); await cardQuantity('b', 2);
  console.log('PASS COMPACT-4: new target ADD preserves other configurations');
  await openSheet(); assert.equal(await draft(), 3); await draftTo(1); await confirm();
  assert.equal(await cartQuantity(), 2); assert.equal(await cartQuantity('tea-100'), 1);
  console.log('PASS COMPACT-5: existing target SET preserves other configurations');

  const beforeDismiss = await items();
  for (const reason of ['Cancel', 'Escape', 'resize']) {
    await openSheet(); await sheetSelect('200 г.'); await draftTo(3);
    if (reason === 'Cancel') await dismiss();
    if (reason === 'Escape') { await key('Escape'); await waitFor(`!document.querySelector('dialog')`); }
    if (reason === 'resize') { await width(1440); await waitFor(`!document.querySelector('dialog')`); }
    assert.deepEqual(await items(), beforeDismiss);
    await cardQuantity('a', 1);
    await waitFor(`document.body.style.overflow !== 'hidden' && document.documentElement.style.overflow !== 'hidden'`);
    await waitFor(`${scope('a')}.contains(document.activeElement) && !!document.activeElement.getClientRects().length`);
    if (reason === 'resize') await width(375);
  }
  console.log('PASS COMPACT-6 / COMPACT-7 / COMPACT-8: draft discard, selection and focus restoration');

  await clickSelector('input[type="checkbox"]');
  await openSheet(); await sheetSelect('200 г.'); await draftTo(3);
  await evaluate(`(() => { const node = [...document.querySelectorAll('dialog button')].find(node => node.textContent === 'Добавить в корзину'); node.click(); node.click(); })()`);
  await waitFor(`!!document.querySelector('dialog [role="alert"]')`);
  assert.deepEqual(await items(), beforeDismiss);
  await dismiss(); await cardQuantity('a', 1);
  await clickSelector('input[type="checkbox"]');
  console.log('PASS COMPACT-9: local quote failure, no close or false commit');

  await reset();
  for (const id of ['pressed', 'ceramics']) {
    await cardClick(id, 'button[aria-label^="В корзину"]'); await cardQuantity(id, 1);
    await cardClick(id, 'button[aria-label="Увеличить количество"]'); await cardQuantity(id, 2);
    await cardClick(id, 'button[aria-label="Уменьшить количество"]'); await cardQuantity(id, 1);
    await cardClick(id, 'button[aria-label="Уменьшить количество"]'); await cardQuantity(id, 0);
    assert.equal((await items()).some(item => item.productKey.includes(id === 'pressed' ? 'pressed' : 'teapot')), false);
  }
  await cardClick('ceramics', 'button[aria-label^="В корзину"]');
  await cardQuantity('ceramics-copy', 1);
  await clickSelector('input[type="checkbox"]');
  await cardClick('ceramics', 'button[aria-label="Увеличить количество"]'); await cardQuantity('ceramics', 1);
  await diagnostic('ADD', 5); // failure also leaves the diagnostic state unchanged
  await clickSelector('input[type="checkbox"]');
  await cardClick('ceramics', 'button[aria-label="Увеличить количество"]'); await cardQuantity('ceramics', 2);
  await clickSelector('input[type="checkbox"]');
  await cardClick('ceramics', 'button[aria-label="Уменьшить количество"]'); await cardQuantity('ceramics', 2);
  await clickSelector('input[type="checkbox"]');
  console.log('PASS FIXED-1..FIXED-5 and fixed ADD/SET failures');

  await reset(); await diagnostic('ADD', 0, 2);
  await clickText('External ADD 50 in 3 seconds'); await openSheet();
  assert.equal(await draft(), 2);
  await waitFor(`JSON.parse(document.querySelector('[data-testid="items"]').textContent).some(item => item.configuration.id === 'tea-50' && item.quantity === 3)`);
  assert.equal(await draft(), 2);
  await sheetSelect('100 г.'); assert.equal(await draft(), 1);
  await sheetSelect('50 г.'); assert.equal(await draft(), 3);
  await dismiss();
  console.log('PASS open draft snapshot vs external Cart update; explicit target switch reads latest state');

  await openSheet(); await diagnostic('REMOVE', 0);
  assert.equal(await draft(), 3); await confirm(); assert.equal(await cartQuantity(), 3);
  await openSheet(); await sheetSelect('200 г.');
  await diagnostic('ADD', 2, 2); assert.equal(await draft(), 1);
  await confirm(); assert.equal(await cartQuantity('tea-200'), 1); assert.equal(await cartQuantity(), 3);
  console.log('PASS Confirm rechecks current target: removed target ADDs, externally created target SETs');

  await openSheet('availability');
  const disabledBefore = await draft();
  await sheetSelect('200 г.'); assert.equal(await draft(), disabledBefore);
  assert.equal(await evaluate(`document.querySelector('dialog button[aria-pressed="true"]').textContent`), '50 г.');
  assert.equal(await evaluate(`document.querySelectorAll('dialog [aria-label="Выберите вес"] button:disabled').length`), 2);
  for (let i = 0; i < 12; i++) {
    await key('Tab');
    const focus = await evaluate(`({ inside: document.querySelector('dialog').contains(document.activeElement), tag: document.activeElement.tagName, pageFocused: document.hasFocus() })`);
    assert.ok(focus.inside || (focus.tag === 'BODY' && !focus.pageFocused), JSON.stringify(focus));
  }
  await key('Escape'); await waitFor(`!document.querySelector('dialog')`);

  await width(1440);
  await cardClick('availability', 'button[aria-haspopup="listbox"]');
  await key('Home'); await key('ArrowDown'); await key('ArrowDown'); await key('Enter');
  assert.equal(await evaluate(`${scope('availability')}.querySelector('button[aria-haspopup="listbox"]').textContent`), '50 г.');
  console.log('PASS disabled configuration guards, keyboard skip and native modal focus containment');

  for (const viewport of [375, 414]) {
    await width(viewport); await openSheet();
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    assert.equal(await evaluate(`document.querySelector('dialog').scrollWidth <= document.querySelector('dialog').clientWidth`), true);
    assert.deepEqual(await evaluate(`(() => { const r = ${scope('a')}.querySelector('article').getBoundingClientRect(); return [r.width, r.height]; })()`), [170, 272]);
    await screenshot(`sheet-${viewport}`);
    await dismiss();
    console.log(`PASS compact ${viewport}: card 170×272, sheet and document have no horizontal overflow`);
  }

  await width(375); await openSheet();
  const beforeSwipe = await items();
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  const handle = await evaluate(`(() => { const r = document.querySelector('dialog button[aria-label="Закрыть выбор товара"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...handle, id: 1 }] });
  await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: handle.x, y: handle.y + 80, id: 1 }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await waitFor(`!document.querySelector('dialog')`);
  assert.deepEqual(await items(), beforeSwipe);
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });
  console.log('PASS touch swipe discard');

  await send('Page.navigate', { url: `${base}/` });
  await waitFor(`!!document.querySelector('[data-presentation]')`);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('[data-presentation] button[aria-label^="В корзину"]')).every(node => !node.disabled)`), true);
  await send('Page.navigate', { url: `${base}/dev/product-card?presentation=full&example=tea-presentation` });
  await waitFor(`!!document.querySelector('button[aria-haspopup="listbox"]')`);
  assert.equal(await evaluate(`document.querySelector('button[aria-label^="В корзину"]').disabled`), false);
  console.log('PASS application Provider enables Home and existing product-card dev actions');

  assert.deepEqual(problems, [], 'Browser exceptions or warnings/errors');
  console.log('PASS exceptions = 0, console warnings/errors = 0, hydration/duplicate-key warnings = 0');
} finally {
  socket.close();
  await fetch(`${debug}/json/close/${target.id}`);
}
