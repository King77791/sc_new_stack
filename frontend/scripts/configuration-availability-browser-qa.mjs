import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base=process.env.CART_QA_URL??'http://localhost:3012', debug=process.env.CART_QA_CHROME??'http://127.0.0.1:9334';
const target=await fetch(`${debug}/json/new?about:blank`,{method:'PUT'}).then(r=>r.json());
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.onopen=r);
let serial=0;const pending=new Map(),problems=[];
socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);if(m.error)p.reject(Error(JSON.stringify(m.error)));else p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')problems.push(m.params);if(m.method==='Runtime.consoleAPICalled'&&['error','assert'].includes(m.params.type))problems.push(m.params);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>reject(Error(method)),20000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const wait=async expression=>{for(let i=0;i<200;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,40));}throw Error(`Timeout ${expression}`);};
const q=JSON.stringify,root=`document.querySelector('[data-card="a"]')`;
const frames=()=>evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
async function width(value){await send('Emulation.setDeviceMetricsOverride',{width:value,height:1000,deviceScaleFactor:1,mobile:false});await frames();}
async function reset(viewport=375){await width(viewport);await send('Page.navigate',{url:`${base}/dev/configuration-availability`});await send('Page.bringToFront');await wait(`(()=>{const n=${root}?.querySelector('button[aria-haspopup="listbox"]');return n&&Object.keys(n).some(k=>k.startsWith('__reactProps$'))})()`);await evaluate(`window.availabilityNotifications=[];new MutationObserver(()=>{const n=document.querySelector('[data-notification-id]');if(n&&!window.availabilityNotifications.includes(n.dataset.notificationId))window.availabilityNotifications.push(n.dataset.notificationId)}).observe(document.querySelector('[data-notification-host]'),{childList:true,subtree:true,attributes:true})`);}
async function click(selector){await evaluate(`(()=>{const n=document.querySelector(${q(selector)});if(!n||n.disabled)throw Error('Disabled/missing '+${q(selector)});n.focus();n.click();})()`);await frames();}
const external=(action,weight,amount)=>click(`[data-external="${action}-tea-${weight}-${amount}"]`);
const toggle=weight=>click(`[data-toggle-availability="tea-${weight}"]`);
const items=()=>evaluate('JSON.parse(document.querySelector("[data-testid=items]").textContent)');
const quantity=async weight=>(await items()).find(i=>i.configuration.id===`tea-${weight}`)?.quantity??0;
const cardButton=name=>`[data-card="a"] button[aria-label="${name}"]`;
const minus=()=>click(cardButton('Уменьшить количество'));
async function open(){await evaluate(`(()=>{const n=[...${root}.querySelectorAll('button[aria-haspopup="dialog"]')].find(n=>n.getClientRects().length);if(!n||n.disabled)throw Error('No management');n.focus();n.click();})()`);await wait('!!document.querySelector("dialog[open]")');}
async function choose(weight){await evaluate(`(()=>{const n=[...document.querySelectorAll('dialog [aria-label="Выберите вес"] button')].find(n=>n.textContent===${q(`${weight} г.`)});n.click();})()`);await frames();}
const draft=()=>evaluate('Number(document.querySelector("dialog output").textContent)');
async function draftTo(n){let current=await draft();while(current!==n){await click(`dialog button[aria-label="${current<n?'Увеличить количество':'Уменьшить количество'}"]`);current=await draft();}}
const confirmDisabled=()=>evaluate('document.querySelector("dialog button[aria-busy]").disabled');
async function confirm(){await click('dialog button[aria-busy]');await wait('!document.querySelector("dialog")');}
async function dismiss(){await click('dialog button[aria-label="Закрыть панель"]');await wait('!document.querySelector("dialog")');}
async function selectFull(weight){await click('[data-card="a"] button[aria-haspopup="listbox"]');await evaluate(`([...${root}.querySelectorAll('[role="option"]')].find(n=>n.textContent===${q(`${weight} г.`)})).click()`);await frames();}
async function captureHandler(selector,name){await evaluate(`(()=>{const n=document.querySelector(${q(selector)});window[${q(name)}]=n[Object.keys(n).find(k=>k.startsWith('__reactProps$'))].onClick;})()`);}
async function screenshot(name){await evaluate('document.fonts.ready');await evaluate(`${root}.scrollIntoView({block:'center'})`);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);const shot=await send('Page.captureScreenshot',{format:'png'});const file=path.join(os.tmpdir(),`sc-availability-${name}.png`);fs.writeFileSync(file,Buffer.from(shot.data,'base64'));console.log(`SCREENSHOT ${file}`);}
try{
  await send('Runtime.enable');await send('Page.enable');
  for(const viewport of [375,414]){
    await reset(viewport);await open();await choose(200);assert.equal(await draft(),0);assert.equal(await confirmDisabled(),true);
    assert.equal(await evaluate('document.querySelector(\'dialog button[aria-label="Увеличить количество"]\').disabled'),true);
    assert.ok(await evaluate('document.querySelector("dialog h2").textContent.includes("Нет в наличии")'));
    await choose(50);await draftTo(1);await confirm();assert.equal(await quantity(50),1);await wait('window.availabilityNotifications.length===1');
    await external('set',50,3);await captureHandler(cardButton('Увеличить количество'),'stalePlus');await toggle(50);
    assert.equal(await evaluate(`${root}.querySelector('[role="group"] [role="status"]').textContent`),'3');
    assert.equal(await evaluate(`document.querySelector(${q(cardButton('Увеличить количество'))}).disabled`),true);
    await evaluate('window.stalePlus()');await frames();assert.equal(await quantity(50),3);
    await minus();assert.equal(await quantity(50),2);
    await open();assert.equal(await draft(),2);await draftTo(1);await confirm();assert.equal(await quantity(50),1);
    await open();await draftTo(0);await confirm();assert.equal(await quantity(50),0);
    assert.equal(await evaluate('window.availabilityNotifications.length'),1);
    assert.ok(await evaluate(`!!${root}.querySelector('button[aria-haspopup="dialog"]')`));
    // Highest remaining includes unavailable200 even though available100 exists and was inserted later.
    await reset(viewport);await external('add',200,2);await external('add',100,2);await external('add',50,2);await external('set',50,1);
    await minus();assert.equal(await evaluate(`${root}.querySelector('button[aria-haspopup="listbox"]').textContent`),'200 г.');
    assert.equal(await quantity(200),2);assert.equal(await evaluate(`document.querySelector(${q(cardButton('Увеличить количество'))}).disabled`),true);
    await screenshot(`compact-${viewport}`);
    await open();await choose(100);await draftTo(0);await choose(200);assert.equal(await draft(),2);await dismiss();
    await reset(viewport);for(const weight of [200,100,50])await external('add',weight,2);
    await open();await draftTo(0);await confirm();assert.equal(await evaluate(`${root}.querySelector('button[aria-haspopup="listbox"]').textContent`),'200 г.');
    await width(1280);
    assert.equal(await evaluate('document.querySelectorAll("aside li").length'),2);
    assert.equal(await evaluate('[...document.querySelectorAll("aside li")].filter(n=>n.textContent.includes("Нет в наличии")).length'),1);
    assert.equal(await evaluate('[...document.querySelectorAll("aside li")].every(n=>!n.querySelector("button").disabled)'),true);
    await open();assert.equal(await draft(),2);await draftTo(1);await confirm();assert.equal(await quantity(200),1);
    await screenshot(`full-${viewport}`);
    await open();await width(viewport);await dismiss();await wait(`document.activeElement===${root}.querySelector('button[aria-label^="Выбрать фасовку"]')`);
    // Full unavailable management reuses the Sheet; last unavailable removal has an enabled selector fallback.
    await reset(1280);await external('add',200,2);await selectFull(200);await open();await draftTo(0);await confirm();
    await wait(`document.activeElement===${root}.querySelector('button[aria-haspopup="listbox"]')`);assert.equal((await items()).length,0);
    await selectFull(200);assert.equal(await evaluate(`${root}.querySelector('button[aria-label^="В корзину"]').disabled`),true);
    await width(viewport);await open();await choose(200);assert.equal(await draft(),0);assert.equal(await confirmDisabled(),true);await dismiss();
    console.log(`PASS availability compact/full/Sheet/Widget @${viewport}: I–Z, unavailable highest, reductions/removal, keyboard-inspectable identity, valid focus`);
  }
  // Current props and actual Q are independently re-read. Saved handlers exercise logic guards, not just disabled buttons.
  await reset(1280);assert.equal(await evaluate(`${root}.querySelector('button[aria-haspopup="listbox"]').textContent`),'50 г.');await captureHandler('[data-card="a"] button[aria-label^="В корзину"]','staleAdd');await toggle(50);await evaluate('window.staleAdd()');await frames();assert.equal((await items()).length,0);assert.equal(await evaluate('window.availabilityNotifications.length'),0);assert.equal(await evaluate(`${root}.querySelector('button[aria-haspopup="listbox"]').textContent`),'50 г.');
  await reset();await external('add',50,2);await open();await draftTo(3);await captureHandler('dialog button[aria-busy]','staleConfirm');await toggle(50);
  assert.equal(await draft(),3);assert.equal(await confirmDisabled(),true);await evaluate('window.staleConfirm()');await frames();assert.equal(await quantity(50),2);assert.ok(await evaluate('!!document.querySelector("dialog")'));await screenshot('dynamic');await dismiss();
  for(const scenario of ['lower-actual','higher-actual','removed-positive','external-add-zero','already-absent','unchanged']){
    await reset();if(scenario!=='external-add-zero')await external('add',50,2);
    await open();if(scenario==='removed-positive')await draftTo(1);if(scenario==='already-absent')await draftTo(0);
    if(scenario==='lower-actual')await external('set',50,1);
    if(scenario==='higher-actual')await external('set',50,3);
    if(scenario==='removed-positive'||scenario==='already-absent')await external('remove',50,0);
    if(scenario==='external-add-zero')await external('add',50,2);
    await toggle(50);
    if(['lower-actual','removed-positive','external-add-zero'].includes(scenario)){
      const before=await items();assert.equal(await confirmDisabled(),true);await evaluate('document.querySelector("dialog button[aria-busy]").click()');assert.deepEqual(await items(),before);await dismiss();
    }else{await confirm();assert.equal(await quantity(50),scenario==='already-absent'?0:2);}
    assert.equal(await evaluate('window.availabilityNotifications.length'),0);console.log(`PASS dynamic actual-target ${scenario}`);
  }
  // Widget props update independently of Cart, and its unavailable row remains removable.
  await reset(1280);await external('add',50,2);await external('add',100,2);await toggle(50);
  await click('aside button[aria-controls]');
  await screenshot('widget-mixed');
  assert.equal(await evaluate('[...document.querySelectorAll("aside li")].filter(n=>n.textContent.includes("Нет в наличии")).length'),1);
  await toggle(50);assert.equal(await evaluate('[...document.querySelectorAll("aside li")].some(n=>n.textContent.includes("Нет в наличии"))'),false);
  await toggle(50);await click('aside li button');assert.equal(await quantity(50),0);assert.equal(await quantity(100),2);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await width(375);await open();await choose(200);assert.equal(await confirmDisabled(),true);await dismiss();
  assert.deepEqual(problems,[]);console.log('PASS availability A–E races, stale handlers, live props snapshot, Widget AC–AH, reduced motion, exceptions/errors=0');
}finally{socket.close();await fetch(`${debug}/json/close/${target.id}`);}
