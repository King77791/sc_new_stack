// Frozen presentation regression, independent of Cart's unavailable-price policy.
import assert from 'node:assert/strict';

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
const widget = `document.querySelector('aside[aria-label="Состав корзины"]')`;
const rows = `${widget}.querySelectorAll('li')`;
const buttons = `${widget}.querySelectorAll('li button')`;
const frames = () => evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
const rect = () => evaluate(`(() => { const r = ${widget}.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
const toggle = () => evaluate(`${widget}.querySelector('button[aria-label]').click()`);
async function width(value) {
  await send('Emulation.setDeviceMetricsOverride', { width: value, height: 1000, deviceScaleFactor: 1, mobile: false });
  await frames();
}

try {
  await send('Page.enable'); await send('Runtime.enable');
  await width(1440);
  await send('Page.navigate', { url: `${base}/dev/cart-widget?scenario=many` });
  await waitFor(`(() => { const node = ${widget}?.querySelector('button[aria-label]'); return node && Object.keys(node).some(key => key.startsWith('__reactProps$')); })()`);
  assert.equal(await evaluate(`${widget}.getAttribute('data-expanded')`), 'false');
  assert.match(await evaluate(`${widget}.textContent`), /21 позиция/);
  for (const size of [1280, 1440, 1920]) {
    await width(size);
    const box = await rect();
    assert.equal(box.width, 400); assert.equal(box.height, 57);
    assert.equal(box.x + box.width, await evaluate('document.documentElement.clientWidth - 16'));
    assert.equal(box.y + box.height, 984);
  }
  await width(1440); await toggle();
  await waitFor(`${widget}.getAttribute('data-expanded') === 'true'`);
  assert.ok((await rect()).height <= 400);
  const viewport = `${widget}.querySelector('[role="region"]')`;
  assert.equal(await evaluate(`${viewport}.scrollHeight > ${viewport}.clientHeight`), true);
  assert.equal(await evaluate(`${widget}.scrollWidth <= ${widget}.clientWidth`), true);
  const geometry = () => evaluate(`(() => {
    const root = ${widget}; const header = root.firstElementChild.getBoundingClientRect();
    const link = root.querySelector('a[href="/basket"]').getBoundingClientRect();
    return [header.top, header.height, link.top, link.height];
  })()`);
  const beforeScroll = await geometry();
  await evaluate(`${viewport}.scrollTop = 600`); await frames();
  assert.deepEqual(await geometry(), beforeScroll);
  assert.equal(await evaluate(`Array.from(${rows}).some(row => row.querySelector('a').getBoundingClientRect().height > 20)`), true);
  console.log('PASS presentation: count, 400×57, fixed 1rem offsets, wrapping, 40vh and list-only scroll');

  await evaluate(`window.__nextRemove = ${buttons}[2]; ${buttons}[1].focus(); ${buttons}[1].click()`);
  await waitFor(`${rows}.length === 20 && document.activeElement === window.__nextRemove`);
  await evaluate(`window.__previousRemove = ${buttons}[18]; ${buttons}[19].focus(); ${buttons}[19].click()`);
  await waitFor(`${rows}.length === 19 && document.activeElement === window.__previousRemove`);
  console.log('PASS presentation: next/previous remove focus and expanded-state retention');

  for (const expanded of [true, false]) {
    if ((await evaluate(`${widget}.getAttribute('data-expanded') === 'true'`)) !== expanded) await toggle();
    await frames();
    const before = await rect();
    await evaluate(`window.scrollTo(0, document.querySelector('footer').getBoundingClientRect().top + scrollY - (innerHeight - ${before.height / 2}))`);
    await frames();
    assert.deepEqual(await rect(), before);
    const partial = await evaluate(`(() => {
      const r = ${widget}.getBoundingClientRect(); const x = r.left + r.width / 2;
      return [!!document.elementFromPoint(x, r.bottom - 5)?.closest('footer'), !!document.elementFromPoint(x, r.top + 5)?.closest('footer')];
    })()`);
    assert.deepEqual(partial, [true, false]);
    await evaluate(`window.scrollBy(0, ${before.height})`); await frames();
    assert.equal(await evaluate(`(() => { const r = ${widget}.getBoundingClientRect(); return !!document.elementFromPoint(r.left + r.width / 2, r.top + 5)?.closest('footer'); })()`), true);
    await evaluate('window.scrollTo(0, 0)'); await frames();
    assert.deepEqual(await rect(), before);
    assert.equal(await evaluate(`${widget}.getAttribute('data-expanded') === 'true'`), expanded);
  }
  console.log('PASS presentation: partial/full Footer occlusion and return in collapsed/expanded states');

  for (const size of [375, 414]) {
    await width(size);
    assert.equal(await evaluate(`getComputedStyle(${widget}).display`), 'none');
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    assert.equal(await evaluate(`${rows}.length`), 19);
  }
  await width(1440);
  assert.equal(await evaluate(`${rows}.length`), 19);
  assert.deepEqual(problems, []);
  console.log('PASS presentation: responsive hide/show, exceptions = 0, console warnings/errors = 0');
} finally {
  socket.close();
  await fetch(`${debug}/json/close/${target.id}`);
}
