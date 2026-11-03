import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';
import ts from 'typescript';

const filename = fileURLToPath(new URL('../features/product/ProductCard/purchase-sheet-draft.ts', import.meta.url));
const compiled = new Module(filename);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, filename);
const { loadPurchaseSheetDraft: load, editPurchaseSheetDraft: edit, sheetConfirmAction: action } = compiled.exports;

test('A–F: missing loads zero without intent; minus is a no-op; plus creates positive draft', () => {
  const zero = load(0);
  assert.deepEqual(zero, { quantity: 0, existingAtLoad: false, removalIntent: false });
  assert.equal(edit(zero, -1), zero);
  assert.equal(edit(zero, 1).quantity, 1);
  assert.equal(load(3).quantity, 3);
});
test('G/H: decrementing an existing target to zero creates explicit intent only at zero', () => {
  let draft = load(3);
  for (const expected of [2,1,0]) {
    draft = edit(draft, -1);
    assert.equal(draft.quantity, expected);
    assert.equal(draft.removalIntent, expected === 0);
  }
  assert.equal(action(0, draft.removalIntent, true), 'remove');
});
test('I/J: a fresh target snapshot or reopen drops dirty quantity and removal intent', () => {
  let draft = edit(edit(load(1),1),1);
  assert.equal(draft.quantity,3);
  draft = load(0); assert.equal(draft.removalIntent,false);
  draft = load(1); assert.equal(draft.quantity,1);
  draft = edit(draft,-1); assert.equal(draft.removalIntent,true);
  assert.deepEqual(load(2),{quantity:2,existingAtLoad:true,removalIntent:false});
  assert.equal(load(1).removalIntent,false);
});
test('R/H: 1→0→1 clears removal intent; final positive target uses ADD/SET', () => {
  const draft = edit(edit(load(1),-1),1);
  assert.equal(draft.removalIntent,false);
  assert.equal(action(draft.quantity,draft.removalIntent,true),'set');
  assert.equal(action(draft.quantity,draft.removalIntent,false),'add');
});
test('missing→positive→zero cannot acquire intent to delete an external CartItem', () => {
  const draft = edit(edit(load(0),1),-1);
  assert.equal(draft.removalIntent,false);
  assert.equal(action(draft.quantity,draft.removalIntent,true),'none');
});
for (const [name, quantity, intent, exists, expected] of [
  ['A/K untouched missing0',0,false,false,'none'],
  ['B/L missing positive',1,false,false,'add'],
  ['B/M missing3',3,false,false,'add'],
  ['C/N existing3',3,false,true,'set'],
  ['C/O existing1',1,false,true,'set'],
  ['D/P/Q explicit zero',0,true,true,'remove'],
  ['E/T achieved absence',0,true,false,'absent'],
  ['F/S external ADD at untouched zero',0,false,true,'none'],
  ['G/W external quantity change with intent',0,true,true,'remove'],
  ['U disappeared positive target',3,false,false,'add'],
  ['V externally added positive target',2,false,true,'set'],
]) test(`Confirm ${name}: ${expected}`, () => assert.equal(action(quantity,intent,exists),expected));
