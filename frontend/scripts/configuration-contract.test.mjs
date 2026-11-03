import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const file=fileURLToPath(new URL('../features/product/ProductCard/configuration-contract.ts',import.meta.url));
const compiled=new Module(file);compiled._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
const {normalizeConfigurations:normalize,canRequestQuantity:canRequest,configurationAvailability:snapshot}=compiled.exports;
const options=()=>[50,100,200,250].map((weightGrams,i)=>({id:['arbitrary-z','not-a-weight','first-added','arbitrary-a'][i],weightGrams,label:`${weightGrams} г.`,price:{current:'fixture'}}));
test('four canonical slots accepted; opaque IDs do not encode weight or label',()=>assert.deepEqual(normalize(options()),options()));
test('wrong input order normalizes without mutating input',()=>{const input=options().reverse();assert.deepEqual(normalize(input).map(o=>o.weightGrams),[50,100,200,250]);assert.equal(input[0].weightGrams,250);});
for(const [name,change]of [
  ['duplicate IDs',o=>{o[1].id=o[0].id;}],['duplicate weights',o=>{o[1].weightGrams=50;}],
  ['missing slot',o=>{o.pop();}],['extra slot',o=>{o.push({...o[0],id:'extra'});}],
  ['label mismatch',o=>{o[0].label='250 г.';}],['empty identity',o=>{o[0].id=' ';}],
  ['unknown weight',o=>{o[0].weightGrams=75;o[0].label='75 г.';}],
])test(`reject ${name} rather than inventing identity`,()=>{const input=options();change(input);assert.throws(()=>normalize(input));});
test('label changes are rejected at input boundary, never used to select another identity',()=>{const input=options();const id=input[0].id;input[0].label='renamed';assert.throws(()=>normalize(input));assert.equal(input[0].id,id);});
test('all permutations normalize to the same canonical order',()=>{const permute=a=>a.length?a.flatMap((x,i)=>permute(a.filter((_,j)=>i!==j)).map(rest=>[x,...rest])):[[]];for(const input of permute(options()))assert.deepEqual(normalize(input).map(o=>o.id),options().map(o=>o.id));});
for(const [q,n,allowed]of [[0,0,true],[0,1,false],[2,3,false],[2,2,true],[2,1,true],[2,0,true]])
  test(`unavailable Q${q} → N${n}: ${allowed}`,()=>assert.equal(canRequest({...options()[0],disabled:true},q,n),allowed));
test('available ADD and increase remain allowed',()=>{assert.equal(canRequest(options()[0],0,1),true);assert.equal(canRequest(options()[0],2,3),true);});
test('consumer snapshot reflects current product input independently of Cart',()=>{const product={kind:'tea',slug:'p',purchasePresentation:'regular',weight:{presentation:'selectable',configurations:options()}};const first=snapshot([product]);product.weight.configurations[2].disabled=true;const second=snapshot([product]);assert.equal(first[2].available,true);assert.equal(second[2].available,false);assert.equal(second[0].available,true);assert.equal(second[2].configurationId,first[2].configurationId);});
