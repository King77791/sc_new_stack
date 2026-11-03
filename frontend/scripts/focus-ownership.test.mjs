import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const filename = fileURLToPath(new URL('../lib/focus-ownership.ts', import.meta.url));
const compiled = new Module(filename);
compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
const { captureFocusOwnership } = compiled.exports;

function fixture(t) {
  class FakeNode { contains(node) { return node === this; } }
  const doc = new EventTarget();
  doc.body = new FakeNode(); doc.documentElement = new FakeNode();
  const origin = new FakeNode(), other = new FakeNode(); doc.activeElement = origin;
  const previous = { document:globalThis.document, Node:globalThis.Node };
  globalThis.document=doc; globalThis.Node=FakeNode;
  t.after(()=>{globalThis.document=previous.document;globalThis.Node=previous.Node;});
  const emit=(type,target)=>{const event=new Event(type);Object.defineProperty(event,'target',{value:target});doc.dispatchEvent(event);};
  const focus=target=>{doc.activeElement=target;emit('focusin',target);};
  return {doc,origin,other,emit,focus,capture:()=>captureFocusOwnership(origin)};
}
test('retained origin may restore; a lease is consumed exactly once',t=>{
  const f=fixture(t), lease=f.capture();assert.equal(lease.release(),true);assert.equal(lease.release(),false);
});
test('disabled/removed origin losing focus to BODY retains ownership',t=>{
  const f=fixture(t),lease=f.capture();f.doc.activeElement=f.doc.body;assert.equal(lease.release(),true);
});
test('new external focus supersedes completion',t=>{
  const f=fixture(t),lease=f.capture();f.focus(f.other);assert.equal(lease.release(),false);
});
test('new focus followed by BODY does not revive old ownership',t=>{
  const f=fixture(t),lease=f.capture();f.focus(f.other);f.doc.activeElement=f.doc.body;assert.equal(lease.release(),false);
});
test('returning to origin does not revive an old lease',t=>{
  const f=fixture(t),lease=f.capture();f.focus(f.other);f.focus(f.origin);assert.equal(lease.release(),false);
});
test('pointer intent on nonfocusable background supersedes BODY restoration',t=>{
  const f=fixture(t),lease=f.capture();f.emit('pointerdown',f.doc.body);f.doc.activeElement=f.doc.body;assert.equal(lease.release(),false);
});
test('pointer within origin does not invalidate the interaction',t=>{
  const f=fixture(t),lease=f.capture();f.emit('pointerdown',f.origin);assert.equal(lease.release(),true);
});
test('another Widget control also constitutes newer focus intent',t=>{
  const f=fixture(t),lease=f.capture();f.focus(f.other);assert.equal(lease.release(),false);
});
test('an unfocused origin cannot acquire ownership just because activeElement becomes BODY',t=>{
  const f=fixture(t);f.doc.activeElement=f.other;const lease=f.capture();f.doc.activeElement=f.doc.body;assert.equal(lease.release(),false);
});
test('unmount/dispose invalidates the lease',t=>{
  const f=fixture(t),lease=f.capture();lease.dispose();f.doc.activeElement=f.doc.body;assert.equal(lease.release(),false);
});
