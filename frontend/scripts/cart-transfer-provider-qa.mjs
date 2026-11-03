import assert from 'node:assert/strict';

const base = process.env.CART_QA_URL ?? 'http://localhost:3012';
const debug = process.env.CART_QA_CHROME ?? 'http://127.0.0.1:9334';
const target = await fetch(`${debug}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => { socket.onopen = resolve; });
let serial = 0;
const pending = new Map(), problems = [];
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const request = pending.get(message.id); pending.delete(message.id); clearTimeout(request.timer);
    if (message.error) request.reject(Error(JSON.stringify(message.error))); else request.resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown' || (message.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(message.params.type))) problems.push(message);
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++serial, timer = setTimeout(() => reject(Error(method)), 30000);
  pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: `${base}/dev/cart-transfer` });
  for (let i = 0; i < 250; i++) { if (await evaluate('typeof window.runCartTransferTests === "function"')) break; await new Promise(r => setTimeout(r,80)); }
  const results = await evaluate('window.runCartTransferTests()');
  assert.equal(results.length, 14);
  for (const result of results) console.log(`PASS Provider ${result}`);
  assert.deepEqual(problems, []);
  assert.equal(await evaluate('document.querySelectorAll("[data-notification-id]").length'), 0);
  console.log('PASS Provider public consumer: no exceptions/errors or false ADD notification');
} finally { socket.close(); await fetch(`${debug}/json/close/${target.id}`); }
