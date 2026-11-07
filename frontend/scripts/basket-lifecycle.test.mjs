// Real React DOM lifecycle in Chrome. CDP pipe + about:blank: no HTTP server/network.
// TEST SEAM: actual CartProvider commits synchronously; only command RESPONSE settlement
// is deferred. This does not simulate, or claim coverage of, a delayed server commit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Module from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const require = Module.createRequire(import.meta.url);
const webpackPackage = require('next/dist/compiled/webpack/webpack');
webpackPackage.init();
const { webpack } = webpackPackage;

function chromeExecutable() {
  const candidates = [process.env.LIFECYCLE_CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  const found = candidates.find(candidate => fs.existsSync(candidate));
  assert.ok(found, 'BLOCKED: real Chrome required; set LIFECYCLE_CHROME. No fake lifecycle fallback.');
  return found;
}

async function bundle(directory) {
  const source = relative => path.join(frontend, relative).replaceAll('\\', '/');
  const write = (name, content) => { const filename = path.join(directory, name); fs.writeFileSync(filename, content); return filename; };
  const loader = write('typescript.cjs', `module.exports = function(source) { return require(${JSON.stringify(require.resolve('typescript'))}).transpileModule(source, {compilerOptions:{target:7,module:99,jsx:4,esModuleInterop:true}}).outputText; };`);
  const cssLoader = write('css.cjs', 'module.exports = function() { return "module.exports = new Proxy({}, {get: (_target, key) => String(key)});"; };');
  const link = write('link.tsx', `import React from 'react'; export default function Link({children, href, ...props}) { return <a href={href} {...props}>{children}</a>; }`);
  const image = write('image.tsx', `import React from 'react'; export default function Image({alt}) { return <span role="img" aria-label={alt || undefined} />; }`);
  const cartSeam = write('cart-seam.tsx', `
    import {createContext, useContext} from 'react';
    export const TestCartContext = createContext(null);
    export function useCart() { const value = useContext(TestCartContext); if (!value) throw Error('Missing explicit test Cart boundary'); return value; }
  `);
  const interactionsProbe = write('interactions-probe.ts', `
    import {createBasketInteractions as real, initialBasketInteractionState} from ${JSON.stringify(source('features/basket/model/basket-interactions.ts'))};
    export {initialBasketInteractionState};
    export function createBasketInteractions(getCart, getInputs, changed) {
      const probe = window.__lifecycleProbe;
      const record = {connects:0, disconnects:0, events:[], api:null}; probe.instances.push(record);
      const api = real(getCart, getInputs, state => { record.events.push(structuredClone(state)); changed(state); });
      record.api = api;
      return {...api,
        connect() { record.connects++; return api.connect(); },
        disconnect() { record.disconnects++; return api.disconnect(); }
      };
    }
  `);
  const entry = write('entry.tsx', `
    import React, {act, useLayoutEffect, useState} from 'react';
    import {createRoot} from 'react-dom/client';
    import {CartProvider, useCart as useActualCart} from ${JSON.stringify(source('features/cart/CartProvider.tsx'))};
    import {getCartItemId} from ${JSON.stringify(source('features/cart/cart.model.ts'))};
    import {BasketFeature} from ${JSON.stringify(source('features/basket/ui/BasketFeature.tsx'))};
    import {applicationProductInputs as app} from ${JSON.stringify(source('features/product-input/product-input.application.ts'))};
    import {TestCartContext} from './cart-seam';
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const ensure = (condition, message) => { if (!condition) throw Error(message); };
    const equal = (a,b,message) => ensure(JSON.stringify(a)===JSON.stringify(b), message+' '+JSON.stringify({actual:a,expected:b}));
    const deferred = () => { let resolve,reject; const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}; };
    const snapshot = cart => {
      ensure(cart.itemCount===cart.items.length,'public itemCount differs from canonical lines');
      ensure(new Set(cart.items.map(i=>i.id)).size===cart.items.length,'duplicate canonical identity');
      for(const item of cart.items){
        ensure(Number.isSafeInteger(item.quantity)&&item.quantity>0,'invalid canonical quantity');
        ensure(cart.getItem(item.productKey,item.configuration)===item,'canonical reference differs from public getter');
        ensure(cart.getQuantity(item.productKey,item.configuration)===item.quantity,'public quantity differs from canonical snapshot');
      }
      return cart.items.map(i=>({id:i.id,productKey:i.productKey,configuration:i.configuration,quantity:i.quantity}));
    };
    window.runLifecycle = async ({kind='set', reject=false, strict=false, remountBefore=false, mountOnly=false, merge=true}) => {
      const host=document.createElement('div'), sentinel=document.createElement('button');
      sentinel.textContent='Independent user focus'; document.body.append(sentinel,host);
      const probe={instances:[]};window.__lifecycleProbe=probe;
      const faults=[], unhandled=e=>{faults.push(String(e.reason));e.preventDefault()};
      window.addEventListener('unhandledrejection',unhandled);
      const originalAdd=document.addEventListener,originalRemove=document.removeEventListener;
      const ownAdd=Object.hasOwn(document,'addEventListener'),ownRemove=Object.hasOwn(document,'removeEventListener');
      const realAdd=originalAdd.bind(document), realRemove=originalRemove.bind(document);
      const listeners=new Map();
      document.addEventListener=(type, callback, options)=>{if(['focusin','pointerdown'].includes(type)){if(!listeners.has(callback))listeners.set(callback,new Set());listeners.get(callback).add(type);}return realAdd(type,callback,options);};
      document.removeEventListener=(type,callback,options)=>{listeners.get(callback)?.delete(type);return realRemove(type,callback,options);};
      const listenerCount=()=>[...listeners.values()].reduce((n,s)=>n+s.size,0);
      const originalFrame=window.requestAnimationFrame,originalCancel=window.cancelAnimationFrame;
      const realFrame=originalFrame.bind(window), realCancel=originalCancel.bind(window);
      let scheduled=0;const frames=new Set();
      window.requestAnimationFrame=callback=>{scheduled++;const id=realFrame(time=>{frames.delete(id);callback(time)});frames.add(id);return id;};
      window.cancelAnimationFrame=id=>{frames.delete(id);realCancel(id);};
      const realFocus=HTMLElement.prototype.focus,focusCalls=[];
      HTMLElement.prototype.focus=function(...args){focusCalls.push({connected:this.isConnected,name:this.getAttribute('aria-label')||this.textContent});return realFocus.apply(this,args);};
      let control, cart, gate=null, commandCalls=0, sourceReferenceChecked=false;
      const publications=[];
      const invoke=(name,work,input)=>{
        if(!gate || gate.kind!==name)return work();
        ensure(!gate.started,'duplicate command despite pending locks'); gate.started=true;commandCalls++;
        if(name==='transfer') {ensure(cart.getItem(input.expectedSource.productKey,input.expectedSource.configuration)===input.expectedSource,'F1 expectedSource lost reference');sourceReferenceChecked=true;}
        const accepted=work(); gate.accepted=accepted;
        accepted.then(result=>{gate.result=result},error=>{gate.realError=String(error)});
        return gate.response.promise.then(()=>accepted);
      };
      function Harness() {
        const actual=useActualCart();const [instance,setInstance]=useState('A');
        useLayoutEffect(()=>{cart=actual;control={hide:()=>setInstance(null),show:()=>setInstance('B')};publications.push(snapshot(actual));},[actual]);
        const boundary={...actual,
          setItemQuantity:(...args)=>invoke('set',()=>actual.setItemQuantity(...args)),
          removeItem:(...args)=>invoke('remove',()=>actual.removeItem(...args)),
          transferConfiguration:input=>invoke('transfer',()=>actual.transferConfiguration(input),input)
        };
        return <TestCartContext.Provider value={boundary}>{instance && <BasketFeature key={instance}/>}</TestCartContext.Provider>;
      }
      const root=createRoot(host);
      const click=async node=>{ensure(node instanceof HTMLButtonElement && !node.disabled,'expected enabled public button');await act(async()=>{node.focus();node.click();});};
      const mounted=()=>probe.instances.filter(i=>i.connects>0).at(-1);
      const fresh=()=>{
        ensure(!host.querySelector('fieldset'),'stale editor inherited');
        ensure(!host.querySelector('[aria-busy="true"]'),'stale pending inherited');
        ensure([...host.querySelectorAll('[role="status"]')].every(n=>!n.textContent.trim()),'stale error inherited');
        equal(mounted().events.at(-1)?.pending || [],[],'new instance locks');
      };
      try {
        await act(async()=>{const content=<CartProvider resolvePricing={app.resolvePricing} resolveTransferTarget={app.resolveTransferTarget}><Harness/></CartProvider>;root.render(strict?<React.StrictMode>{content}</React.StrictMode>:content);});
        ensure(host.querySelector('h1')?.textContent==='Корзина','real BasketFeature did not mount');
        const initialInstance=mounted();ensure(initialInstance?.connects>0,'real mount effect did not connect interactions');
        if(strict)ensure(initialInstance.disconnects>0 && initialInstance.connects>initialInstance.disconnects,'StrictMode did not replay effects into a connected state');
        if(mountOnly){
          const before=initialInstance.disconnects;await act(async()=>control.hide());
          ensure(initialInstance.disconnects>before,'React unmount did not execute cleanup');
          ensure(!host.querySelector('main'),'React subtree still mounted');
          return {mountOnly:true,connects:initialInstance.connects,disconnects:initialInstance.disconnects,listeners:listenerCount(),canonical:snapshot(cart)};
        }
        const add=(id,q)=>cart.addItem({productKey:'tea-presentation',configuration:{kind:'selectable',id},quantity:q,
          presentation:{slug:'tea-presentation',title:'Lifecycle tea',configurationLabel:id==='tea-50'?'50 г.':'100 г.'}});
        await act(async()=>{await add('tea-50',2);if(kind==='transfer'&&merge)await add('tea-100',3);});
        const before=snapshot(cart), source=cart.items.find(i=>i.configuration.id==='tea-50');
        const targetId=getCartItemId({productKey:'tea-presentation',configuration:{kind:'selectable',id:'tea-100'}});
        const publicationStart=publications.length;
        let button;
        if(kind==='transfer'){
          await click(host.querySelector('button[data-action="edit"]'));
          await act(async()=>{host.querySelector('input[value="tea-100"]').click();});
          button=[...host.querySelectorAll('button')].find(n=>n.textContent==='Перенести');
        }else button=host.querySelector('button[data-action="'+(kind==='remove'?'remove':'increase')+'"]');
        gate={kind,response:deferred(),started:false,result:null};
        await click(button);
        ensure(gate.started&&gate.result?.ok,'real public command did not commit before deferred response');
        ensure(commandCalls===1,'duplicate mutation');
        const active=mounted();
        ensure(active.api.isPending(source.id),'source lock absent while response pending');
        if(kind==='transfer')ensure(active.api.isPending(targetId),'F1 target lock absent');
        ensure(listenerCount()===2,'real focused action did not acquire focus lease');
        const committed=snapshot(cart);
        if(kind==='transfer'){
          ensure(sourceReferenceChecked,'source reference not checked');ensure(committed.length===1,'partial F1');
          ensure(committed[0].id===targetId && committed[0].quantity===(merge?5:2),'atomic transfer/merge Q incorrect');
          ensure(publications.slice(publicationStart).every(items=>items.length===1&&items[0].id===targetId&&items[0].quantity===(merge?5:2)),'partial F1 publication observed');
        }else if(kind==='remove')ensure(committed.length===0,'accepted REMOVE missing');
        else ensure(committed.length===1&&committed[0].id===source.id&&committed[0].quantity===3,'accepted SET missing');
        const disconnects=active.disconnects;await act(async()=>control.hide());
        ensure(!host.querySelector('main'),'unmount was not performed by React');
        ensure(active.disconnects>disconnects,'cleanup did not invoke real disconnect');
        ensure(!active.api.isPending(source.id)&&(kind!=='transfer'||!active.api.isPending(targetId)),'cleanup left locks');
        ensure(listenerCount()===0,'cleanup leaked document focus listeners');
        ensure(frames.size===0,'cleanup left animation frames');
        if(remountBefore){await act(async()=>control.show());fresh();}
        sentinel.focus();focusCalls.length=0;
        const oldEvents=active.events.length, beforeSettlementFrames=scheduled;
        await act(async()=>{if(reject)gate.response.reject(Error('controlled response rejection AFTER canonical commit'));else gate.response.resolve();await gate.accepted;});
        // Real browser frame barrier, not a sleep and not a substituted rAF lifecycle.
        await new Promise(resolve=>realFrame(()=>realFrame(resolve)));
        ensure(active.events.length===oldEvents,'old instance invoked state callback after cleanup');
        ensure(scheduled===beforeSettlementFrames,'stale completion scheduled a focus restoration');
        ensure(document.activeElement===sentinel&&focusCalls.length===0,'stale completion attempted focus');
        const staleFrames=scheduled-beforeSettlementFrames, staleFocusAttempts=focusCalls.length;
        ensure(faults.length===0,'unhandled rejection');
        equal(snapshot(cart),committed,'unmount rolled back/duplicated accepted canonical mutation');
        if(!remountBefore)await act(async()=>control.show());
        fresh();
        equal([...host.querySelectorAll('[data-row-id]')].map(n=>n.dataset.rowId),committed.map(i=>i.id),'remount UI differs from canonical Cart');
        const canonicalOnRemount=snapshot(cart);
        const oldGate=gate;gate=null;
        if(committed.length){await click(host.querySelector('button[data-action="increase"]'));ensure(cart.items[0].quantity===committed[0].quantity+1,'remount inherited old locks');}
        const result={kind,reject,strict,remountBefore,merge,before,committed,canonicalOnRemount,commandCalls,sourceReferenceChecked,
          oldStateCallbacksAfterCleanup:active.events.length-oldEvents,staleFrames,
          focusAttemptsAfterSettlement:staleFocusAttempts,unhandled:faults,connects:active.connects,disconnects:active.disconnects,
          canonicalAfterRemount:snapshot(cart),responseSettled:Boolean(oldGate.result?.ok)};
        return result;
      }finally{
        if(gate?.started)gate.response.resolve();
        try {
          await act(async()=>root.unmount());
          ensure(listenerCount()===0,'final unmount leaked focus listeners');
          ensure(frames.size===0,'final unmount left focus frames');
        } finally {
          // Restore instrumentation even on failure; a failing assertion still reports a leak.
          for(const [callback,types] of listeners)for(const type of types)realRemove(type,callback,true);
          for(const frame of frames)realCancel(frame);
          if(ownAdd)document.addEventListener=originalAdd;else delete document.addEventListener;
          if(ownRemove)document.removeEventListener=originalRemove;else delete document.removeEventListener;
          window.requestAnimationFrame=originalFrame;window.cancelAnimationFrame=originalCancel;HTMLElement.prototype.focus=realFocus;
          window.removeEventListener('unhandledrejection',unhandled);host.remove();sentinel.remove();delete window.__lifecycleProbe;
        }
      }
    };
  `);
  const compiler = webpack({ mode: 'development', target: 'web', devtool: false, cache: false,
    context: frontend, entry, output: { path: directory, filename: 'lifecycle.js' },
    resolve: { extensions: ['.ts', '.tsx', '.js'], modules: [path.join(frontend, 'node_modules'), 'node_modules'],
      alias: { '@': frontend, 'react$': require.resolve('react'), 'react/jsx-runtime$': require.resolve('react/jsx-runtime'),
        'react-dom$': require.resolve('react-dom'), 'react-dom/client$': require.resolve('react-dom/client'), 'next/link$': link, 'next/image$': image } },
    module: { rules: [{ test: /\.tsx?$/, use: loader }, { test: /\.css$/, use: cssLoader }] },
    plugins: [new webpack.NormalModuleReplacementPlugin(/CartProvider$|basket-interactions$/, resource => {
      if (path.resolve(resource.context) !== path.join(frontend, 'features/basket/ui')) return;
      resource.request = resource.request.endsWith('CartProvider') ? cartSeam : interactionsProbe;
    })],
  });
  try { await new Promise((resolve, reject) => compiler.run((error, stats) => {
    if (error) reject(error); else if (stats.hasErrors()) reject(new Error(stats.toString({ all: false, errors: true }))); else resolve();
  })); } finally { await new Promise((resolve, reject) => compiler.close(error => error ? reject(error) : resolve())); }
  return fs.readFileSync(path.join(directory, 'lifecycle.js'), 'utf8');
}

function browser(executable, directory) {
  const child = spawn(executable, ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-pipe',
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    `--user-data-dir=${path.join(directory, 'chrome')}`, 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], windowsHide: true });
  child.stderr.resume();
  let sequence = 0, buffer = ''; const pending = new Map(), errors = [], network = [];
  const fail = error => { for (const request of pending.values()) { clearTimeout(request.timer); request.reject(error); } pending.clear(); };
  child.on('error', fail); child.on('exit', () => fail(new Error('Chrome exited')));
  child.stdio[4].on('data', chunk => {
    buffer += chunk.toString();
    for (let end; (end = buffer.indexOf('\0')) >= 0;) {
      const message = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
      if (message.id) { const request = pending.get(message.id); if (request) { clearTimeout(request.timer); pending.delete(message.id);
        if (message.error) request.reject(new Error(JSON.stringify(message.error))); else request.resolve(message.result); } }
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
      if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) errors.push(message.params);
      if (message.method === 'Network.requestWillBeSent') network.push(message.params.request.url);
    }
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
    pending.set(id, { resolve, reject, timer }); child.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
  });
  return { send, errors, network, async close() {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise(resolve => child.once('exit', resolve));
    try { await send('Browser.close'); } catch { child.kill(); }
    await exited; fail(new Error('Test browser closed'));
  } };
}

test('BasketFeature real React DOM lifecycle (explicit delayed-response seam, actual synchronous Cart commits)', { timeout: 120000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-basket-lifecycle-'));
  let chrome;
  try {
    const script = await bundle(directory); chrome = browser(chromeExecutable(), directory);
    const version = await chrome.send('Browser.getVersion'); t.diagnostic(version.product);
    const { targetId } = await chrome.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await chrome.send('Target.attachToTarget', { targetId, flatten: true });
    const send = (method, params) => chrome.send(method, params, sessionId);
    await send('Runtime.enable'); await send('Network.enable');
    const installed = await send('Runtime.evaluate', { expression: script, returnByValue: true });
    assert.equal(installed.exceptionDetails, undefined, JSON.stringify(installed.exceptionDetails));
    const scenarios = [
      ['L1 real mount/effect/React unmount/cleanup', { mountOnly: true }],
      ['L2/L4 SET accepted, unmount, resolve, remount', {}],
      ['L3 SET accepted, unmount, response reject, remount', { reject: true }],
      ['L5 new mount/user focus before old response', { remountBefore: true }],
      ['L2 REMOVE accepted, unmount before response', { kind: 'remove', remountBefore: true }],
      ['L6 atomic F1 merge accepted, unmount, resolve', { kind: 'transfer', remountBefore: true }],
      ['L6 atomic F1 absent-target transfer, unmount, resolve', { kind: 'transfer', merge: false, remountBefore: true }],
      ['L6 atomic F1 merge accepted, unmount, response reject', { kind: 'transfer', remountBefore: true, reject: true }],
      ['L7 real StrictMode effect replay, pending, unmount/remount', { strict: true, remountBefore: true }],
    ];
    for (const [name, options] of scenarios) await t.test(name, async () => {
      const response = await send('Runtime.evaluate', { expression: `window.runLifecycle(${JSON.stringify(options)})`, awaitPromise: true, returnByValue: true });
      assert.equal(response.exceptionDetails, undefined, JSON.stringify(response.exceptionDetails));
      const evidence = response.result.value; assert.ok(evidence); t.diagnostic(JSON.stringify(evidence));
      assert.deepEqual(chrome.errors, [], 'browser errors/warnings or unhandled rejection');
      assert.deepEqual(chrome.network, [], 'component suite must not use network');
    });
    await chrome.send('Target.closeTarget', { targetId });
  } finally {
    if (chrome) await chrome.close();
    // Only this mkdtemp directory is removable; never derive a deletion target from source paths.
    assert.ok(path.dirname(path.resolve(directory)) === path.resolve(os.tmpdir()) && path.basename(directory).startsWith('sc-basket-lifecycle-'));
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
