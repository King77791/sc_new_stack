import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base = process.env.CART_QA_URL ?? 'http://127.0.0.1:3012';
const debug = process.env.CART_QA_CHROME ?? 'http://127.0.0.1:9334';
const target = await fetch(`${debug}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let serial = 0;
const pending = new Map(), problems = [];
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const request = pending.get(message.id); pending.delete(message.id); clearTimeout(request.timer);
    if (message.error) request.reject(new Error(JSON.stringify(message.error))); else request.resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') problems.push(message.params);
  if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(message.params.type)) problems.push(message.params);
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++serial, timer = setTimeout(() => reject(new Error(method)), 45000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(expression, timeout = 20000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) { if (await evaluate(expression)) return; await sleep(30); }
  throw Error(`Timed out: ${expression}`);
}
const q = JSON.stringify;
const shell = '[data-notification-host] [data-notification-id]';
async function width(width) { await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false }); }
async function navigate(route) {
  await send('Page.navigate', { url: base + route });
  await wait(`location.pathname === ${q(route)} && document.readyState === 'complete'`);
  await wait(`!!document.querySelector('[data-card="a"] button[aria-haspopup="listbox"]') && Object.keys(document.querySelector('[data-card="a"] button[aria-haspopup="listbox"]')).some(k=>k.startsWith('__reactProps$'))`);
  await evaluate(`window.seenNotifications=[]; new MutationObserver(() => { const n=document.querySelector(${q(shell)}); if(n && !window.seenNotifications.includes(n.dataset.notificationId))window.seenNotifications.push(n.dataset.notificationId); }).observe(document.querySelector('[data-notification-host]'), {subtree:true,childList:true,attributes:true});`);
}
async function count() { return evaluate('window.seenNotifications.length'); }
async function idle() { await wait(`!document.querySelector(${q(shell)})`, 20000); }
async function cardClick(id, selector) {
  await evaluate(`(() => {const n=[...document.querySelector('[data-card="${id}"]').querySelectorAll(${q(selector)})].find(n=>n.getClientRects().length);if(!n||n.disabled)throw Error('Unavailable card control');n.click();})()`);
}
async function fullAdd(id = 'a') { await cardClick(id, 'button[aria-label^="В корзину"],button[aria-label^="Добавить ещё"]'); await sleep(80); }
async function sheet() { await cardClick('a', 'button[aria-haspopup="dialog"]'); await wait(`!!document.querySelector('dialog[open]')`); }
async function confirm() {
  await evaluate(`[...document.querySelectorAll('dialog button')].find(n=>n.textContent==='Добавить в корзину').click()`);
  await wait(`!document.querySelector('dialog')`);
}
async function noEvent(operation, label) {
  await idle(); const before = await count(); await operation(); await sleep(300);
  assert.equal(await count(), before, label + ' ' + JSON.stringify(await evaluate(`({route:location.pathname,checked:document.querySelector('main input[type="checkbox"]')?.checked,items:document.querySelector('[data-testid="items"]')?.textContent})`))); console.log('NO notification PASS:', label);
}
try {
  await send('Runtime.enable'); await send('Page.enable'); await width(1280);
  if (process.argv.includes('--home')) {
    await send('Page.navigate', { url: base + '/' });
    await wait(`!!document.querySelector('[data-presentation] button[aria-label^="В корзину"]') && Object.keys(document.querySelector('[data-presentation] button[aria-label^="В корзину"]')).some(k=>k.startsWith('__reactProps$'))`);
    await evaluate(`window.notificationIds=[];new MutationObserver(()=>{const n=document.querySelector(${q(shell)});if(n&&!window.notificationIds.includes(n.dataset.notificationId))window.notificationIds.push(n.dataset.notificationId);}).observe(document.querySelector('[data-notification-host]'),{childList:true,subtree:true,attributes:true});`);
    const homeAdd = async () => {
      await evaluate(`[...document.querySelectorAll('[data-presentation] button[aria-label^="В корзину"],[data-presentation] button[aria-label^="Добавить ещё"]')].find(n=>n.getClientRects().length).click()`);
      await wait(`document.querySelector(${q(shell)})?.dataset.phase==='resting'`); await idle();
    };
    await homeAdd(); await homeAdd();
    assert.equal(await evaluate('window.notificationIds.length'), 2);
    assert.ok(await evaluate(`document.querySelector('aside').textContent.includes('1 позиция')`));
    assert.equal(await evaluate(`document.querySelectorAll('[data-notification-host]').length`), 1);
    await send('Page.reload'); await wait(`document.readyState==='complete' && !!document.querySelector('[data-notification-host]')`);
    assert.equal(await evaluate(`document.querySelector(${q(shell)})`), null);
    assert.equal(problems.filter(p=>!JSON.stringify(p).includes('Image with src')).length, 0, JSON.stringify(problems));
    console.log('Built production Home: two ADD events / CartWidget / single host / reload / console PASS');
  } else {
  await navigate('/dev/cart-widget-integration');
  await fullAdd(); await wait(`document.querySelector(${q(shell)})?.dataset.phase==='resting'`);
  assert.ok(await evaluate(`document.querySelector('aside')?.textContent.includes('1 позиция')`));
  assert.equal(await evaluate(`document.querySelector(${q(shell)}).textContent`), 'Товар добавлен в корзину');
  const restGeometry = await evaluate(`(() => {const n=document.querySelector(${q(shell)}),r=n.getBoundingClientRect(),w=document.querySelector('aside').getBoundingClientRect();return {center:(r.left+r.right)/2,gap:w.left-r.right,top:document.elementFromPoint(r.left+10,r.top+10).closest('[data-notification-id]')===n};})()`);
  assert.equal(restGeometry.center, 640); assert.ok(restGeometry.gap > 55, JSON.stringify(restGeometry)); assert.ok(restGeometry.top);
  await idle(); await fullAdd(); await fullAdd(); await idle(); assert.equal(await count(), 3);
  await fullAdd('pressed'); await idle(); assert.equal(await count(), 4); // unavailable quote still succeeds
  console.log('Desktop / repeated ADD / fixed unavailable-price ADD / no double dispatch PASS');

  await noEvent(async () => {
    await evaluate(`document.querySelector('aside button[aria-label]').click()`);
    await evaluate(`document.querySelector('aside li button').click()`);
  }, 'CartWidget REMOVE');
  await width(375);
  await noEvent(sheet, 'Sheet open');
  await noEvent(async () => { await evaluate(`document.querySelector('dialog button[aria-label="Закрыть панель"]').click()`); }, 'Sheet cancel');
  await sheet(); await confirm(); await idle(); assert.equal(await count(), 5);
  await sheet(); await confirm(); await idle(); assert.equal(await count(), 5);
  await noEvent(async () => {
    await sheet(); await evaluate(`document.querySelector('dialog button[aria-label="Увеличить количество"]').click()`); await confirm();
  }, 'existing target SET increase');
  await noEvent(async () => {
    await sheet(); await evaluate(`document.querySelector('dialog button[aria-label="Уменьшить количество"]').click()`); await confirm();
  }, 'existing target SET decrease');
  await noEvent(async () => {
    await cardClick('pressed', 'button[aria-label="Уменьшить количество"]');
  }, 'fixed decrement/remove');
  await cardClick('ceramics', 'button[aria-label^="В корзину"]'); await idle();
  await cardClick('ceramics', 'button[aria-label="Увеличить количество"]'); await idle();
  assert.equal(await count(), 7);
  await noEvent(async () => cardClick('ceramics', 'button[aria-label="Уменьшить количество"]'), 'fixed decrement SET');
  await noEvent(async () => cardClick('ceramics', 'button[aria-label="Добавить в избранное"]'), 'local Favorite toggle');
  console.log('Compact new-target ADD / existing-target SET / fixed plus PASS');

  await cardClick('ceramics', 'button[aria-label="Увеличить количество"]');
  await sheet(); await wait(`document.querySelector(${q(shell)})?.dataset.phase==='resting'`);
  assert.ok(await evaluate(`(() => {const r=document.querySelector(${q(shell)}).getBoundingClientRect();return !document.elementFromPoint(r.left+10,r.top+10).closest('[data-notification-id]');})()`));
  await idle(); await evaluate(`document.querySelector('dialog button[aria-label="Закрыть панель"]').click()`);
  await evaluate(`document.querySelector('[data-burger]').click()`);
  await wait(`document.querySelector('header').dataset.panel==='mobile'`);
  await cardClick('ceramics', 'button[aria-label="Увеличить количество"]');
  await wait(`document.querySelector(${q(shell)})?.dataset.phase==='resting'`);
  assert.ok(await evaluate(`(() => {const n=document.querySelector(${q(shell)}),r=n.getBoundingClientRect();return document.elementFromPoint(r.left+10,r.top+10).closest('[data-notification-id]')===n;})()`));
  await idle(); await evaluate(`document.querySelector('[data-burger]').click()`);
  console.log('Above Header menu / below native modal top layer PASS');

  // Footer cannot cover transient feedback. Existing widget remains behind Footer.
  await width(1280); await evaluate('window.scrollTo(0,document.documentElement.scrollHeight)');
  await fullAdd(); await wait(`document.querySelector(${q(shell)})?.dataset.phase==='resting'`);
  assert.ok(await evaluate(`(() => {const n=document.querySelector(${q(shell)}),r=n.getBoundingClientRect();return document.elementFromPoint(r.left+10,r.top+10).closest('[data-notification-id]')===n;})()`));
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(os.tmpdir(), 'notification-footer.png'), Buffer.from(screenshot.data, 'base64'));
  await idle(); console.log('Footer / Widget layering PASS');

  await navigate('/dev/product-cart'); await width(1440);
  await wait(`document.querySelector('main h1')?.textContent.includes('ProductCard') && (() => {const n=document.querySelector('main input[type="checkbox"]');const k=Object.keys(n).find(k=>k.startsWith('__reactProps$'));return k && typeof n[k].onChange==='function';})()`);
  const failPoint = await evaluate(`(() => {const n=document.querySelector('main input[type="checkbox"]');n.scrollIntoView({block:'center'});const r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await send('Input.dispatchMouseEvent', { type:'mousePressed', button:'left', clickCount:1, ...failPoint });
  await send('Input.dispatchMouseEvent', { type:'mouseReleased', button:'left', clickCount:1, ...failPoint });
  await wait(`(() => {const n=document.querySelector('main input[type="checkbox"]');const key=Object.keys(n).find(k=>k.startsWith('__reactProps$'));return n.checked && key && n[key].checked===true;})()`);
  await noEvent(() => fullAdd(), 'failed ADD');
  await evaluate(`document.querySelector('main input[type="checkbox"]').click()`);
  await fullAdd(); await idle(); assert.equal(await count(), 1);
  assert.equal(await evaluate(`document.querySelectorAll('[data-notification-host]').length`), 1);
  assert.equal(problems.filter(p => !JSON.stringify(p).includes('Image with src')).length, 0, JSON.stringify(problems));
  console.log('Failed mutation / root host / console PASS');
  }
} finally {
  socket.close(); await fetch(`${debug}/json/close/${target.id}`);
}
