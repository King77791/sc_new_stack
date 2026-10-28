// Browser assertions use the existing Chrome DevTools workflow; no dependencies.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base = process.env.CART_QA_URL ?? 'http://127.0.0.1:3012';
const debug = process.env.CART_QA_CHROME ?? 'http://127.0.0.1:9334';
const target = await fetch(`${debug}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
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
    const id = ++sequence;
    const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 45000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(expression, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await evaluate(expression)) return; await sleep(25); }
  throw new Error(`Timed out: ${expression}`);
}
const shell = '[data-notification-host] [data-notification-id]';
const preview = '[data-notification-preview] [data-notification-id]';
const q = JSON.stringify;
async function click(text) {
  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent === ${q(text)}); if(!b) throw Error(${q(text)}); b.click(); })()`);
}
async function idle(selector = shell) { await wait(`!document.querySelector(${q(selector)})`, 20000); }
async function resting(selector = shell) { await wait(`document.querySelector(${q(selector)})?.dataset.phase === 'resting'`); }
async function width(value) {
  await send('Emulation.setDeviceMetricsOverride', { width: value, height: 900, deviceScaleFactor: 1, mobile: false });
}
async function navigate(route) {
  await send('Page.navigate', { url: base + route });
  await wait(`document.readyState === 'complete' && !!document.querySelector('[data-notification-host]')`);
  await evaluate('document.fonts.ready');
}
try {
await send('Runtime.enable'); await send('Page.enable');
await width(1280); await navigate('/dev/notification');
await wait(`!![...document.querySelectorAll('button')].find(b => b.textContent === 'Cart success')`);
// Capture actual rendered lifecycle and announcement mutations, including identical text.
await evaluate(`window.notificationLog = []; window.announcementLog = [];
  new MutationObserver(() => {
    const n = document.querySelector(${q(shell)}); const phase = n?.dataset.phase ?? 'removed'; const id = n?.dataset.notificationId ?? '';
    const last = window.notificationLog.at(-1);
    if (!last || last.phase !== phase || last.id !== id) window.notificationLog.push({phase,id,time:performance.now(),left:n?.getBoundingClientRect().left,right:n?.getBoundingClientRect().right});
  }).observe(document.querySelector('[data-notification-host]'), {subtree:true,attributes:true,childList:true});
  window.exitBounds=[];
  document.addEventListener('transitionend', event => { const n=event.target; if(n.matches(${q(shell)}) && n.dataset.phase==='exiting' && event.propertyName==='transform') window.exitBounds.push(n.getBoundingClientRect().left); }, true);
  new MutationObserver(() => { const text = document.querySelector('[data-notification-live]').textContent; if(text) window.announcementLog.push(text); }).observe(document.querySelector('[data-notification-live]'), {subtree:true,childList:true,characterData:true});`);
await click('ADD 50 / 50 / 100');
await idle();
const log = await evaluate('window.notificationLog');
const entering = log.filter(e => e.phase === 'entering');
assert.equal(entering.length, 3); assert.equal(new Set(entering.map(e => e.id)).size, 3);
const durations = entering.map(e => {
  const rest = log.find(r => r.id === e.id && r.phase === 'resting');
  const exit = log.find(r => r.id === e.id && r.phase === 'exiting');
  const next = log[log.indexOf(exit) + 1];
  const values = [rest.time - e.time, exit.time - rest.time, next.time - exit.time];
  assert.ok(values[0] > 570 && values[0] < 850, values);
  assert.ok(values[1] > 1200 && values[1] < 1450, values);
  assert.ok(values[2] > 570 && values[2] < 850, values);
  return values.map(Math.round);
});
assert.ok(await evaluate('window.announcementLog.length >= 3'));
assert.ok(log.filter(e => e.phase === 'starting').every(e => e.right < 0));
assert.ok(await evaluate('window.exitBounds.length===3 && window.exitBounds.every(left=>left>innerWidth)'));
console.log('FIFO / repeated announcements / actual timing PASS', durations);

for (const scenario of ['Event during ENTER', 'Event during REST', 'Event during EXIT']) {
  const before = await evaluate('window.notificationLog.filter(e=>e.phase==="entering").length');
  await click(scenario); await idle();
  assert.equal(await evaluate('window.notificationLog.filter(e=>e.phase==="entering").length'), before + 2);
}
await evaluate(`[...document.querySelectorAll('button')].find(n=>n.textContent==='Cart success').focus()`);
await click('Cart success'); await resting();
assert.equal(await evaluate('document.activeElement.textContent'), 'Cart success'); await idle();
await click('Repeated identical'); await wait(`document.querySelector(${q(shell)})?.dataset.phase==='entering'`);
await width(375); await resting();
assert.ok(await evaluate(`Math.abs((document.querySelector(${q(shell)}).getBoundingClientRect().left + document.querySelector(${q(shell)}).getBoundingClientRect().right)/2-innerWidth/2)<1`));
await idle(); console.log('Events during each phase / no focus steal / resize in flight PASS');

// F1: viewport-dependent EXIT destinations restart the real CSS transition.
for (const [from, to, suppressEnd] of [[375, 1920, false], [1920, 375, false], [375, 1920, true]]) {
  await width(from); await click('Repeated identical');
  await wait(`document.querySelector(${q(shell)})?.dataset.phase==='exiting'`);
  const id = await evaluate(`document.querySelector(${q(shell)}).dataset.notificationId`);
  await evaluate(`window.resizeAttempt={id:${q(id)},runs:[],ends:[]};
    window.resizeRun = e => {if(e.propertyName==='transform' && e.target.matches(${q(shell)}) && e.target.dataset.notificationId===${q(id)} && e.target.dataset.phase==='exiting') resizeAttempt.runs.push(performance.now());};
    window.resizeEnd = e => {if(e.propertyName==='transform' && e.target.matches(${q(shell)}) && e.target.dataset.notificationId===${q(id)} && e.target.dataset.phase==='exiting') {const r=e.target.getBoundingClientRect();resizeAttempt.ends.push({at:performance.now(),left:r.left,right:r.right,viewport:innerWidth});if(${suppressEnd})e.stopImmediatePropagation();}};
    document.addEventListener('transitionrun',resizeRun,true);document.addEventListener('transitionend',resizeEnd,true);`);
  await sleep(450); await width(to); await sleep(150);
  const beforeOldDeadline = await evaluate(`(() => {const n=document.querySelector(${q(shell)});const r=n?.getBoundingClientRect();return {id:n?.dataset.notificationId,left:r?.left,right:r?.right,viewport:innerWidth};})()`);
  await sleep(200);
  assert.equal(await evaluate(`document.querySelector(${q(shell)})?.dataset.notificationId`), id, 'Must survive original EXIT watchdog deadline ' + JSON.stringify(await evaluate('resizeAttempt')));
  await idle();
  const attempt = await evaluate(`(() => {document.removeEventListener('transitionrun',resizeRun,true);document.removeEventListener('transitionend',resizeEnd,true);return resizeAttempt;})()`);
  assert.ok(attempt.runs.length >= 1, 'Browser must report the restarted transform attempt');
  assert.equal(attempt.ends.length, 1);
  assert.ok(attempt.ends[0].left - 2 > to, JSON.stringify(attempt));
  const progression = await evaluate(`window.notificationLog.filter(e=>Number(e.id)>=Number(${q(id)}))`);
  const next = progression.find(e=>e.phase==='starting' && e.id!==id);
  assert.ok(next && next.time >= attempt.ends[0].at);
  console.log(`F1 EXIT ${from}→${to}, resize ≈450ms, suppressed end=${suppressEnd} PASS`, {beforeOldDeadline,actualCompletion:attempt.ends[0]});
}

for (const viewport of [375, 414, 1280, 1440, 1920]) {
  await width(viewport); await click('Cart success'); await resting();
  const geometry = await evaluate(`(() => { const n=document.querySelector(${q(shell)}), r=n.getBoundingClientRect(), c=getComputedStyle(n);return {width:r.width,height:r.height,center:(r.left+r.right)/2,bottom:innerHeight-r.bottom,overflow:document.documentElement.scrollWidth>innerWidth,radius:c.borderRadius,blur:c.backdropFilter,z:getComputedStyle(n.parentElement).zIndex,background:c.backgroundColor,shadow:c.boxShadow}; })()`);
  assert.ok(Math.abs(geometry.center - viewport / 2) < 1, JSON.stringify({ viewport, ...geometry }));
  assert.ok(Math.abs(geometry.bottom - 40) < 1);
  assert.ok(Math.abs(geometry.width - 301) < 2, JSON.stringify(geometry));
  assert.equal(geometry.height, 57); assert.equal(geometry.overflow, false); assert.equal(geometry.radius, '20px'); assert.equal(geometry.z, '21');
  if (viewport === 375 || viewport === 1280) {
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(os.tmpdir(), `notification-${viewport}.png`), Buffer.from(screenshot.data, 'base64'));
  }
  await idle(); console.log(`Geometry ${viewport} PASS`, geometry);
}
await width(375);
for (const scenario of ['Long text', 'Unbreakable text']) {
  await click(scenario); await resting(preview);
  const safe = await evaluate(`(() => {const r=document.querySelector(${q(preview)}).getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,scroll:document.documentElement.scrollWidth};})()`);
  assert.ok(safe.left >= 17 && safe.right <= safe.width - 17 && safe.scroll <= safe.width, JSON.stringify({scenario,...safe})); await idle(preview);
}

// F3: exercise real overlap, not just computed z-index. Pointer outside shell stays on Footer.
for (const viewport of [375, 1280]) {
  await width(viewport); await evaluate('window.scrollTo(0,document.documentElement.scrollHeight)');
  await click('Long text'); await resting(preview);
  const overlap = await evaluate(`(() => {
    const n=document.querySelector(${q(preview)}),r=n.getBoundingClientRect(),f=document.querySelector('footer').getBoundingClientRect();
    const y0=Math.max(r.top+24,f.top+24,24),y1=Math.min(r.bottom-24,f.bottom-24,innerHeight-24);
    const hits=[];for(const y of [y0,(y0+y1)/2,y1])for(const x of [r.left+24,(r.left+r.right)/2,r.right-24])hits.push(document.elementFromPoint(x,y)?.closest('[data-notification-id]')===n);
    const outside=document.elementFromPoint(5,(y0+y1)/2);
    return {overlaps:y1>y0,hits,outsideFooter:!!outside?.closest('footer'),insideContent:!!n.closest('.app-content'),height:r.height,bottom:innerHeight-r.bottom,overflow:document.documentElement.scrollWidth>innerWidth};
  })()`);
  assert.ok(overlap.overlaps); assert.ok(overlap.hits.every(Boolean), JSON.stringify(overlap));
  assert.ok(overlap.outsideFooter); assert.equal(overlap.insideContent,false); assert.equal(overlap.overflow,false); assert.equal(overlap.bottom,40);
  const screenshot = await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(path.join(os.tmpdir(),`notification-tall-footer-${viewport}.png`),Buffer.from(screenshot.data,'base64'));
  await idle(preview); console.log(`F3 tall Footer overlap / pointer ${viewport} PASS`,overlap);
}
await evaluate('window.scrollTo(0,0)');
await width(1280); await click('Cart success'); await resting();
const hoverPoint = await evaluate(`(() => {const r=document.querySelector(${q(shell)}).getBoundingClientRect();return {x:r.left+30,y:r.top+20};})()`);
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...hoverPoint });
await wait(`document.querySelector(${q(shell)})?.dataset.paused === 'true'`);
await sleep(1500); assert.ok(await evaluate(`!!document.querySelector(${q(shell)})`));
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 }); await idle();
await click('Interactive preview'); await resting(preview);
await evaluate(`document.querySelector(${q(preview + ' button')}).focus()`);
await wait(`document.querySelector(${q(preview)})?.dataset.paused === 'true'`);
const point = await evaluate(`(() => {const r=document.querySelector(${q(preview)}).getBoundingClientRect();return {x:r.left+5,y:r.top+5};})()`);
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 });
await sleep(1500); assert.ok(await evaluate(`document.querySelector(${q(preview)})?.dataset.paused === 'true'`));
await click('Preview action'); assert.equal(await evaluate(`document.querySelector('[data-preview-clicks]').textContent`), '1');
await evaluate('document.activeElement.blur()'); await idle(preview);
console.log('Wrapping / hover / focus / combined pause / interactive composition PASS');

await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await click('Repeated identical'); await resting();
assert.equal(await evaluate(`getComputedStyle(document.querySelector(${q(shell)})).transitionDuration`), '0s');
await idle();
await click('Repeated identical');
await evaluate(`document.querySelector('a[href="/dev/notification/observer"]').click()`);
await wait(`location.pathname === '/dev/notification/observer'`);
assert.equal(await evaluate(`document.querySelectorAll('[data-notification-host]').length`), 1);
await idle();
await send('Page.reload'); await wait(`document.readyState==='complete' && !!document.querySelector('[data-notification-host]')`);
assert.equal(await evaluate(`document.querySelector(${q(shell)})`), null);
console.log('Reduced motion / client navigation / reload PASS');
assert.equal(problems.filter(p => !JSON.stringify(p).includes('Image with src')).length, 0, JSON.stringify(problems));
console.log('Console / exceptions PASS');
} finally {
  socket.close(); await fetch(`${debug}/json/close/${target.id}`);
}
