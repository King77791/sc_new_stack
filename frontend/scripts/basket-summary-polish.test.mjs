import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const filename = fileURLToPath(new URL('../features/basket/ui/BasketPromoCode.tsx', import.meta.url));
const compiled = new Module(filename);
compiled.require = name => name.endsWith('.css')
  ? { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) }
  : Module.createRequire(filename)(name);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText, filename);
const html = () => renderToStaticMarkup(React.createElement(compiled.exports.BasketPromoCode));

test('P1 decorative disclosure arrow is inside the native trigger without changing its accessible text', () => {
  assert.match(html(), /<button type="button" class="promoTrigger" aria-expanded="false" aria-controls="[^"]+">Есть промокод\?<span class="promoChevron" aria-hidden="true"><\/span><\/button>/);
});
test('P2 input and disabled icon action share one visual container with an explicit accessible name', () => {
  const markup = html();
  assert.match(markup, /<div class="promoField"><input[^>]+\/><button type="button" class="promoApply" aria-label="Применить промокод" disabled=""><span class="promoApplyIcon" aria-hidden="true"><\/span><\/button><\/div>/);
  assert.match(markup, /<label for="[^"]+-input">Промокод<\/label>/);
  assert.doesNotMatch(markup, /<form\b|type="submit"/);
});
