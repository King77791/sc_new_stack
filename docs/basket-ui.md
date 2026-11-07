# Gate 9B-2 — Basket UI Implementation Report

> Historical Gate 9B-2 report below. The current Basket-local group ordering,
> Summary/promo/share UI and route visibility supersede the original limitations;
> see **Gate 9B-2R — Remediation Implementation Report** at the end of this document.

Дата: 2026-11-06. CONTROLLED IMPLEMENTATION. Основание: Gate 9B-1 CLOSED / ACCEPTED, ADR-G9B1-B1 и CR-G9B2-01.

## 1. Verdict

**PASS для implementation scope Gate 9B-2.** `/basket` подключён к существующему application Cart и реально вызывает `projectProductInputBasket`. Новые deterministic tests 50/50; existing 299/299; ESLint, TypeScript, production build PASS. Минимальный browser smoke выполнен; полный Browser QA & Closure относится к отдельному Gate 9B-3 и не начат.

## 2. Git Baseline

HEAD: `c2476e81fe5ef0fd3a35ac766bb8cd1dcfbe0f5a` — `feat(product-input): complete Gate 9B-1 shared pricing integration`. До работы дерево было чистым. Baseline 299/299 deterministic tests PASS, 0 skipped. `/basket` отсутствовал. Commit, staging, reset, checkout и изменение baseline не выполнялись.

Preflight изучил применимые AGENTS, документацию Cart/Gate 8B/Gate 9B-1, Cart public API/Provider/F1, pricing projection, shared application inputs, existing purchase/pending/focus patterns, RootLayout и App Router. Новых dependencies нет.

## 3. Files Created

| File | Назначение |
| --- | --- |
| `frontend/app/basket/page.tsx` | Server route, noindex metadata, composition BasketFeature |
| `frontend/features/basket/ui/BasketFeature.tsx` | Actual application Cart consumer, pricing invocation, editor/focus lifecycle |
| `frontend/features/basket/ui/BasketView.tsx` | Grouped UI и BasketTransferEditor |
| `frontend/features/basket/ui/Basket.module.css` | Local responsive styling и focus states |
| `frontend/features/basket/ui/assets/quantity-minus.svg` | Exact desktop Figma minus asset, 20.9835 × 2.52015 |
| `frontend/features/basket/ui/assets/quantity-plus.svg` | Exact desktop Figma plus asset, 17.4326 × 17.4325 |
| `frontend/features/basket/adapters/basket-ui.adapter.ts` | Pure formatted view model, issue copy и focus candidate selection |
| `frontend/features/basket/model/basket-interactions.ts` | Transient locks/errors, commands через public Cart |
| `frontend/scripts/basket-ui-contract.test.mjs` | 40 requested cases + 10 integration/edge cases |
| `docs/basket-ui.md` | Настоящий report, limitations и QA handoff |

## 4. Files Modified

Только `frontend/scripts/product-input-integration.test.mjs`, S37, по **CR-G9B2-01**:

```diff
-test('S37 Checkout is never enabled and no Basket UI route is created', () => {
+test('S37 Checkout is never enabled', () => {
   assert.equal(checkout(basket([item()], views)).checkoutActionAvailable, false);
-  assert.equal(fs.existsSync(path.join(frontend, 'app/basket')), false);
 });
```

Остальное содержимое файла сравнивается новым deterministic test с `c2476e8`: разрешены ровно две эти правки. R30 compatibility проверена ДО изменения: его pinned baseline `7689095` не содержит suite Gate 9B-1. После правки S37 1/1 PASS, protection suite 32/32 PASS, R30 отдельно 1/1 PASS. R29/R30, protection guard и baseline не изменялись. Application composition вне нового route не потребовала изменений.

## 5. Figma Mapping

Использован Figma MCP skill `figma-design-to-code` (`skill://figma/figma-design-to-code/SKILL.md`). Read-only session `38a6ff87-0c6b-45bb-9fa8-385134e6fc14`. Получены high-fidelity design contexts и screenshots двух указанных nodes; повторных обходов всего файла и Figma edits не было.

- Desktop: [145:39727](https://www.figma.com/design/VZ3bfelRsFChkn6WVuy2yg/?node-id=145-39727), 1920 × 1601.
- Mobile: [145:36405](https://www.figma.com/design/VZ3bfelRsFChkn6WVuy2yg/?node-id=145-36405), 375 × 2505.

| Figma reference | Implementation |
| --- | --- |
| Desktop list 145:39729, x195/w1065 | Centered max-width1530 container, list flex remainder1065 at available width1920 |
| Desktop summary 145:39751, x1280/w445 | Grid right column445, gap20, padding40, non-sticky |
| Mobile list 145:36414, w343 | Fluid container `100% - 32px`; 16px gutters at375 |
| Product image 100/60 | Single dynamic image per Product group, CSS100 desktop/60 mobile |
| Quantity control 145:46436 | 48px buttons, original SVG glyph dimensions, dark background/border/radius15 |
| Desktop title 145:39786 / mobile 145:36412 | Cera Pro40/24, existing gold/green/white tokens |
| Mobile summary after rows | Semantic aside after group list; single-column layout below1100 |

Approved deviations applied: one header/image/badge per Product, multiple configuration rows, group totals/footer, merchandise summary, disabled Checkout, no promo/share/delivery. Original per-row duplicate Product headers and placeholder prices are not copied. The transfer editor is Basket-local inline UI, not a duplicated ProductPurchaseSheet/modal.

Assets: two required quantity glyphs downloaded with curl from MCP-provided URLs into `ui/assets`; existing exact trash glyph `/icons/cart/remove.svg` reused at20.48 ×25.6. Product media remains dynamic from shared inputs. Static assets are non-empty and locally referenced by CSS; no temporary Figma URLs in production code. Existing Header/Footer/Notification/Widget assets and geometry remain frozen, including pre-existing differences from Figma.

## 6. Route & Composition

`BasketPage` is a Server Component with metadata `{robots:{index:false,follow:false}}`; it mounts Client `BasketFeature`. The existing persistent `CartApplicationProvider` in RootLayout is reused; no provider is added.

Actual data flow in `BasketFeature`:

```ts
const cart = useCart();
const view = toBasketView(
  projectProductInputBasket(cart.items, applicationProductInputs.views),
);
```

This closes the deferred UI wiring from ADR-G9B1-B1. The view is recomputed from canonical Cart and shared immutable inputs, not stored as commercial state. Runtime composition test loads the actual route and Feature, observes the projector call and no mutations during render. Browser smoke adds through actual Home ProductCard and navigates through the existing Header basket link.

## 7. Product Grouping

`toBasketView` preserves Gate 8B groups by canonical `productKey`, first occurrence order, canonical CartItem references and quantities. It never groups by title/image/display slug. Current temporary identity can equal a presentation slug upstream, but Basket uses the canonical key supplied by Cart.

Configuration order follows the existing explicit Gate 8B contract: validated nominal weights ascending; invalid-definition fallback preserves canonical row order. No Cart array is sorted/mutated. G1–G8 verify several configurations, equal titles across different identities, group order, canonical weight order, fixed/missing/unavailable cases and a single rendered Product header.

## 8. Quantity Controls

`createBasketInteractions.quantity` reads `getItem(productKey, configuration)` at action time. Increase calls `setItemQuantity(actual.id, actual.quantity + 1)` only when current projection permits increase and Q is below MAX_SAFE_INTEGER. Decrease at Q>1 calls absolute SET Q−1; at Q1 calls REMOVE. SET0 and absent-row ADD are never used.

Only pending IDs and error strings are local state. Locks are acquired synchronously before awaiting public commands; same-row repeated clicks/REMOVE/transfer cannot issue conflicting commands. Independent rows remain usable. The displayed Q always comes from canonical Cart, not an optimistic/draft quantity. Unavailable/unknown existing rows permit decrease/REMOVE but block increase. Q1–Q8 and edge tests prove actual-Q reads, locks and safe integer boundaries.

## 9. F1 Configuration Editor

`BasketTransferEditor` is an inline fieldset with native radios, confirm/cancel and Escape. On open, Feature reads the canonical source via public `getItem` and stores that exact immutable reference as editing context. There is no draft Q. Targets derive from current Gate 8B Product definitions and existing shared F1 validator; current/unavailable targets are disabled. Fixed Products have no transfer action or artificial slots.

Confirm calls `transferConfiguration({expectedSource, target})` exactly once. The controller checks source reference and target eligibility, then locks both source and resulting target identity. It never substitutes ADD+REMOVE or clones source. F1 retains full-Q transfer, actual-target-Q merge and atomic failure semantics.

Changed source shows an explicit conflict message and disables confirm. The user must close/reopen or explicitly reopen through the row edit control; each open gets a new editor generation. Source removal closes the editor. Cancel/unmount does not roll back a command already accepted by canonical Cart; stale completions cannot reopen/close a newer editor or claim newer focus.

F1–F8 verify full Q, reference identity, latest target quantity, unavailable target, changed source, fixed exclusion, source/target locks and single public transfer command. Additional cases cover pending source SET, external source removal and unmount.

## 10. Pricing Presentation

`basketLineView`/`toBasketView` use `formatBasketMoney` on ready Gate 8B money. Line current/original, group totals and Basket total are taken from the projection. There is no multiplication, percentage discount calculation, summation or rounding of money in UI/model.

There is one Product badge per group, using already validated basis-point metadata only for its label. Discounted lines show crossed originalLine; group footer shows original subtotal/savings/current total. No-discount Products show neither savings nor old prices/badge.

Missing/invalid quotes show «Стоимость уточняется», stale quotes identify updating prices, overflow identifies the safe-limit issue. Incomplete groups/Basket have no false full total or zero fallback. Ready lines and complete groups can retain their own valid amounts. P1–P8 and edge tests verify explicit O/C, badge cardinality, parity, partial/stale/missing/invalid/overflow behavior.

## 11. Basket Summary

`BasketView` renders a single semantic aside. Quantity uses Gate 8B `totalQuantity`, not `itemCount`. If count overflows/unavailable, text is «Уточняется». Summary shows original/savings only when applicable and a ready total under **«Итого товаров»**. No delivery value is included.

Checkout is a disabled `type="button"` with **«Оформление заказа пока недоступно»**. No Checkout link, form action, network endpoint, order/payment flow or backend authority is added. U2/U3 and route tests verify this; preserved S37 still asserts checkoutActionAvailable=false.

## 12. Empty State

With no canonical items, render «В корзине пока пусто», a link to existing `/`, and no totals/editor/Checkout. No `/catalog` route is fabricated. Browser smoke verified empty load and last-item REMOVE returning to empty state. Reload/Provider remount may clear Cart under the existing in-memory lifecycle.

## 13. Responsive Layout

`Basket.module.css` owns responsiveness; there are no separate Desktop/Mobile Cart trees. Desktop is a centered max1530 grid with right445 summary, gap20. Below1100 summary follows the list; below600 controls reorganize within each row, images become60 and title24. Minimum supported mobile width is375; <375 is not a new supported product requirement.

Measured smoke geometry:

| Emulated width | Layout client width | Image | Quantity button | Summary width | Summary below list | Horizontal overflow |
| --- | --- | --- | --- | --- | --- | --- |
| 1920 | 1905 (15px scrollbar) | 100 | 48 | 445 | No | None |
| 1024 | 1009 (15px scrollbar) | 100 | 48 | 600 | Yes | None |
| 375 mobile | 375 | 60 | 48 | 343 | Yes | None |

At375 list/summary x=16. At desktop the container has width1530; centering is relative to actual clientWidth, so list x187.5/summary x1272.5 with a15px scrollbar. For a1920px client area the corresponding Figma coordinates are195/1280. No sticky positioning or overflow hiding is used to mask a wide layout. Titles/money/large Q wrap safely.

## 14. Accessibility

Native buttons, links, fieldset/legend/radios, semantic headings/list/aside, accessible Product/configuration-specific action labels and visible focus styles are implemented. Local row errors/pending status and editor messages use persistent polite atomic live regions. Pending controls use disabled/aria-busy; radio groups support native keyboard navigation. Checkout cannot activate.

Focus uses existing `captureFocusOwnership`, unchanged. After own REMOVE the candidate is next surviving row, then previous, then Basket h1; after transfer focus targets resulting row. Restoration runs after commit in an animation frame and releases its lease before moving focus, so newer focus/pointer intent wins. Editor opening focuses an enabled target; Escape/cancel restores its row edit control. Source conflict remains visible with a safe focus fallback. Inline editor has no trap, dialog semantics or scroll lock. Reduced-motion rules suppress motion; no motion is required for correctness.

U5–U7 cover semantic/live-region/focus candidate behavior; browser smoke verified actual Escape/cancel focus, transfer target focus and last REMOVE heading focus. These checks do not replace the full keyboard/focus matrix in Gate 9B-3.

## 15. Interaction Safety

`createBasketInteractions` owns only transient locks/errors. It reads canonical items via Cart public getters and does not retain an items collection, mutate Cart objects, store totals or create another Cart. API failure/rejection leaves canonical data untouched and clears locks; errors stay local, not Notification events. Existing cart.added integration remains solely in prior ADD flows.

Unmount increments an interaction generation, invalidates stale completions and disposes focus leases/frames. Source context remains a canonical reference; it is not an alternative quantity store. Double click, rapid mixed plus/minus, pending SET/REMOVE/transfer, independent rows, source conflict, actual target merge and source removal are tested. Client navigation preservation was verified in the real application.

Current safety relies on the existing in-memory public Cart publication contract. It does not establish new async backend compare-and-set, stock, retry/idempotency or F4 guarantees.

## 16. New Deterministic Tests

`frontend/scripts/basket-ui-contract.test.mjs`: **50/50 PASS**, 0 FAIL/SKIP.

- G1–G8: grouping/identity/order/fixed/missing/unavailable/single header.
- Q1–Q8: actual Q, SET/REMOVE, no SET0, pending/double-click/independence/availability.
- F1–F8: full-Q/source reference/actual target merge/availability/conflict/fixed/pending/single transfer.
- P1–P8: O/C, Product policy, single badge, line/group/Basket parity, partial/overflow.
- U1–U8: empty/disabled Checkout/sum-Q/summary DOM order/native controls/focus candidates/live region/fluid CSS contract.
- Ten additional cases: actual route/projector/canonical Cart composition; exact S37 diff; rejected/throwing commands; unmount; pending source race/reopen; source removal; safe integer limit; missing image/long title/unknown config; invalid policy/badge/stale/missing price; no-discount presentation.

Tests use real TS/TSX modules, React server rendering and actual Cart pure transitions behind a test-only public-interface harness. Production has no test harness/store. Static CSS assertions in U8 are only contract checks; actual geometry evidence comes from the separate browser smoke. Initial U2 regex incorrectly matched `data-action`; it was narrowed to actual form/action attributes. Lint-required names were added to new Link/Image test stubs. No existing assertion was weakened beyond the explicitly approved S37 change.

## 17. Existing Regression Tests

From `frontend`, executed first:

```powershell
node --test --test-concurrency=1 --test-reporter=spec scripts/basket-pricing.test.mjs scripts/cart-domain.test.mjs scripts/cart-transfer-product.test.mjs scripts/cart-widget-adapter.test.mjs scripts/configuration-contract.test.mjs scripts/focus-ownership.test.mjs scripts/notification.test.mjs scripts/product-pending-feedback.test.mjs scripts/purchase-sheet-draft.test.mjs
```

Exit0; **205 PASS, 0 FAIL, 0 SKIP**; reported5792.4551ms.

## 18. Gate 9B-1 Integration Tests

Next executed:

```powershell
node --test --test-concurrency=1 --test-reporter=spec scripts/product-input-integration.test.mjs
```

Exit0; **62 PASS, 0 FAIL, 0 SKIP**; reported3235.1579ms. S37 retains Checkout false check. All other existing cases/assertions unchanged.

## 19. Protection Tests

Next executed:

```powershell
node --test --test-concurrency=1 --test-reporter=spec scripts/product-input-protection.test.mjs
```

Exit0; **32 PASS, 0 FAIL, 0 SKIP**; reported322.381ms. New allowed Basket directories do not conflict with the existing guard. No protection baseline/guard/R29/R30 edits.

Then executed new suite:

```powershell
node --test --test-concurrency=1 --test-reporter=spec scripts/basket-ui-contract.test.mjs
```

Exit0; **50 PASS, 0 FAIL, 0 SKIP**. After naming new test stubs for lint, the suite was rerun with `node --test --test-reporter=spec scripts/basket-ui-contract.test.mjs`: exit0,50/50,600.9609ms. Total final coverage: **349/349 PASS**.

## 20. ESLint / TypeScript / Build

Commands run sequentially from `frontend` after tests:

| Command | Final exit | Result |
| --- | --- | --- |
| `npm.cmd run lint` | 0 | PASS,0 errors/warnings |
| `npx.cmd tsc --noEmit --incremental false` | 0 | PASS |
| `npm.cmd run build` | 0 | PASS, Next15.5.27; `/basket` included,7.04kB route/127kB first load |
| `git diff --check` | 0 | PASS |

An initial lint run flagged missing display names in new test-only stubs; fixed in the new file, rerun PASS. Early dev compilation flagged flex start/end compatibility warnings; changed to flex-start/flex-end in the new CSS. Final production build has no such warnings. Generated `.next` artifacts are not staged. No dependency/config/global-style changes.

## 21. Protected Files Diff

Against `c2476e81fe5ef0fd3a35ac766bb8cd1dcfbe0f5a`, the sole tracked diff is S37's approved test-name/assertion removal. New files are confined to the authorized route, Basket ui/model/adapters, new Basket test and this document.

Cart Domain/types/Public Interface/Provider/F1, Gate 8B core, Gate 9B-1 shared input core, ProductCard/Sheet/Widget renderers, Header/Footer/Notification, global focus helper, AGENTS/Knowledge, global styles, all other existing tests and protection baseline/guard have no diff. No RootLayout or CartApplicationProvider change was needed.

## 22. Known Limitations

- Source remains demonstration fixtures, not backend authority. No stock reservation, delivery/payment calculation, promo/share, Checkout or persistence.
- Existing CartItem prepared pricing does not automatically refresh when Product inputs change; Basket reads current projection. Current immutable application generation avoids live refresh ambiguity; future backend lifecycle needs a separate contract.
- Fixed transfer stays unsupported; unavailable/unknown items remain removable. Malformed preorder exclusions and empty invalid-badge behavior upstream are not changed.
- Pending/error/selection state is local UI-only. Already accepted mutations can complete after editor close/navigation; completion does not reclaim newer UI/focus ownership.
- Full async backend races, quantity-dependent inventory enforcement, F4/F7/F8 and redesign of frozen surfaces remain outside this gate.
- Existing Widget is still mounted by the shared shell on `/basket`; its visibility/layer behavior is unchanged. Existing diagnostic dev routes still have their prior inputs.
- Complete accessibility/device/visual regression QA is pending Gate 9B-3. A single successful smoke is not full closure evidence.

## 23. Browser QA Status

**Minimal smoke PASS**, not full Gate 9B-3. Actual headless Chrome157 via public Chrome DevTools Protocol; no React private internals. Disposable profile and temporary script/screenshots outside the repository; temporary dev server/Chrome process stopped after smoke.

Passed: `/basket` empty render; actual Home ProductCard ADD50 and ADD100; Header navigation to one grouped Product; plus actual Q and sum-Q; F1 merge sourceQ2 into targetQ1 → Q3 at `5 940 ₽`; focus on target decrement; keyboard Escape closes editor and restores edit focus; 1920/1024/375 geometry/no horizontal overflow/image loading; navigation away/back preserves Cart; final REMOVE yields empty state and focuses h1; **0 runtime errors**.

Screenshots inspected: temporary `sc-g9b2-mobile-b2929189-2d96-4c7b-aca1-d99d58c1a323.png` and `sc-g9b2-desktop-e944471a-68f9-4bcd-b12b-69c9620a1df9.png`. They are local QA artifacts, not production assets. Initial temporary harness attempts needed boolean DOM waits, separate radio/confirm event frames, and clientWidth-based desktop geometry because of scrollbars. Final smoke exited0 with `BASKET_SMOKE_PASS`.

## 24. Gate 9B-3 Readiness

Ready for owner architecture review of Gate 9B-2 and subsequent separate Browser QA gate. Full QA should cover multiple groups/discounts, several remaining-row focus fallbacks, newer pointer/focus cancellation, conflict/reopen after external updates, pending/error timing, unavailable/fixed/missing/partial data, very large Q/amount text, image fallback, long titles, intermediate widths and screen-reader keyboard behavior. No new hidden fixtures or debug hooks were added to production to simulate those cases.

The deferred Basket application wiring from ADR-G9B1-B1 is now implemented. This does not authorize beginning Gate 9B-3, backend work, changes to frozen components or committing the implementation.

## 25. Final Recommendation

Accept Gate 9B-2 implementation for architecture review with the documented fixture-only limitations and full Browser QA pending. Actual application consumer, safe public commands, unchanged F1/source precondition, shared pricing, responsive/accessibility implementation and all required automated checks are present. CR-G9B2-01 applied exactly; other protected contracts preserved.

No Git commit, Figma edits, Checkout/persistence or Gate 9B-3 work was performed. Stop after this report and await the owner's architecture review.

---

# Gate 9B-2R — Remediation Implementation Report

Дата: 2026-11-07. CONTROLLED IMPLEMENTATION. Основание: принятый Diagnostic Audit,
CR-9B2R-01 и явное разрешение Basket-local reconciliation/Summary/promo/share/radio polish.

## 1. Verdict

PASS для разрешённого remediation scope, owner review pending. Не означает closure
Gate 9B-3. Новая suite 27/27 PASS; existing suites 349/349 PASS; lint, TypeScript,
production build и browser smoke PASS в указанных ниже пределах.

## 2. Git baseline

HEAD `c2476e81fe5ef0fd3a35ac766bb8cd1dcfbe0f5a` сохранён. Входящее дерево уже содержало
Gate 9B-2: untracked Basket route/UI/tests/report и approved S37 diff. Эти изменения
сохранены. Commit/staging/reset/checkout/stash/clean не выполнялись.

## 3. Files created/modified

Новые: `frontend/features/basket/model/basket-group-order.ts`,
`frontend/features/basket/ui/BasketPromoCode.tsx`, `frontend/app/FloatingCartWidget.tsx`,
`frontend/scripts/basket-remediation.test.mjs`.

Изменены: `frontend/features/basket/ui/BasketFeature.tsx`, `BasketView.tsx`,
`Basket.module.css`, `frontend/app/layout.tsx`, этот документ.
Все paths входят в разрешённый inventory; дополнительных repository files нет.
Temporary CDP smoke script/screenshots/browser profile находятся вне repository.

## 4. CR-9B2R-01 implementation

RootLayout остаётся Server Component. Новый client FloatingCartWidget оборачивает
существующий CartWidgetContainer без DOM wrapper и без изменения его props.
CartApplicationProvider/CartProvider остаются снаружи и не размонтируются при navigation.
Сохранение исходного child element также сохраняет existing S33 composition proof.

## 5. Product group order reconciliation

`reconcileBasketGroupOrder(previous, current)` — чистая функция: сохраняет surviving
keys, удаляет исчезнувшие, добавляет новые в порядке входящего списка. При неизменном
порядке возвращает previous reference. Хранится только readonly string[] в BasketFeature.
На каждом render актуальные projection groups индексируются по productKey; items/Q/prices
никогда не сохраняются в history и не модифицируются.

Guarded same-component state adjustment выполняется до commit, без post-paint effect
и без mutable history ref во время render. React повторяет render до стабильного порядка.
`order` для focus fallback вычисляется из итоговых отображаемых groups.
История живёт только до unmount; remount начинает с текущей Gate 8B projection.
Projection/Domain/F1 ordering contracts сохранены.

Доказательства: новые tests REMOVE первой/последующей/последней фасовки, F1 merge,
absent-target transfer, re-add/clear, frozen input/idempotence, real Feature output
с fresh canonical references, independent mounts и real React StrictMode SSR/repeated render.
Hook runner проверяет component outputs/events, не имитирует полноценный DOM/concurrent renderer.
Browser MutationObserver дополнительно подтвердил отсутствие промежуточного DOM reorder
при REMOVE и F1 merge в настоящем application consumer.

## 6. CartWidget visibility

`usePathname()` в новом boundary скрывает `/basket`, `/basket/*`, `/checkout`,
`/checkout/*` с точными segment boundaries. `/checkout-info` и `/basket-info` разрешены.
Renderer/container/adapter, desktop breakpoint1280 и Header indicator не изменены.
Browser: non-empty Widget отсутствует на Basket, возвращается на Home; Cart Q сохранена.
Responsive display flex при1920 / none при1024 подтверждён. Checkout/nested paths
проверены deterministic boundary tests: новых Checkout routes нет.

## 7. CartWidget counter parity

Ничего в Widget/itemCount не изменено. Реальные renderer/adapter в новом regression:
quantities [2,2,1,1,1,1] → 6 canonical lines, 6 Widget rows, «6 позиций», sum-Q8,
3 Product groups. Summary показывает «Товары, шт.» и projection.totalQuantity.

## 8. Basket Summary Figma fidelity

Через Figma MCP повторно получены design contexts145:39751 и145:36535.
CSS: width445 desktop; mobile343 при viewport375; padding40 desktop /40px16px mobile;
heading24/500/opacity.8; outer gap32; inner gap24; detail gap20; details24/amounts500;
row leaders1px white.1; divider2px white.2; total40; actions20/500, min-height48,
radius12, actions gap16; Share outline. Summary имеет intrinsic height.

Overrides: отдельная sum-Q строка, «Итого», «Стоимость товаров без доставки», promo
до Checkout, disabled Checkout/Share. Длинный Checkout copy естественно занимает
две строки и увеличивает кнопку; fixed48/height522 не навязываются.
Денежные значения берутся из existing Gate 8B formatted view. No-discount не создаёт
скидку; partial/stale/overflow не получают полного total. Эти cases проверены tests.

## 9. Promo disclosure

BasketPromoCode владеет только expanded/value. Stable useId связывает trigger/panel/input,
native button и label, hidden panel, keyboard/focus-visible. Value сохраняется при
collapse до unmount. Enter предотвращён; Apply всегда disabled, без handler/form.
Нет Cart/pricing dependencies, backend calls, fake success или persistence.
Browser проверил native Enter activation, Input.insertText, collapse/reopen retention,
неизменность total/pathname и отсутствие новых requests во время promo interaction.

## 10. Configuration editor UX

`.options label` имеет user-select:none; input/label по умолчанию cursor:default;
`:enabled` и `label:has(input:enabled)` получают pointer. Native :enabled учитывает
disabled fieldset, поэтому pending/stale не показывают pointer на запрещённых targets.
F1 logic/markup/keyboard semantics сохранены. Browser computed styles, double-click
без text selection, ArrowRight100→200 и visible focus PASS.

## 11–13. Deterministic, existing regression and protection tests

Новая `basket-remediation.test.mjs`: **27/27 PASS**, 0 skipped.
Existing Basket UI50 + Product Input integration62 + protection32 + остальные205:
**349/349 PASS**, 0 skipped. Полный запуск с первыми26 новыми cases дал375/375;
после добавления StrictMode SSR case новая suite повторно прошла27/27.
Итоговое покрытие: **376 cases**, все прошли в этих запусках.

Команда полного запуска из frontend:

```powershell
node --test --test-concurrency=1 --test-reporter=tap scripts/basket-pricing.test.mjs scripts/cart-domain.test.mjs scripts/cart-transfer-product.test.mjs scripts/cart-widget-adapter.test.mjs scripts/configuration-contract.test.mjs scripts/focus-ownership.test.mjs scripts/notification.test.mjs scripts/product-pending-feedback.test.mjs scripts/purchase-sheet-draft.test.mjs scripts/product-input-integration.test.mjs scripts/product-input-protection.test.mjs scripts/basket-ui-contract.test.mjs scripts/basket-remediation.test.mjs
```

Existing tests не менялись. S33/S37/S38/S39, R29/R30 и pinned guard проходят без
расширения exceptions. Initial new stale-fixture test ошибочно мутировал shared context
alias; исправлена только новая fixture: price context заменяется отдельным объектом.
Production pricing logic не менялась ради теста.

## 14. ESLint / TypeScript / build

`npm.cmd run lint` PASS; `npx.cmd tsc --noEmit --incremental false` PASS;
`npm.cmd run build` PASS, Next15.5.27, `/basket`7.6kB/128kB first load.
Build включает lint/type checks. `git diff --check` PASS.
Новых dependencies/config changes нет.

## 15. Browser smoke

Реальный headless Chrome через public CDP, actual Home ProductCards/shared Provider/Basket,
без React private internals, test Cart или production debug hooks.
Временный script: `%TEMP%/sc-g9b2r-smoke.cjs`; результат `BASKET_REMEDIATION_SMOKE_PASS`.

PASS: REMOVE first configuration with three groups; F1 merge Q2/target focus;
absent-target transfer; route visibility/Header indicator; native radio checks;
keyboard promo/value retention/no application; disabled Apply/Checkout/Share;
navigation preserves Cart; final removal focuses h1; widths1920/1024/375 без overflow.
Все viewport: title24, total40, outer gap32, leader1px. Desktop width445/padding40;
tablet width600; mobile width343/padding40px16px. Screenshots inspected1920/375,
artifact1024 также сохранён: `%TEMP%/sc-g9b2r-{1920,1024,375}.png`.

Runtime errors0; hydration warnings0. Два existing Home PromoBanner Next/Image advisories
о next-slide.svg dimensions записаны явно; frozen PromoBanner не изменён.
Ранние harness attempts потребовали дождаться публичного selector interaction после
hydration, завершения F1 focus restore, native Enter text и mobile viewport emulation.
Финальный smoke exit0. Dev server и disposable Chrome остановлены.

## 16. Protected files diff

Сравнение SHA-256 repository files с pre-remediation snapshot: existing files менялись
только в разрешённых BasketFeature/BasketView/Basket CSS/layout/report. Новые files —
ровно четыре перечисленных выше. Incoming S37 diff сохранён byte-for-byte.
Cart Domain/Public Interface/Provider/F1, Gate8B/shared inputs, Widget, ProductCard/Sheet,
Header/Footer/Notification, AGENTS/Knowledge, existing tests, protection guard/baseline
не изменены. RootLayout — только разрешённый CR-9B2R-01.

## 17. Known limitations

Order history mount-local; after remount current canonical-first-occurrence projection
определяет initial order. In-memory Cart и fixture prices не являются backend authority.
Checkout/commercial promo/share отсутствуют. F4/F7/F8 не расширялись.
StrictMode SSR и dev smoke не являются исчерпывающей concurrent-render/device/a11y QA.
Nested/checkout route policy deterministic-only, поскольку реальные pages отсутствуют.
Summary intentionally отличается от Figma утверждёнными copy/quantity/promo/disabled
overrides; owner visual acceptance ещё требуется.

## 18–19. Gate 9B-3 readiness and recommendation

Разрешённая remediation готова к owner review. После принятия можно отдельно разрешить
Gate9B-3 с полной browser/accessibility/device QA; этот gate не начат.
Никаких commit/staging/protection baseline updates. Остановиться и ожидать review.
