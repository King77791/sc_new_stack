// Actual application Provider + ProductCards + frozen Widget, without a test Provider.
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
    clearTimeout(request.timer); requests.delete(message.id);
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
const widget = `document.querySelector('aside[aria-label="Состав корзины"]')`;
const scope = id => `document.querySelector('[data-card="${id}"]')`;
const frames = () => evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
const items = () => evaluate(`JSON.parse(document.querySelector('[data-testid="items"]').textContent)`);
const rows = () => evaluate(`Array.from(${widget}.querySelectorAll('li'), row => ({
  title: row.querySelector('a').textContent, label: row.querySelector('small')?.textContent,
  price: row.querySelector('p > span').lastChild.textContent,
  quantity: Number(row.querySelector('button').previousElementSibling.textContent.replace('Количество: ', '').replace(' шт.', '')),
}))`);
async function clickText(text) {
  await evaluate(`(() => { const node = [...document.querySelectorAll('button')].find(node => node.textContent === ${q(text)}); if (!node || node.disabled) throw new Error('Unavailable: ' + ${q(text)}); node.click(); })()`);
}
async function cardClick(id, selector) {
  await evaluate(`(() => { const node = [...${scope(id)}.querySelectorAll(${q(selector)})].find(node => node.getClientRects().length); if (!node || node.disabled) throw new Error('Card control unavailable'); node.click(); })()`);
}
async function fullSelect(id, label) {
  await cardClick(id, 'button[aria-haspopup="listbox"]');
  await evaluate(`Array.from(${scope(id)}.querySelectorAll('[role="option"]')).find(node => node.textContent === ${q(label)}).click()`);
}
const add = id => cardClick(id, 'button[aria-label^="В корзину"],button[aria-label^="Добавить ещё"]');
async function cardQuantity(id, quantity) {
  await waitFor(`(() => { const root = ${scope(id)};
    const full = [...root.querySelectorAll('button[aria-label^="Добавить ещё"]')].find(node => node.getClientRects().length);
    const compact = [...root.querySelectorAll('[role="group"][aria-label^="Количество:"] [role="status"]')].find(node => node.getClientRects().length);
    return (full ? Number(full.getAttribute('aria-label').match(/выбрано ([0-9]+)/)[1]) : compact ? Number(compact.textContent) : 0) === ${quantity};
  })()`);
}
const expanded = () => evaluate(`${widget}.getAttribute('data-expanded') === 'true'`);
const toggle = () => evaluate(`${widget}.querySelector('button[aria-label]').click()`);
async function remove(index) {
  await evaluate(`(() => { const node = ${widget}.querySelectorAll('li button')[${index}]; node.focus(); node.click(); })()`);
  await frames();
}
async function width(value) {
  await send('Emulation.setDeviceMetricsOverride', { width: value, height: 1000, deviceScaleFactor: 1, mobile: false });
  await frames();
}
async function waitHydrated() {
  await waitFor(`(() => { const node = ${scope('a')}?.querySelector('button[aria-haspopup="listbox"]'); return node && Object.keys(node).some(key => key.startsWith('__reactProps$')); })()`);
}
const widgetRect = () => evaluate(`(() => { const r = ${widget}.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()`);
const indicator = () => evaluate(`!!document.querySelector('#site-header-basket-link [data-cart-indicator]')`);
const headerGeometry = () => evaluate(`['header','[data-primary-bar]','#site-header-basket-link','#site-header-basket-link img','[data-burger]','header a[href="/"]'].map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [r.x,r.y,r.width,r.height];})`);

try {
  await send('Runtime.enable'); await send('Page.enable'); await width(1440);
  await send('Page.navigate', { url: `${base}/dev/cart-widget-integration` }); await waitHydrated();
  assert.equal(await evaluate(`!!${widget}`), false);
  assert.equal(await indicator(), false);
  const emptyHeaders = new Map();
  for (const viewport of [375,414,1280,1440,1920]) {
    await width(viewport); emptyHeaders.set(viewport,await headerGeometry()); assert.equal(await indicator(),false);
  }
  await width(1440);
  const shellGeometry = () => evaluate(`['header', 'footer', '[data-card="a"] article'].map(selector => { const r = document.querySelector(selector).getBoundingClientRect(); return selector === 'footer' ? [r.width, r.height] : [r.x, r.y + scrollY, r.width, r.height]; })`);
  const emptyGeometry = await shellGeometry();
  await add('a'); await cardQuantity('a', 1); await cardQuantity('b', 1);
  assert.equal(await indicator(), true);
  for (const viewport of [375,414,1280,1440,1920]) {
    await width(viewport); assert.deepEqual(await headerGeometry(),emptyHeaders.get(viewport),'Header must not shift');
    const dot = await evaluate(`(() => {const link=document.querySelector('#site-header-basket-link'),n=link.querySelector('[data-cart-indicator]'),d=n.getBoundingClientRect(),i=link.querySelector('img').getBoundingClientRect();return {diameter:d.width,height:d.height,x:d.left-i.left,y:d.top-i.top,iconWidth:i.width,color:getComputedStyle(n).backgroundColor,pointer:getComputedStyle(n).pointerEvents,hidden:n.getAttribute('aria-hidden'),tab:n.tabIndex,label:link.getAttribute('aria-label'),overflow:document.documentElement.scrollWidth>innerWidth};})()`);
    assert.ok(Math.abs(dot.diameter-dot.iconWidth*8/56)<0.03); assert.ok(Math.abs(dot.height-dot.diameter)<0.03);
    assert.ok(Math.abs(dot.x-dot.iconWidth*33/56)<0.03); assert.ok(Math.abs(dot.y-dot.iconWidth*30/56)<0.03);
    assert.equal(dot.color,'rgb(255, 153, 0)'); assert.equal(dot.pointer,'none'); assert.equal(dot.hidden,'true'); assert.equal(dot.tab,-1); assert.equal(dot.label,'Корзина'); assert.equal(dot.overflow,false);
    if (viewport < 1280) {
      await evaluate(`document.querySelector('[data-burger]').click()`); await frames();
      assert.equal(await evaluate(`document.querySelector('header').dataset.panel`),'mobile'); assert.equal(await indicator(),true);
      await evaluate(`document.querySelector('[data-burger]').click()`); await frames();
    }
    await evaluate(`document.querySelector('header button[aria-label="Поиск"]').click()`); await frames();
    assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Поиск по сайту'); assert.equal(await indicator(),true);
    await evaluate(`document.querySelector('header button[aria-label="Закрыть поиск"]').click()`); await frames();
    assert.deepEqual(await headerGeometry(),emptyHeaders.get(viewport));
    console.log(`PASS Header indicator ${viewport}: empty/non-empty, scaled Figma geometry, no shift`,dot);
  }
  await width(1440);
  assert.equal(await expanded(), false);
  assert.match(await evaluate(`${widget}.textContent`), /1 позиция/);
  assert.equal((await rows())[0].price, '1 030 ₽');
  assert.deepEqual(await shellGeometry(), emptyGeometry);
  console.log('PASS E2E-1 / PRICE-1: first ADD, collapsed Widget, exact line quote, no shell shift');

  await add('a'); await cardQuantity('a', 2);
  assert.equal(await indicator(),true);
  assert.equal((await rows()).length, 1); assert.equal((await rows())[0].quantity, 2);
  assert.equal((await rows())[0].price, '2 060 ₽');
  await fullSelect('a', '100 г.'); await cardQuantity('a', 0); await add('a');
  assert.equal((await rows()).length, 2);
  assert.equal(await indicator(),true);
  assert.deepEqual((await rows()).map(row => row.price), ['2 060 ₽', '1 980 ₽']);
  assert.ok((await rows())[0].label.includes('50 г.'));
  assert.ok((await rows())[1].label.includes('100 г.'));
  console.log('PASS E2E-2 / E2E-3 / PRICE-2 / PRICE-4: repeated ADD, separate configurations and line totals');

  await toggle();
  for (const [label, quantity] of [['50 г.', 2], ['100 г.', 1], ['200 г.', 0]]) {
    await fullSelect('a', label); await cardQuantity('a', quantity);
    assert.equal((await rows()).length, 2); assert.equal(await expanded(), true);
  }
  await fullSelect('a', '50 г.');
  await evaluate(`window.__nextWidgetRemove = ${widget}.querySelectorAll('li button')[1]; undefined`);
  await remove(0); await cardQuantity('a', 0); await cardQuantity('b', 0);
  assert.equal(await indicator(),true);
  assert.equal(await expanded(), true); assert.equal((await rows()).length, 1);
  assert.equal(await evaluate('document.activeElement === window.__nextWidgetRemove'), true);
  await fullSelect('a', '100 г.'); await cardQuantity('a', 1);
  console.log('PASS E2E-4 / E2E-5: selectors, Widget REMOVE updates both cards, next-remove focus');

  await remove(0); await waitFor(`!${widget}`); await cardQuantity('a', 0);
  assert.equal(await indicator(),false);
  await waitFor(`document.activeElement.id === 'site-header-basket-link'`);
  await fullSelect('a', '50 г.'); await add('a');
  assert.equal(await expanded(), false);
  console.log('PASS E2E-6: last removal, Header basket focus and collapsed reappearance');

  await add('pressed'); await add('pressed'); await add('ceramics');
  assert.equal((await rows()).length, 3);
  assert.equal((await rows())[1].quantity, 2);
  assert.equal((await rows())[1].price, 'Цена недоступна');
  assert.equal((await rows())[2].price, '9 300 ₽');
  await toggle(); await add('a'); await add('a');
  assert.equal((await rows())[0].quantity, 3);
  assert.equal((await rows())[0].price, 'Цена недоступна');
  assert.equal(await expanded(), true);
  console.log('PASS E2E-7 / PRICE-3: fixed products and honest unavailable price without stale total');

  await width(375);
  await cardClick('pressed','button[aria-label="Уменьшить количество"]');
  assert.equal(await indicator(),true);
  assert.equal(await evaluate(`getComputedStyle(${widget}).display`), 'none');
  await cardClick('a', 'button[aria-haspopup="dialog"]');
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await evaluate(`Array.from(document.querySelectorAll('dialog [aria-label="Выберите вес"] button')).find(node => node.textContent === '100 г.').click()`);
  for (let index = 0; index < 2; index++) await evaluate(`document.querySelector('dialog button[aria-label="Увеличить количество"]').click()`);
  await evaluate(`Array.from(document.querySelectorAll('dialog button')).find(node => node.textContent === 'Добавить в корзину').click()`);
  await waitFor(`!document.querySelector('dialog')`); await cardQuantity('a', 3);
  await width(414); assert.equal(await evaluate(`getComputedStyle(${widget}).display`), 'none');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await width(1440); assert.equal(await expanded(), true);
  assert.equal((await rows()).length, 4); assert.equal((await rows())[3].quantity, 3);
  assert.equal((await rows())[3].price, 'Цена недоступна');
  console.log('PASS E2E-8: compact Sheet mutation while Widget hidden, canonical state on return');

  const beforeNavigation = await items();
  await evaluate(`window.__applicationWidget = ${widget}; window.__navigationSentinel = 'same-document'; document.querySelector('a[href="/dev/cart-widget-integration/observer"]').click()`);
  await waitFor(`location.pathname.endsWith('/observer') && !document.querySelector('[data-card]')`);
  assert.deepEqual(await items(), beforeNavigation);
  assert.equal(await evaluate(`${widget} === window.__applicationWidget && window.__navigationSentinel === 'same-document'`), true);
  assert.equal(await evaluate(`document.querySelectorAll('aside[aria-label="Состав корзины"]').length`), 1);
  assert.equal(await expanded(), true);
  await evaluate(`document.querySelector('a[href="/dev/cart-widget-integration"]').click()`); await waitHydrated();
  await send('Page.reload'); await waitHydrated();
  assert.deepEqual(await items(), []); assert.equal(await evaluate(`!!${widget}`), false);
  assert.equal(await indicator(),false);
  console.log('PASS E2E-9 / E2E-10: persistent Provider and Widget node across navigation, reload reset; Header indicator absent');

  await clickText('ADD 21 diagnostic positions');
  await waitFor(`${widget}?.querySelectorAll('li').length === 21`);
  assert.match(await evaluate(`${widget}.textContent`), /21 позиция/);
  await toggle();
  const viewport = `${widget}.querySelector('[role="region"]')`;
  assert.equal(await evaluate(`${viewport}.scrollHeight > ${viewport}.clientHeight`), true);
  assert.equal(await evaluate(`${widget}.scrollWidth <= ${widget}.clientWidth`), true);
  assert.equal(await evaluate(`${widget}.querySelector('li a').textContent`), 'Сверхдлинноенеразрывноеназваниечайногопродуктадляпроверкипереноса');
  const innerGeometry = () => evaluate(`(() => { const root = ${widget}; return [root.firstElementChild.getBoundingClientRect().top, root.querySelector('a[href="/basket"]').getBoundingClientRect().top]; })()`);
  const beforeListScroll = await innerGeometry();
  await evaluate(`${viewport}.scrollTop = 600`); await frames();
  assert.deepEqual(await innerGeometry(), beforeListScroll);
  for (const size of [1280, 1440, 1920]) {
    await width(size); const box = await widgetRect();
    assert.equal(box[2], 400); assert.ok(box[3] <= 400);
    assert.equal(box[0] + box[2], await evaluate('document.documentElement.clientWidth - 16'));
    assert.equal(box[1] + box[3], 984);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  }
  await width(1440);
  for (const state of [true, false]) {
    if ((await expanded()) !== state) await toggle(); await frames();
    const before = await widgetRect();
    await evaluate(`window.scrollTo(0, document.querySelector('footer').getBoundingClientRect().top + scrollY - (innerHeight - ${before[3] / 2}))`); await frames();
    assert.deepEqual(await widgetRect(), before);
    assert.deepEqual(await evaluate(`(() => { const r = ${widget}.getBoundingClientRect(); const x = r.left + r.width / 2; return [!!document.elementFromPoint(x, r.bottom - 5)?.closest('footer'), !!document.elementFromPoint(x, r.top + 5)?.closest('footer')]; })()`), [true, false]);
    await evaluate(`window.scrollBy(0, ${before[3]})`); await frames();
    assert.equal(await evaluate(`(() => { const r = ${widget}.getBoundingClientRect(); return !!document.elementFromPoint(r.left + r.width / 2, r.top + 5)?.closest('footer'); })()`), true);
    await evaluate('window.scrollTo(0,0)'); await frames();
    assert.deepEqual(await widgetRect(), before); assert.equal(await expanded(), state);
  }
  assert.equal(await evaluate(`document.elementFromPoint(10, 10).closest('header') !== null`), true);
  await toggle(); await frames();
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const filename = path.join(os.tmpdir(), 'sc-cart-widget-production-shell.png');
  fs.writeFileSync(filename, Buffer.from(shot.data, 'base64'));
  console.log(`SCREENSHOT: ${filename}`);
  console.log('PASS production shell: canonical long list, 40vh, list-only scroll, fixed offsets, Header and Footer occlusion');

  await evaluate(`const input = document.querySelector('input[inputmode="decimal"]'); input.focus(); window.__backgroundFocus = input; undefined`);
  await clickText('Remove all (diagnostic)'); await waitFor(`!${widget}`);
  assert.equal(await indicator(),false);
  assert.equal(await evaluate('document.activeElement === window.__backgroundFocus'), true);
  assert.deepEqual(problems, []);
  console.log('PASS integration surface: exceptions/warnings/errors = 0; background clearing does not steal focus');
  await evaluate(`document.querySelector('a[href="/"]').click()`);
  await waitFor(`location.pathname === '/' && !!document.querySelector('[data-presentation]')`);
  assert.equal(await evaluate(`!!${widget}`), false);
  await waitFor(`(() => { const node = document.querySelector('[data-presentation] button[aria-label^="В корзину"]'); return node && Object.keys(node).some(key => key.startsWith('__reactProps$')); })()`);
  await evaluate('document.fonts.ready');
  const homeGeometry = () => evaluate(`['header','footer','main'].map(selector => { const r = document.querySelector(selector).getBoundingClientRect(); return [r.x, r.y + scrollY, r.width, r.height]; })`);
  const beforeHomeAdd = await homeGeometry();
  await evaluate(`Array.from(document.querySelectorAll('[data-presentation] button[aria-label^="В корзину"]')).find(node => node.getClientRects().length).click()`);
  await waitFor(`!!${widget}`); assert.equal(await expanded(), false);
  assert.deepEqual(await homeGeometry(), beforeHomeAdd);
  // Record the existing frozen PromoBanner warning separately, never silently filter it.
  const knownHomeAdvisories = problems.filter(problem => problem.type === 'warning' && problem.args?.some(arg =>
    typeof arg.value === 'string' && arg.value.includes('/icons/promo/next-slide.svg') && arg.value.includes('has either width or height modified')));
  assert.deepEqual(problems.filter(problem => !knownHomeAdvisories.includes(problem)), []);
  console.log(`PASS Home: empty/non-empty Widget, enabled ProductCard, no shell geometry shift; existing PromoBanner image advisory = ${knownHomeAdvisories.length}`);
} finally {
  socket.close(); await fetch(`${debug}/json/close/${target.id}`);
}
