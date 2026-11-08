// Real React DOM + real Chrome pointer/keyboard input. Only the media list is synthetic;
// each image embeds an existing local product PNG. No application fixture is modified.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Module from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url)), require = Module.createRequire(import.meta.url);
const webpackPackage = require('next/dist/compiled/webpack/webpack'); webpackPackage.init();
const { webpack } = webpackPackage;
// Reuse the existing tested CDP transport without changing its protected source or running its suite here.
const lifecycle = fs.readFileSync(path.join(root, 'scripts/basket-lifecycle.test.mjs'), 'utf8');
const browser = Function('spawn', 'path', lifecycle.slice(lifecycle.indexOf('function browser('), lifecycle.indexOf("test('BasketFeature real")) + '\nreturn browser;')(spawn, path);

test('Gallery real React pointer/keyboard/lifecycle verification', { timeout: 120000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-product-gallery-'));
  let chrome;
  try {
    const write = (name, content) => { const file = path.join(directory, name); fs.writeFileSync(file, content); return file; };
    const loader = write('typescript.cjs', `module.exports=function(source){return require(${JSON.stringify(require.resolve('typescript'))}).transpileModule(source,{compilerOptions:{target:7,module:99,jsx:4,esModuleInterop:true}}).outputText}`);
    const cssLoader = write('css.cjs', 'module.exports=function(){return "module.exports={__esModule:true,default:new Proxy({},{get:(_target,key)=>String(key)})};"}');
    const styles = fs.readFileSync(path.join(root, 'features/product-page/ProductGallery.module.css'), 'utf8');
    const images = ['darjeeling-orange-valley.png', 'pressed-puer.png', 'teapot-pharaoh.png'].map((name, index) => ({
      src: 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'public/images/products', name)).toString('base64'), alt: `Test photo ${index + 1}`, width: 500, height: 500,
    }));
    const entry = write('entry.tsx', `
      import React,{act} from 'react';import{createRoot}from'react-dom/client';
      import{ProductGallery}from ${JSON.stringify(path.join(root, 'features/product-page/ProductGallery.tsx').replaceAll('\\', '/'))};
      globalThis.IS_REACT_ACT_ENVIRONMENT=true;
      const style=document.createElement('style');style.textContent=${JSON.stringify(styles)}+'body{margin:0;min-height:2500px}';document.head.append(style);
      const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
      const add=window.addEventListener.bind(window),remove=window.removeEventListener.bind(window),resize=new Set();
      window.addEventListener=(type,callback,...args)=>{if(type==='resize')resize.add(callback);return add(type,callback,...args)};
      window.removeEventListener=(type,callback,...args)=>{if(type==='resize')resize.delete(callback);return remove(type,callback,...args)};
      const images=${JSON.stringify(images)};
      window.mountGallery=async(identity='A',count=3,reverse=false)=>{await act(async()=>root.render(<ProductGallery identity={identity} title='Test product' images={(reverse?[...images].reverse():images).slice(0,count)}/>));};
      window.unmountGallery=async()=>{await act(async()=>root.unmount());return{resizeListeners:resize.size,regions:host.querySelectorAll('[role=region]').length}};
      window.galleryState=()=>{const node=host.querySelector('[role=region]'),r=node?.getBoundingClientRect();return{status:host.querySelector('[aria-live]')?.textContent,dragging:node?.dataset.dragging==='true',x:r?.left+(r?.width||0)/2,y:r?.top+80,touchAction:node?getComputedStyle(node).touchAction:null,active:host.querySelector('[data-active] img')?.alt,buttons:host.querySelectorAll('button').length,resizeListeners:resize.size}};
    `);
    const compiler = webpack({ mode: 'development', target: 'web', devtool: false, cache: false, context: root, entry,
      output: { path: directory, filename: 'gallery.js' },
      resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(root, 'node_modules')],
        alias: { 'react$': require.resolve('react'), 'react/jsx-runtime$': require.resolve('react/jsx-runtime'), 'react-dom/client$': require.resolve('react-dom/client') } },
      module: { rules: [{ test: /\.tsx?$/, use: loader }, { test: /\.css$/, use: cssLoader }] } });
    try { await new Promise((resolve, reject) => compiler.run((error, stats) => error ? reject(error) : stats.hasErrors() ? reject(Error(stats.toString())) : resolve())); }
    finally { await new Promise(resolve => compiler.close(resolve)); }
    const executable = process.env.LIFECYCLE_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    assert.ok(fs.existsSync(executable), 'Real Chrome is required'); chrome = browser(executable, directory);
    const { targetId } = await chrome.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await chrome.send('Target.attachToTarget', { targetId, flatten: true });
    const send = (method, params) => chrome.send(method, params, sessionId);
    await send('Runtime.enable');
    const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value; };
    await evaluate(fs.readFileSync(path.join(directory, 'gallery.js'), 'utf8'));
    const state = () => evaluate('window.galleryState()');
    const mouse = async (dx, dy = 0, finish = true) => {
      const { x, y } = await state();
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + dx, y: y + dy, button: 'left', buttons: 1 });
      if (finish) await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + dx, y: y + dy, button: 'left', clickCount: 1 });
    };
    await t.test('single/missing image omit navigation', async () => {
      await evaluate("mountGallery('single',1)"); assert.equal((await state()).buttons, 0);
      await evaluate("mountGallery('missing',0)"); assert.equal((await state()).buttons, 0);
      assert.match(await evaluate('document.body.innerText'), /Изображение недоступно/);
    });
    await evaluate("mountGallery('A')");
    await t.test('next/previous and keyboard reflect active image and boundaries', async () => {
      await evaluate("document.querySelector('[aria-label=\"Следующее изображение\"]').click()");
      assert.equal((await state()).active, 'Test photo 2');
      await evaluate("document.querySelector('[role=region]').focus()");
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' });
      assert.equal((await state()).active, 'Test photo 3');
      assert.equal(await evaluate("document.activeElement===document.querySelector('[role=region]')"), true);
      await evaluate("document.querySelector('[aria-label=\"Предыдущее изображение\"]').click()");
      assert.equal((await state()).active, 'Test photo 2');
    });
    await t.test('real mouse drag advances; subthreshold and vertical intent do not', async () => {
      await evaluate("mountGallery('mouse')"); await mouse(-110); assert.equal((await state()).active, 'Test photo 2');
      await mouse(-12); assert.equal((await state()).active, 'Test photo 2');
      await mouse(-20, 100); assert.equal((await state()).active, 'Test photo 2');
    });
    await t.test('pointer cancel and resize discard drag without slide change', async () => {
      await evaluate("mountGallery('cancel')"); await mouse(-100, 0, false);
      await evaluate("document.querySelector('[role=region]').dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1}))");
      assert.equal((await state()).dragging, false); assert.equal((await state()).active, 'Test photo 1');
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 100, y: 100, button: 'left' });
      await mouse(-100, 0, false);
      await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 900, deviceScaleFactor: 1, mobile: false });
      await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      assert.equal((await state()).dragging, false);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 100, y: 100, button: 'left' });
    });
    await t.test('real touch swipe advances and vertical touch preserves page scrolling', async () => {
      await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 800, deviceScaleFactor: 1, mobile: true });
      await send('Emulation.setTouchEmulationEnabled', { enabled: true });
      await evaluate("mountGallery('touch')");
      assert.equal((await state()).touchAction, 'pan-y pinch-zoom');
      let { x, y } = await state();
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 110, y }] });
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert.equal((await state()).active, 'Test photo 2');
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 110, y }] });
      await send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      assert.equal((await state()).active, 'Test photo 2'); assert.equal((await state()).dragging, false);
      ({ x, y } = await state());
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y + 100 }] });
      await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 50 }] });
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert.equal((await state()).active, 'Test photo 2');
      assert.ok(await evaluate('scrollY>0'), 'vertical page scroll must remain available');
      await evaluate('scrollTo(0,0)');
    });
    await t.test('Product and media switch reset state; unmount removes resize listener during gesture', async () => {
      await evaluate("mountGallery('B')"); assert.equal((await state()).active, 'Test photo 1');
      await evaluate("mountGallery('B',3,true)"); assert.equal((await state()).active, 'Test photo 3');
      await mouse(-100, 0, false);
      assert.deepEqual(await evaluate('unmountGallery()'), { resizeListeners: 0, regions: 0 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 100, y: 100, button: 'left' });
    });
    // React act warnings are test-driver bookkeeping, not application runtime failures.
    const errors = chrome.errors.filter(error => !JSON.stringify(error).includes('not wrapped in act'));
    assert.deepEqual(errors, []);
  } finally {
    if (chrome) await chrome.close();
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
