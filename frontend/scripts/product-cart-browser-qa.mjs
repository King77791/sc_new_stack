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
  await waitFor(`(() => {const node=[...${scope(id)}.querySelectorAll(${q(selector)})].find(${visible});return node && !node.disabled;})()`);
  await evaluate(`(() => { const node = [...${scope(id)}.querySelectorAll(${q(selector)})].find(${visible}); if (!node || node.disabled) throw new Error('Card control unavailable'); node.focus(); node.click(); })()`);
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
  // Empty CTA or confirmed purchase-management bag; quantity +/- are direct controls.
  await cardClick(id, 'button[aria-haspopup="dialog"]');
  await waitFor(`!!document.querySelector('dialog[open]')`);
  assert.equal(await evaluate(`document.querySelector('dialog').contains(document.activeElement)`), true);
}

// Fault/defer only the dev fixture's consumed Cart interface. No production API changes.
async function interceptCartCommand(command, mode, id = 'a') {
  await evaluate(`(() => {
    const node = ${scope(id)}.querySelector('button[aria-label="Уменьшить количество"],button[aria-label^="В корзину"],button[aria-label^="Добавить в корзину"]');
    let fiber = node[Object.keys(node).find(key=>key.startsWith('__reactFiber$'))]; const carts=new Set();
    while (fiber && !carts.size) { for(const version of [fiber,fiber.alternate])for (let dep=version?.dependencies?.firstContext;dep;dep=dep.next) {
      if (typeof dep.memoizedValue?.getItem==='function') carts.add(dep.memoizedValue);
    } fiber=fiber.return; }
    if (!carts.size) throw Error('Dev Cart interface not found');
    const originals=[...carts].map(cart=>({cart,original:cart[${q(command)}]}));
    window.__quantityInjection={cart:originals[0].cart,original:originals[0].original,calls:0,restore:()=>{for(const {cart,original} of originals)cart[${q(command)}]=original;}};
    for(const {cart,original} of originals)cart[${q(command)}]=(...args)=>{window.__quantityInjection.calls++;
      return ${q(mode)}==='fail' ? Promise.resolve({ok:false,reason:'not-found'})
        : new Promise(resolve=>{window.__quantityInjection.release=()=>${q(mode)}==='defer-fail'
          ? resolve({ok:false,reason:'not-found'}) : original(...args).then(resolve);});};
  })()`);
}
async function restoreCartCommand() {
  await evaluate('window.__quantityInjection.restore(); delete window.__quantityInjection');
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
  await evaluate(`(() => { const button = document.querySelector('dialog button[aria-busy]'); if(button.disabled)throw Error('Disabled Confirm'); button.click(); ${double ? 'button.click();' : ''} })()`);
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
  await openSheet(); assert.equal(await draft(), 0); assert.deepEqual(await items(), []);
  assert.equal(await evaluate('document.querySelector("dialog button[aria-busy]").disabled'),true);
  await draftTo(1);
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
  await sheetSelect('200 г.'); assert.equal(await draft(), 0);
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

  const sheetButton = () => evaluate(`({label:document.querySelector('dialog button[aria-busy]').textContent,disabled:document.querySelector('dialog button[aria-busy]').disabled})`);
  async function traceSheetCommands() {
    await evaluate(`(() => {
      let fiber=document.querySelector('dialog')[Object.keys(document.querySelector('dialog')).find(k=>k.startsWith('__reactFiber$'))];const carts=new Set();
      while(fiber&&!carts.size){for(const version of [fiber,fiber.alternate])for(let dep=version?.dependencies?.firstContext;dep;dep=dep.next)if(typeof dep.memoizedValue?.getItem==='function')carts.add(dep.memoizedValue);fiber=fiber.return;}
      if(!carts.size)throw Error('Sheet Cart interface not found');
      const originals=[],calls=[];
      for(const cart of carts)for(const name of ['addItem','setItemQuantity','removeItem']){const original=cart[name];originals.push({cart,name,original});cart[name]=(...args)=>{calls.push({name,args});return original(...args);};}
      window.__sheetTrace={calls,restore:()=>{for(const {cart,name,original}of originals)cart[name]=original;}};
    })()`);
  }
  async function assertSheetCommand(expected) {
    const calls = await evaluate('window.__sheetTrace.calls');
    assert.deepEqual(calls.map(call=>call.name),expected?[expected]:[]);
    for (const call of calls) if(call.name==='setItemQuantity') assert.ok(call.args[1]>0,'SET zero is forbidden');
    await evaluate('window.__sheetTrace.restore();delete window.__sheetTrace');
  }
  for (const viewport of [375,414]) {
    await reset(); await width(viewport); await openSheet();
    assert.equal(await draft(),0); assert.equal((await sheetButton()).disabled,true);
    assert.equal(await evaluate(`document.querySelector('dialog button[aria-label="Уменьшить количество"]').disabled`),true);
    await traceSheetCommands(); await evaluate('document.querySelector("dialog button[aria-busy]").click()');
    await assertSheetCommand(null); assert.deepEqual(await items(),[]);
    await draftTo(3); assert.equal((await sheetButton()).label,'Добавить в корзину');
    await traceSheetCommands(); await confirm(true); await assertSheetCommand('addItem'); await cardQuantity('a',3);
    await openSheet(); assert.equal(await draft(),3); assert.equal((await sheetButton()).label,'Сохранить');
    await draftTo(1); await traceSheetCommands(); await confirm(); await assertSheetCommand('setItemQuantity');
    await openSheet(); await draftTo(3); await sheetSelect('100 г.'); assert.equal(await draft(),0);
    await sheetSelect('50 г.'); assert.equal(await draft(),1);
    await draftTo(0); assert.equal((await sheetButton()).label,'Удалить');
    await sheetSelect('100 г.'); assert.equal((await sheetButton()).disabled,true);
    await sheetSelect('50 г.'); assert.equal(await draft(),1);
    await draftTo(0); await dismiss(); await openSheet(); assert.equal(await draft(),1);
    await draftTo(0); await draftTo(1); assert.equal((await sheetButton()).label,'Сохранить');
    await traceSheetCommands(); await confirm(); await assertSheetCommand('setItemQuantity');
    await diagnostic('SET',0,3); await diagnostic('ADD',3,1);
    await openSheet(); await sheetSelect('250 г.'); assert.equal(await draft(),1);
    for(const [label,amount]of [['50 г.',3],['100 г.',0],['200 г.',0],['250 г.',1]]){await sheetSelect(label);assert.equal(await draft(),amount);}
    await draftTo(0); await traceSheetCommands(); await confirm(true); await assertSheetCommand('removeItem');
    await cardQuantity('a',3); assert.ok(await evaluate(`${scope('a')}.textContent.includes('50 г.')`));
    await waitFor(`document.activeElement===${scope('a')}.querySelector('button[aria-label^="Выбрать фасовку"]')`);
    await openSheet(); await draftTo(0);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth&&document.querySelector("dialog").scrollWidth<=document.querySelector("dialog").clientWidth'),true);
    await screenshot(`zero-remove-${viewport}`);
    await traceSheetCommands(); await confirm(); await assertSheetCommand('removeItem'); await cardQuantity('a',0);
    assert.deepEqual(await items(),[]);
    await waitFor(`document.activeElement===${scope('a')}.querySelector('button[aria-haspopup="dialog"]')`);
    console.log(`PASS zero A–R @${viewport}: absence0, boundaries, ADD/SET/REMOVE labels, intent reset, single-target drafts, highest remaining and focus`);
  }
  // S–W: actual target is re-read, but an external ADD cannot grant removal intent.
  await reset(); await openSheet(); await sheetSelect('100 г.');
  await diagnostic('ADD',1,2); assert.equal(await draft(),0); assert.equal((await sheetButton()).disabled,true);
  assert.ok(await evaluate('document.querySelector("dialog [role=status]").textContent.includes("уже добавлен")'));
  await traceSheetCommands(); await evaluate('document.querySelector("dialog button[aria-busy]").click()');
  await assertSheetCommand(null); assert.equal(await cartQuantity('tea-100'),2);
  await sheetSelect('50 г.'); await sheetSelect('100 г.'); assert.equal(await draft(),2); await dismiss();
  await openSheet(); await sheetSelect('100 г.'); await draftTo(0); await diagnostic('REMOVE',1);
  await traceSheetCommands(); await confirm(); await assertSheetCommand(null); await cardQuantity('a',0);
  await diagnostic('ADD',1,1); await openSheet(); await sheetSelect('100 г.'); await draftTo(3); await diagnostic('REMOVE',1);
  await traceSheetCommands(); await confirm(); await assertSheetCommand('addItem'); assert.equal(await cartQuantity('tea-100'),3);
  await openSheet(); await sheetSelect('200 г.'); await draftTo(2); await diagnostic('ADD',2,1);
  await traceSheetCommands(); await confirm(); await assertSheetCommand('setItemQuantity'); assert.equal(await cartQuantity('tea-200'),2);
  await openSheet(); await sheetSelect('100 г.'); await draftTo(0); await diagnostic('SET',1,5);
  await traceSheetCommands(); await confirm(); await assertSheetCommand('removeItem'); await cardQuantity('a',2);
  console.log('PASS zero races S–W: untouched0 external ADD protected, achieved absence no-op, positive ADD/SET re-read, explicit REMOVE after external SET');
  for(const [name,indices,removed,highest]of [
    ['X',[0,1,2],1,2],['Y',[0,1,2,3],3,2],['Z',[0,2,3],0,3],['AA',[0,1],0,1],['AB',[0,1],1,0],['AC',[1],1,null],
  ]){
    await reset(); for(const index of [...indices].reverse())await diagnostic('ADD',index,1);
    await openSheet(); await sheetSelect(['50 г.','100 г.','200 г.','250 г.'][removed]); await draftTo(0);
    await traceSheetCommands(); await confirm(); await assertSheetCommand('removeItem');
    await cardQuantity('a',highest===null?0:1);
    if(highest!==null)assert.ok(await evaluate(`${scope('a')}.textContent.includes('${[50,100,200,250][highest]} г.')`));
    console.log(`PASS Sheet highest ${name}: REMOVE${[50,100,200,250][removed]} → ${highest===null?'CTA':[50,100,200,250][highest]}`);
  }
  // REMOVE failure and pending retain draft/intent; rapid Confirm stays single-flight.
  await reset(); await diagnostic('ADD',0,3); await diagnostic('ADD',3,1);
  await interceptCartCommand('removeItem','defer-fail'); await openSheet(); await sheetSelect('250 г.'); await draftTo(0);
  await evaluate('document.querySelector("dialog button[aria-busy]").click();document.querySelector("dialog button[aria-busy]").click()');
  await waitFor('document.querySelector("dialog button[aria-busy]").disabled');
  assert.equal(await evaluate('window.__quantityInjection.calls'),1);
  assert.equal(await evaluate(`[...document.querySelectorAll('dialog [aria-label="Выберите вес"] button')].every(n=>n.disabled)`),true);
  await evaluate('window.__quantityInjection.release()'); await waitFor('!!document.querySelector("dialog [role=alert]")');
  assert.equal(await draft(),0); assert.equal((await sheetButton()).label,'Удалить'); assert.equal(await cartQuantity('tea-250'),1);
  await restoreCartCommand(); await confirm(); await cardQuantity('a',3);
  console.log('PASS Sheet REMOVE failure/retry and pending single-flight');

  await reset(); await diagnostic('ADD',0,1); await diagnostic('ADD',1,1);
  await interceptCartCommand('removeItem','fail');
  await evaluate(`window.__quantityInjection.cart.addItem({productKey:'other-tea',configuration:{kind:'selectable',id:'tea-250'},quantity:4,presentation:{slug:'other-tea',title:'Other Tea',configurationLabel:'250 г.'}})`);
  await restoreCartCommand(); await openSheet(); await sheetSelect('100 г.'); await draftTo(0); await confirm(); await cardQuantity('a',1);
  assert.ok(await evaluate(`${scope('a')}.textContent.includes('50 г.')`));
  assert.equal((await items()).find(item=>item.productKey==='other-tea').quantity,4);
  console.log('PASS Sheet highest isolation: another Product / 250 cannot determine representative configuration');

  await reset();
  for (const id of ['pressed', 'ceramics']) {
    await cardClick(id, 'button[aria-label^="В корзину"]'); await cardQuantity(id, 1);
    assert.equal(await evaluate(`!!${scope(id)}.querySelector('button[aria-haspopup="dialog"]')`),false);
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

  for (const viewport of [375,414]) {
    await reset(); await width(viewport); await diagnostic('ADD',0,1); await diagnostic('ADD',1,2);
    await openSheet(); await sheetSelect('100 г.'); await confirm(); await cardQuantity('a',2);
    await cardClick('a','button[aria-label="Уменьшить количество"]'); await cardQuantity('a',1);
    assert.equal(await evaluate('!!document.querySelector("dialog")'),false);
    assert.equal(await cartQuantity(),1); assert.equal(await cartQuantity('tea-100'),1);
    await cardClick('a','button[aria-label="Увеличить количество"]'); await cardQuantity('a',2);
    assert.equal(await cartQuantity(),1); assert.equal(await cartQuantity('tea-100'),2);
    const controls=await evaluate(`(() => {const root=${scope('a')},b=root.querySelector('button[aria-label^="Выбрать фасовку"]'),r=b.getBoundingClientRect(),p=b.parentElement.getBoundingClientRect(),i=b.querySelector('img').getBoundingClientRect();return {size:[r.width,r.height],gap:getComputedStyle(b.parentElement).columnGap,background:getComputedStyle(b).backgroundColor,iconCentered:Math.abs(i.left+i.width/2-r.left-r.width/2)<.1&&Math.abs(i.top+i.height/2-r.top-r.height/2)<.1,inside:p.left>=root.getBoundingClientRect().left&&p.right<=root.getBoundingClientRect().right,stepper:[...root.querySelectorAll('[role="group"][aria-label^="Количество:"] button')].every(n=>!n.hasAttribute('aria-haspopup')&&!n.hasAttribute('aria-controls')),bag:b.getAttribute('aria-haspopup')};})()`);
    assert.deepEqual(controls.size,[32,32]); assert.equal(controls.gap,'8px'); assert.ok(controls.iconCentered&&controls.inside&&controls.stepper); assert.equal(controls.bag,'dialog'); assert.equal(controls.background,'rgba(255, 255, 255, 0.15)');
    await evaluate(`${scope('a')}.scrollIntoView({block:'center'})`); await screenshot(`unified-controls-${viewport}`);
    await evaluate(`${scope('a')}.querySelector('button[aria-label^="Выбрать фасовку"]').focus()`);
    assert.equal(await evaluate(`getComputedStyle(${scope('a')}.querySelector('button[aria-label^="Выбрать фасовку"]')).outlineStyle`),'solid');
    await openSheet(); assert.equal(await draft(),2); await dismiss();
    await waitFor(`document.activeElement===${scope('a')}.querySelector('button[aria-label^="Выбрать фасовку"]')`);
    await openSheet(); await key('Escape'); await waitFor('!document.querySelector("dialog")');
    await waitFor(`document.activeElement===${scope('a')}.querySelector('button[aria-label^="Выбрать фасовку"]')`);
    await cardClick('b','button[aria-label="Уменьшить количество"]'); await cardQuantity('b',2);
    assert.equal(await cartQuantity(),0); assert.equal(await cartQuantity('tea-100'),2);
    assert.ok(await evaluate(`${scope('b')}.textContent.includes('100 г.')`));
    await cardClick('a','button[aria-label="Уменьшить количество"]'); await cardQuantity('a',1);
    await evaluate(`${scope('a')}.querySelector('button[aria-label="Уменьшить количество"]').focus()`);
    await cardClick('a','button[aria-label="Уменьшить количество"]'); await cardQuantity('a',0);
    assert.deepEqual(await items(),[]);
    await waitFor(`document.activeElement===${scope('a')}.querySelector('button[aria-haspopup="dialog"]')`);
    await openSheet(); await sheetSelect('200 г.'); await draftTo(2); await confirm(); await cardQuantity('a',2);
    assert.equal(await cartQuantity('tea-200'),2); assert.equal(await cartQuantity('tea-100'),0);
    await waitFor(`document.activeElement===${scope('a')}.querySelector('button[aria-label^="Выбрать фасовку"]')`);
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,JSON.stringify(await evaluate(`({viewport:innerWidth,scroll:document.documentElement.scrollWidth,x:scrollX,body:document.body.getBoundingClientRect().toJSON(),offenders:[...document.querySelectorAll('body *')].filter(n=>n.scrollWidth>innerWidth).slice(0,12).map(n=>({tag:n.tagName,class:n.className,scroll:n.scrollWidth,right:n.getBoundingClientRect().right,width:n.getBoundingClientRect().width,overflow:getComputedStyle(n).overflow,phase:n.dataset.phase}))})`)));
    console.log(`PASS unified compact ${viewport}: direct +/-/REMOVE, highest remaining selection, bag geometry/semantics, Sheet ADD/SET and focus`);
  }

  // Observe actual animation events and delayed visibility, rather than React state internals.
  async function watchFeedback() {
    await evaluate(`(() => {
      const root=${scope('a')};
      window.__feedbackWatch?.stop();
      const watch={enters:0,shows:[],started:performance.now(),transitions:[]};
      const enter=e=>{if(e.animationName.includes('purchaseEnter')){watch.enters++;watch.transitions.push({duration:getComputedStyle(e.target).animationDuration,frames:e.target.getAnimations().map(a=>a.effect.getKeyframes())});}};
      const observer=new MutationObserver(records=>{for(const r of records)if(r.type==='attributes'&&r.attributeName==='data-pending-visible'&&r.target.hasAttribute('data-pending-visible'))watch.shows.push(performance.now());});
      observer.observe(root,{subtree:true,attributes:true,attributeFilter:['data-pending-visible']});
      root.addEventListener('animationstart',enter);
      watch.stop=()=>{observer.disconnect();root.removeEventListener('animationstart',enter);};
      window.__feedbackWatch=watch;
    })()`);
  }
  const feedback = () => evaluate(`({enters:window.__feedbackWatch.enters,shows:window.__feedbackWatch.shows.length})`);
  const surface = `${scope('a')}.querySelector('[aria-busy]')`;
  const geometry = () => evaluate(`(() => {const root=${scope('a')};return [root.querySelector('article'),root.querySelector('[aria-busy]'),root.querySelector('[role="group"]').parentElement,root.querySelector('button[aria-label^="Выбрать фасовку"]'),root.querySelector('h3'),root.querySelector('img')].map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height];});})()`);
  for (const viewport of [375,414]) {
    await reset(); await width(1280); await diagnostic('ADD',0,3); await diagnostic('ADD',3,1);
    await fullSelect('a','250 г.'); await width(viewport); await watchFeedback();
    const before = await geometry();
    await evaluate(`${scope('a')}.querySelector('button[aria-label="Уменьшить количество"]').focus()`);
    await cardClick('a','button[aria-label="Уменьшить количество"]'); await cardQuantity('a',3);
    await waitFor('window.__feedbackWatch.enters===1');
    assert.equal(await evaluate('window.__feedbackWatch.transitions[0].duration'),'0.18s');
    assert.equal((await feedback()).shows,0,'Fast REMOVE must never flash a spinner');
    assert.deepEqual(await geometry(),before,'Enter opacity must not move content or controls');
    await waitFor(`document.activeElement===${scope('a')}.querySelector('button[aria-label="Уменьшить количество"]')`);
    await waitFor(`${scope('a')}.querySelector('[role="group"]').parentElement.getAnimations().length===0`);
    for (const name of ['Уменьшить количество','Увеличить количество']) {
      await cardClick('a',`button[aria-label="${name}"]`);
    }
    assert.deepEqual(await feedback(),{enters:1,shows:0},'SET +/- cannot trigger selection enter');
    // Controlled async SET, without any production delay.
    await interceptCartCommand('setItemQuantity','defer');
    await evaluate(`(() => {window.__feedbackWatch.started=performance.now();${scope('a')}.querySelector('button[aria-label="Увеличить количество"]').click();if(${surface}.hasAttribute('data-pending-visible'))throw Error('Immediate spinner');})()`);
    await waitFor(`${surface}.getAttribute('aria-busy')==='true'`);
    await waitFor(`${surface}.hasAttribute('data-pending-visible')`);
    assert.ok(await evaluate('window.__feedbackWatch.shows.at(-1)-window.__feedbackWatch.started>=100'));
    const spinner = await evaluate(`(() => {const s=${surface},overlay=s.lastElementChild,spinner=overlay.firstElementChild,r=overlay.getBoundingClientRect(),b=s.getBoundingClientRect(),i=spinner.getBoundingClientRect();return {surface:[b.width,b.height],overlay:[r.x-b.x,r.y-b.y,r.width,r.height],spinner:[spinner.offsetWidth,spinner.offsetHeight],centered:Math.abs(i.x+i.width/2-b.x-b.width/2)<.1&&Math.abs(i.y+i.height/2-b.y-b.height/2)<.1,hidden:overlay.getAttribute('aria-hidden'),focusable:overlay.tabIndex,disabled:[...s.querySelectorAll('button')].every(n=>n.disabled)};})()`);
    assert.deepEqual(spinner.surface,[160,32]); assert.deepEqual(spinner.overlay,[0,0,160,32]);
    assert.deepEqual(spinner.spinner,[16,16]); assert.ok(spinner.centered&&spinner.disabled);
    assert.equal(spinner.hidden,'true'); assert.equal(spinner.focusable,-1);
    assert.deepEqual(await geometry(),before);
    await evaluate(`${scope('a')}.scrollIntoView({block:'center'})`); await screenshot(`pending-${viewport}`);
    await evaluate(`${scope('a')}.querySelector('button[aria-label="Увеличить количество"]').click()`);
    assert.equal(await evaluate('window.__quantityInjection.calls'),1,'Single-flight must remain active');
    await evaluate('window.__quantityInjection.release()'); await cardQuantity('a',4);
    await waitFor(`${surface}.getAttribute('aria-busy')==='false'&&!${surface}.hasAttribute('data-pending-visible')`);
    assert.equal((await feedback()).enters,1); await restoreCartCommand();
    // A new mutation gets a fresh delay; failure removes visible feedback without success animation.
    await interceptCartCommand('setItemQuantity','defer-fail');
    await cardClick('a','button[aria-label="Уменьшить количество"]');
    await waitFor(`${surface}.hasAttribute('data-pending-visible')`);
    await evaluate('window.__quantityInjection.release()');
    await waitFor(`${surface}.getAttribute('aria-busy')==='false'&&!${surface}.hasAttribute('data-pending-visible')`);
    await cardQuantity('a',4); assert.equal((await feedback()).enters,1); await restoreCartCommand();
    // External REMOVE and Sheet ADD/SET/selection changes are not post-REMOVE occurrences.
    await diagnostic('REMOVE',0); await cardQuantity('a',0);
    await openSheet(); await sheetSelect('100 г.'); await draftTo(1); await confirm(); await cardQuantity('a',1);
    await openSheet(); await sheetSelect('250 г.'); await draftTo(1); await confirm(); await cardQuantity('a',1);
    await diagnostic('REMOVE',1);
    assert.equal((await feedback()).enters,1);
    await cardClick('a','button[aria-label="Уменьшить количество"]'); await cardQuantity('a',0);
    assert.equal((await feedback()).enters,1,'Last configuration removal must not animate replacement');
    console.log(`PASS feedback @${viewport}: fast/slow/failure, 120ms delay, 16px spinner, local 160×32 surface, no layout shift, narrow enter and focus`);
  }
  // Deferred REMOVE combines pending cleanup with the new confirmed-state enter.
  await reset(); await width(1280); await diagnostic('ADD',0,3); await diagnostic('ADD',3,1);
  await fullSelect('a','250 г.'); await width(375); await watchFeedback();
  await interceptCartCommand('removeItem','defer-fail');
  await cardClick('a','button[aria-label="Уменьшить количество"]');
  await waitFor(`${surface}.hasAttribute('data-pending-visible')`);
  await evaluate('window.__quantityInjection.release()');
  await waitFor(`${surface}.getAttribute('aria-busy')==='false'`); await cardQuantity('a',1);
  assert.equal((await feedback()).enters,0); await restoreCartCommand();
  await interceptCartCommand('removeItem','defer');
  await cardClick('a','button[aria-label="Уменьшить количество"]');
  await waitFor(`${surface}.hasAttribute('data-pending-visible')`);
  await evaluate('window.__quantityInjection.release()'); await cardQuantity('a',3);
  await waitFor('window.__feedbackWatch.enters===1');
  assert.equal(await evaluate(`${surface}.hasAttribute('data-pending-visible')`),false);
  await restoreCartCommand();
  // Reduced motion keeps a static pending ring and applies the selected state immediately.
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await reset(); await width(1280); await diagnostic('ADD',0,3); await diagnostic('ADD',3,1);
  await fullSelect('a','250 г.'); await width(375); await watchFeedback();
  await interceptCartCommand('removeItem','defer');
  await cardClick('a','button[aria-label="Уменьшить количество"]');
  await waitFor(`${surface}.hasAttribute('data-pending-visible')`);
  assert.equal(await evaluate(`getComputedStyle(${surface}.lastElementChild.firstElementChild).animationName`),'none');
  await evaluate('window.__quantityInjection.release()'); await cardQuantity('a',3);
  assert.equal((await feedback()).enters,0); await restoreCartCommand();
  await send('Emulation.setEmulatedMedia',{features:[]});
  // Unmount while pending cancels the delayed callback without state updates on the old card.
  await interceptCartCommand('setItemQuantity','defer');
  await cardClick('a','button[aria-label="Увеличить количество"]'); await reset();
  await evaluate('window.__quantityInjection.release()'); await restoreCartCommand();
  await cardQuantity('a',0);
  console.log('PASS deferred REMOVE success/failure, reduced motion and pending unmount');

  await reset(); await interceptCartCommand('addItem','defer','ceramics');
  await cardClick('ceramics','button[aria-label^="В корзину"]');
  await waitFor(`!!${scope('ceramics')}.querySelector('[data-pending-visible]')`);
  await evaluate('window.__quantityInjection.release()'); await cardQuantity('ceramics',1);
  await waitFor(`!${scope('ceramics')}.querySelector('[data-pending-visible]')`);
  await waitFor(`document.activeElement===${scope('ceramics')}.querySelector('button[aria-label="Увеличить количество"]')`);
  assert.equal(await evaluate(`${scope('ceramics')}.querySelector('[role="group"]').parentElement.getAnimations().length`),0);
  await restoreCartCommand();
  console.log('PASS fixed compact ADD: delayed local feedback, immediate cleanup, existing plus focus, no selection enter');

  // F2/F5: canonical completion is independent of the latest local UI intent.
  for (const viewport of [375,414]) {
    for (const scenario of ['success','failure','newer-target-disappears']) {
      await reset(); await width(1280);
      for (const index of [0,1,3]) await diagnostic('ADD',index,1);
      await fullSelect('a','250 г.'); await width(viewport); await watchFeedback();
      await interceptCartCommand('removeItem',scenario==='failure'?'defer-fail':'defer');
      await cardClick('a','button[aria-label="Уменьшить количество"]');
      await waitFor(`${scope('a')}.querySelector('button[aria-label="Уменьшить количество"]').disabled`);
      await width(1280); await fullSelect('a','50 г.');
      if(scenario==='newer-target-disappears')await evaluate(`window.__quantityInjection.original(window.__quantityInjection.cart.getItem('tea-presentation',{kind:'selectable',id:'tea-50'}).id)`);
      const focus = await evaluate('document.activeElement.getAttribute("aria-label")');
      await evaluate('window.__quantityInjection.release()');
      await waitFor(`${surface}.getAttribute('aria-busy')==='false'`);
      assert.equal(await evaluate(`${scope('a')}.querySelector('button[aria-haspopup="listbox"]').textContent`),'50 г.');
      assert.equal(await cartQuantity('tea-250'),scenario==='failure'?1:0);
      await cardQuantity('a',scenario==='newer-target-disappears'?0:1);
      assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),focus);
      await width(viewport); assert.equal((await feedback()).enters,0);
      await restoreCartCommand();
      console.log(`PASS async intent ${scenario} @${viewport}: new selection/focus retained, no stale enter, canonical result respected`);
    }
    for(const [direction,expected]of [['Уменьшить количество',2],['Увеличить количество',4]]) {
      for(const moved of [false,true,'body-after-new-focus']) {
        await reset(); await width(viewport); await diagnostic('ADD',0,3);
        await interceptCartCommand('setItemQuantity','defer');
        await cardClick('a',`button[aria-label="${direction}"]`);
        await waitFor(`${surface}.getAttribute('aria-busy')==='true'`);
        if(moved)await evaluate(`document.getElementById('site-header-basket-link').focus()`);
        if(moved==='body-after-new-focus')await evaluate('document.activeElement.blur()');
        await evaluate('window.__quantityInjection.release()'); await cardQuantity('a',expected);
        await waitFor(`${surface}.getAttribute('aria-busy')==='false'`);
        const target=moved==='body-after-new-focus'?'document.body':moved?`document.getElementById('site-header-basket-link')`:`${scope('a')}.querySelector('button[aria-label="${direction}"]')`;
        await waitFor(`document.activeElement===${target}`); await restoreCartCommand();
      }
    }
    for(const last of [false,true])for(const moved of [false,true]){
      await reset(); await diagnostic('ADD',0,1); if(!last)await diagnostic('ADD',1,2);
      await interceptCartCommand('removeItem','defer');
      await cardClick('a','button[aria-label="Уменьшить количество"]');
      if(moved)await evaluate(`document.getElementById('site-header-basket-link').focus()`);
      await evaluate('window.__quantityInjection.release()'); await cardQuantity('a',last?0:2);
      const target=moved?`document.getElementById('site-header-basket-link')`:last?`${scope('a')}.querySelector('button[aria-haspopup="dialog"]')`:`${scope('a')}.querySelector('button[aria-label="Уменьшить количество"]')`;
      await waitFor(`document.activeElement===${target}`); await restoreCartCommand();
    }
    console.log(`PASS async ProductCard focus @${viewport}: SET +/- restore, external and subsequent BODY intent preserved, replacement/last REMOVE`);
  }
  // Dismissal invalidates the pending Sheet session; a later inline choice remains authoritative.
  await reset(); await width(1280); await diagnostic('ADD',0,1); await diagnostic('ADD',3,1);
  await fullSelect('a','250 г.'); await width(375); await interceptCartCommand('setItemQuantity','defer');
  await openSheet(); await draftTo(2); await evaluate('document.querySelector("dialog button[aria-busy]").click()');
  await waitFor('document.querySelector("dialog button[aria-busy]").disabled'); await dismiss();
  await width(1280); await fullSelect('a','50 г.');
  await evaluate('window.__quantityInjection.release()'); await restoreCartCommand();
  await waitFor(`${surface}.getAttribute('aria-busy')==='false'`);
  assert.equal(await cartQuantity('tea-250'),2);
  assert.equal(await evaluate(`${scope('a')}.querySelector('button[aria-haspopup=listbox]').textContent`),'50 г.');
  assert.equal(await evaluate('!!document.querySelector("dialog")'),false);
  console.log('PASS pending Sheet dismiss: canonical SET completes, stale session does not commit selection or steal focus');

  await width(375);
  for(const command of ['setItemQuantity','removeItem']){
    await reset(); await diagnostic('ADD',0,command==='setItemQuantity'?3:1);
    await interceptCartCommand(command,'defer-fail');
    await cardClick('a','button[aria-label="Уменьшить количество"]');
    await evaluate(`document.getElementById('site-header-basket-link').focus()`);
    await evaluate('window.__quantityInjection.release()');
    await waitFor(`${surface}.getAttribute('aria-busy')==='false'`);
    assert.equal(await evaluate('document.activeElement.id'),'site-header-basket-link');
    await cardQuantity('a',command==='setItemQuantity'?3:1); await restoreCartCommand();
  }
  await reset(); await diagnostic('ADD',0,1); await interceptCartCommand('removeItem','defer');
  await cardClick('a','button[aria-label="Уменьшить количество"]'); await reset();
  await evaluate(`document.getElementById('site-header-basket-link').focus()`);
  await evaluate('window.__quantityInjection.release()'); await restoreCartCommand();
  await cardQuantity('a',0); assert.equal(await evaluate('document.activeElement.id'),'site-header-basket-link');
  console.log('PASS async failures/unmount: pending clears, no stale selection or focus action');

  const matrix = [
    ['A',[0,1,2,3],0,3], ['B',[0,1,2,3],1,3], ['C',[0,1,2,3],2,3],
    ['D',[0,1,2,3],3,2], ['E',[0,1,2],0,2], ['F',[0,1,2],1,2],
    ['G',[0,1,2],2,1], ['H',[0,2,3],0,3], ['I',[0,2,3],2,3],
    ['J',[0,1],0,1], ['K',[0,1],1,0],
  ];
  const labels = ['50 г.','100 г.','200 г.','250 г.'];
  const selectedLabel = () => evaluate(`(() => {const root=${scope('a')};return [...root.querySelectorAll('span')].find(n=>n.textContent.startsWith('Вес: ')&&n.getClientRects().length)?.textContent;})()`);
  for (const viewport of [375,414]) {
    for (const [name, configurations, removed, highest] of matrix) {
      await reset(); await width(1280);
      // Deliberately reversed insertion order: last CartItem is not highest weight.
      for (const index of [...configurations].reverse()) await diagnostic('ADD',index,index === removed ? 1 : index+2);
      await fullSelect('a',labels[removed]); await width(viewport);
      await evaluate(`${scope('a')}.querySelector('button[aria-label="Уменьшить количество"]').focus()`);
      await cardClick('a','button[aria-label="Уменьшить количество"]');
      await cardQuantity('a',highest+2);
      assert.equal(await selectedLabel(),`Вес: ${labels[highest]}`);
      assert.equal(await cartQuantity(`tea-${[50,100,200,250][removed]}`),0);
      await waitFor(`document.activeElement===${scope('a')}.querySelector('button[aria-label="Уменьшить количество"]')`);
      assert.equal(await evaluate(`!!${scope('a')}.querySelector('button[aria-label^="Добавить в корзину"]')`),false);
      console.log(`PASS matrix ${name} @${viewport}: REMOVE ${labels[removed]} → ${labels[highest]}`);
    }
    // Primary UX / Q, with more units in the lighter configuration.
    await reset(); await width(1280); await diagnostic('ADD',0,3); await diagnostic('ADD',3,1);
    await fullSelect('a',labels[3]); await width(viewport);
    await cardClick('a','button[aria-label="Уменьшить количество"]'); await cardQuantity('a',3);
    assert.equal(await selectedLabel(),'Вес: 50 г.');
    await openSheet(); assert.equal(await draft(),3); await dismiss();
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    await screenshot(`highest-remaining-${viewport}`);
    await cardClick('a','button[aria-label="Уменьшить количество"]'); await cardQuantity('a',2);
    await cardClick('a','button[aria-label="Уменьшить количество"]'); await cardQuantity('a',1);
    await cardClick('a','button[aria-label="Уменьшить количество"]'); await cardQuantity('a',0);
    assert.deepEqual(await items(),[]);
    await waitFor(`document.activeElement===${scope('a')}.querySelector('button[aria-haspopup="dialog"]')`);
    console.log(`PASS M @${viewport}: last 50g removed → initial CTA and focus`);
  }
  // L: quantity does not set priority. External removal P must not change selection.
  await reset(); await width(1280);
  await diagnostic('ADD',0,10); await diagnostic('ADD',1,5); await diagnostic('ADD',2,1);
  await fullSelect('a',labels[1]); await width(375);
  for (const expected of [4,3,2,1]) {
    await cardClick('a','button[aria-label="Уменьшить количество"]'); await cardQuantity('a',expected);
    assert.equal(await selectedLabel(),'Вес: 100 г.');
  }
  await cardClick('a','button[aria-label="Уменьшить количество"]'); await cardQuantity('a',1);
  assert.equal(await selectedLabel(),'Вес: 200 г.');
  await diagnostic('REMOVE',2); await cardQuantity('a',0);
  assert.equal(await selectedLabel(),'Вес: 200 г.');
  assert.equal(await cartQuantity(),10);
  console.log('PASS L/P: highest weight beats quantity; external REMOVE does not repair selection');

  // Re-read after a deferred REMOVE: another consumer removes the former highest.
  await reset(); await width(1280);
  for (const index of [0,2,3]) await diagnostic('ADD',index,index===0?3:1);
  await fullSelect('a',labels[3]); await width(375);
  await interceptCartCommand('removeItem','defer');
  await cardClick('a','button[aria-label="Уменьшить количество"]');
  await evaluate(`(() => {const {cart,original}=window.__quantityInjection;const item=cart.getItem('tea-presentation',{kind:'selectable',id:'tea-200'});if(!item)throw Error('Missing race target');return original(item.id);})()`);
  await evaluate('window.__quantityInjection.release()'); await cardQuantity('a',3);
  assert.equal(await selectedLabel(),'Вес: 50 г.'); await restoreCartCommand();
  console.log('PASS race: remaining selection reads post-mutation Cart, not pre-REMOVE snapshot');

  // N/O: another Product's highest configuration cannot influence selection; failure preserves it.
  await reset(); await width(1280); await diagnostic('ADD',0,3); await diagnostic('ADD',3,1);
  await fullSelect('a',labels[3]); await width(375);
  await interceptCartCommand('removeItem','fail');
  await evaluate(`window.__quantityInjection.cart.addItem({productKey:'other-tea',configuration:{kind:'selectable',id:'tea-250'},quantity:4,presentation:{slug:'other-tea',title:'Other Tea',configurationLabel:'250 г.'}})`);
  await evaluate(`window.__quantityInjection.cart.addItem({productKey:'other-tea',configuration:{kind:'selectable',id:'tea-100'},quantity:2,presentation:{slug:'other-tea',title:'Other Tea',configurationLabel:'100 г.'}})`);
  await restoreCartCommand(); await interceptCartCommand('removeItem','fail');
  const beforeFailed250 = await items();
  await cardClick('a','button[aria-label="Уменьшить количество"]');
  await waitFor(`!${scope('a')}.querySelector('button[aria-label="Уменьшить количество"]').disabled`);
  assert.equal(await selectedLabel(),'Вес: 250 г.'); await cardQuantity('a',1);
  assert.deepEqual(await items(),beforeFailed250);
  assert.equal(await evaluate('!!document.querySelector("dialog")'),false);
  await restoreCartCommand();
  await cardClick('a','button[aria-label="Уменьшить количество"]'); await cardQuantity('a',3);
  assert.equal(await selectedLabel(),'Вес: 50 г.');
  assert.equal((await items()).find(item=>item.productKey==='other-tea').quantity,4);
  console.log('PASS N/O: same-Product isolation and failed REMOVE preserves selected250');

  await reset(); await width(375); await diagnostic('ADD',0,1); await diagnostic('ADD',1,2);
  await openSheet(); await sheetSelect('100 г.'); await confirm();
  const beforeFailure=await items();
  await clickSelector('input[type="checkbox"]');
  for (const name of ['Уменьшить количество','Увеличить количество']) {
    await cardClick('a',`button[aria-label="${name}"]`); await cardQuantity('a',2);
    assert.deepEqual(await items(),beforeFailure); assert.equal(await evaluate('!!document.querySelector("dialog")'),false);
  }
  await clickSelector('input[type="checkbox"]'); await diagnostic('SET',1,1);
  await interceptCartCommand('removeItem','fail'); const beforeRemoveFailure=await items();
  await cardClick('a','button[aria-label="Уменьшить количество"]'); await cardQuantity('a',1);
  assert.equal(await evaluate('window.__quantityInjection.calls'),1);
  assert.deepEqual(await items(),beforeRemoveFailure); assert.equal(await evaluate('!!document.querySelector("dialog")'),false);
  await restoreCartCommand();
  for (const [start,name,expected] of [[2,'Уменьшить количество',1],[1,'Увеличить количество',2]]) {
    await diagnostic('SET',1,start); await interceptCartCommand('setItemQuantity','defer');
    await evaluate(`(() => {const root=${scope('a')},b=root.querySelector('button[aria-label="${name}"]');b.click();b.click();root.querySelector('button[aria-label^="Выбрать фасовку"]').click();})()`);
    await waitFor(`${scope('a')}.querySelector('button[aria-label^="Выбрать фасовку"]').disabled`);
    assert.equal(await evaluate('window.__quantityInjection.calls'),1); assert.equal(await evaluate('!!document.querySelector("dialog")'),false);
    assert.equal(await cartQuantity('tea-100'),start);
    await evaluate('window.__quantityInjection.release()'); await cardQuantity('a',expected); await restoreCartCommand();
  }
  await cardClick('a','button[aria-label="Увеличить количество"]'); await cardQuantity('a',3);
  await evaluate(`(() => {const b=${scope('a')}.querySelector('button[aria-label="Уменьшить количество"]');window.__oldQuantityClick=b[Object.keys(b).find(k=>k.startsWith('__reactProps$'))].onClick;})()`);
  await diagnostic('REMOVE',1); const withoutTarget=await items();
  await evaluate('window.__oldQuantityClick(); delete window.__oldQuantityClick');
  assert.deepEqual(await items(),withoutTarget); assert.equal(await evaluate('!!document.querySelector("dialog")'),false);
  console.log('PASS direct failures, REMOVE failure, pending bag guard, rapid +/- single-flight, successive increments and vanished target no-op');
  assert.equal(await evaluate(`!!${scope('preorder')}.querySelector('button[aria-label="Уменьшить количество"],button[aria-label="Увеличить количество"],button[aria-label^="Выбрать фасовку"]')`),false);

  await reset(); await diagnostic('ADD', 0, 2);
  await clickText('External ADD 50 in 3 seconds'); await openSheet();
  assert.equal(await draft(), 2);
  await waitFor(`JSON.parse(document.querySelector('[data-testid="items"]').textContent).some(item => item.configuration.id === 'tea-50' && item.quantity === 3)`);
  assert.equal(await draft(), 2);
  await sheetSelect('100 г.'); assert.equal(await draft(), 0);
  await sheetSelect('50 г.'); assert.equal(await draft(), 3);
  await dismiss();
  console.log('PASS open draft snapshot vs external Cart update; explicit target switch reads latest state');

  await openSheet(); await diagnostic('REMOVE', 0);
  assert.equal(await draft(), 3); await confirm(); assert.equal(await cartQuantity(), 3);
  await openSheet(); await sheetSelect('200 г.');
  await draftTo(1);
  await diagnostic('ADD', 2, 2); assert.equal(await draft(), 1);
  await confirm(); assert.equal(await cartQuantity('tea-200'), 1); assert.equal(await cartQuantity(), 3);
  console.log('PASS Confirm rechecks current target: removed target ADDs, externally created target SETs');

  await openSheet('availability');
  await sheetSelect('200 г.'); assert.equal(await draft(), 0);
  assert.equal(await evaluate(`document.querySelector('dialog button[aria-pressed="true"]').textContent`), '200 г.');
  assert.equal(await evaluate(`document.querySelectorAll('dialog [aria-label="Выберите вес"] button:disabled').length`), 0);
  assert.equal(await evaluate(`document.querySelector('dialog button[aria-label="Увеличить количество"]').disabled`), true);
  assert.equal(await evaluate(`document.querySelector('dialog button[aria-busy]').disabled`),true);
  for (let i = 0; i < 12; i++) {
    await key('Tab');
    const focus = await evaluate(`({ inside: document.querySelector('dialog').contains(document.activeElement), tag: document.activeElement.tagName, pageFocused: document.hasFocus() })`);
    assert.ok(focus.inside || (focus.tag === 'BODY' && !focus.pageFocused), JSON.stringify(focus));
  }
  await key('Escape'); await waitFor(`!document.querySelector('dialog')`);

  await width(1440);
  await cardClick('availability', 'button[aria-haspopup="listbox"]');
  await key('Home'); await key('ArrowDown'); await key('ArrowDown'); await key('Enter');
  assert.equal(await evaluate(`${scope('availability')}.querySelector('button[aria-haspopup="listbox"]').textContent`), '200 г.');
  console.log('PASS unavailable inspection/keyboard selection, purchase guards and native modal focus containment');

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
