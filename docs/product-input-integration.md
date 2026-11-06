# Gate 9B-1 — Shared Product Input & Pricing Integration Report

Дата: 2026-11-06. Режим: CONTROLLED IMPLEMENTATION. Область: общий frontend input и adapters; Basket UI не реализуется.

## 1. Verdict

**CLOSED / ACCEPTED** по решению владельца ADR-G9B1-B1. Четыре действующих production consumers подключены к одному immutable Product snapshot: ProductCard/DailyTop, F1 target validation, Cart prepared pricing и CartWidget availability. Basket adapter `projectProductInputBasket` подготовлен и протестирован; application caller отсутствует, его подключение к UI перенесено в Gate 9B-2.

Результаты: **205/205 existing regressions + 62/62 integration tests + 32/32 protection tests = 299/299 PASS**, 0 failures, 0 skipped. ESLint, TypeScript и production build PASS. Это не подтверждение backend commerce authority или готовности Checkout.

## ADR-G9B1-B1 — Owner Architecture Decision

- **Status:** APPROVED.
- **Decision:** ACCEPT GATE 9B-1 WITH DOCUMENTED SCOPE.
- **Gate 9B-1:** ARCHITECTURALLY ACCEPTED / CLOSED.
- **Shared Product Input Boundary v1.0:** ACCEPTED.
- **Cross-consumer pricing parity:** ACCEPTED в пределах существующей production-цепочки.
- **CR-9B1-01/02:** CLOSED; frozen production contracts PRESERVED.
- **Verification evidence:** 299/299 tests и lint/typecheck/build VERIFIED по независимому Final Verification & Closure Evidence Report. При документационном закрытии проверки повторно не запускались.
- **B1 resolution:** подготовленный и проверенный `projectProductInputBasket` достаточен для Gate 9B-1. Отсутствие application caller не является дефектом этого gate: исходный scope запрещал BasketFeature и `/basket`.
- **Basket application wiring:** DEFERRED TO GATE 9B-2; начало Gate 9B-2 требует отдельного реализационного задания.

Решение закрывает только scope-вопрос B1. Известные ограничения и риски сохраняются; production-код, fixtures, tests и protection baseline при этом закрытии не изменялись. Git commit не выполнялся.

## 2. Repository Baseline

Исходный HEAD: `7689095178f65ee2f28e084e35e88c586d006d06` — `Start creating basket contract`. Исходное рабочее дерево на первом preflight было чистым, baseline 205/205 PASS. При продолжении присутствовали собственные результаты предыдущего preflight: правка R29, protection suite и этот документ. История, index и HEAD не переписывались; commit не выполнялся.

До implementation изучены AGENTS, `docs/cart-domain.md`, `docs/basket-pricing.md`, Gate 8B types/quote/projection/product adapter/eligibility, Cart Provider/Public Interface/F1, configuration normalization, ProductCard purchase flow, pricing fixtures, Widget adapter, RootLayout и Header indicator. Других применимых AGENTS вне protected Knowledge нет. Figma/UI не менялись; визуальная реализация не входила в gate.

## 3. Files Created

Все production additions находятся в `frontend/features/product-input/`:

| Файл | Основной тип/функция и назначение |
| --- | --- |
| `product-input.types.ts` | `ProductInput`, `ProductInputSnapshot`, `ProductInputViews`, `ProductInputIssue` — readonly frontend contract |
| `product-input.snapshot.ts` | `createProductInputSnapshot`, `deepFreeze` — detached deeply immutable generation |
| `product-input.definition.ts` | `productDefinitionCard` — canonical definition metadata для существующего Gate 8B adapter |
| `product-input.fixtures.ts` | `applicationProductSnapshot` — explicit numeric demonstration source |
| `product-input.validation.ts` | `prepareProductInputs` — validation, typed diagnostics, согласованные views |
| `product-input.presentation.ts` | `productInputCards` — ProductCard-compatible prices/availability |
| `product-input.cart-pricing.ts` | `productInputCartPricing` — existing Cart resolver input |
| `product-input.transfer.ts` | `productInputTransferTarget` — injection existing F1 validator + shared availability |
| `product-input.availability.ts` | `ProductWidgetAvailability`, `productInputWidgetAvailability` — fixed/selectable status projection |
| `product-input.basket.ts` | `projectProductInputBasket` — чистый Gate 8B integration API |
| `product-input.application.ts` | `applicationProductInputs` — одна application composition |

Созданы также:

- `frontend/scripts/product-input-integration.test.mjs` — 62 deterministic integration tests.
- `frontend/scripts/product-input-protection.test.mjs` — 32 deterministic guard tests.
- `frontend/scripts/product-input-protection.cjs` — synchronous structural/baseline guard R30.
- `frontend/scripts/product-input-protection.baseline.json` — fixed revision и approved body hashes.
- `docs/product-input-integration.md` — настоящий отчёт и integration documentation.

## 4. Files Modified

| Файл | Точное изменение |
| --- | --- |
| `frontend/features/cart/CartApplicationProvider.tsx` | `CartApplicationProvider`: вместо двух независимых fixture resolvers inject `applicationProductInputs.resolvePricing/resolveTransferTarget`; тот же CartProvider и children |
| `frontend/features/cart/cart-widget.adapter.ts` | `isUnavailable`/`toCartWidgetItems`: canonical identity/status lookup, включая fixed, unknown и duplicate status; без изменения items/quantity/pricing/removal |
| `frontend/app/layout.tsx` | `RootLayout`: Widget availability из `applicationProductInputs.widgetAvailability`; Server Component и shell composition сохранены |
| `frontend/features/home/DailyTop/daily-top.data.ts` | `homeDailyTopProducts`: прежние четыре Product identities/order выбираются из общей presentation projection |
| `frontend/scripts/basket-pricing.test.mjs` | Только тела R29/R30, по CR-9B1-01/02; прочее содержимое проверяется против исходного baseline |

Этот набор wiring files и его назначение были перечислены до реализации. Ни UI/layout, ни public renderer contracts не менялись.

## 5. Shared Product Input Contract

`ProductInputSnapshot` (`product-input.types.ts`) содержит snapshotId, demonstration provenance, source/catalog/pricing context и products. Product содержит productKey, non-price presentation metadata, fixed/standard purchase definitions, explicit availability и `CatalogBundle` с Product policy и configuration prices.

Identity не выводится из title, display label, array index или формулы веса. Существующие opaque IDs сохранены. Цена и availability относятся к одной generation. Cart quantity в snapshot отсутствует.

Владение: `product-input.fixtures.ts` создаёт generation; `applicationProductInputs` использует её для всех application projections/resolvers. Это frontend application boundary, не backend DTO. Нет fetch, React state, mutable Product store, persistence или дополнительного Cart.

`createProductInputSnapshot` делает `structuredClone` до recursive freeze. `prepareProductInputs` и adapters замораживают derived views. Consumers получают readonly contracts и deeply frozen values. Новые callers должны сначала сконструировать detached snapshot, затем вызвать `prepareProductInputs`.

## 6. Snapshot Validation

`prepareProductInputs` повторно использует `adaptBasketProduct`, `validateCatalogBundle`, `moneyIssue`, `projectProductBadge`, `validContext` из Gate 8B. Дополнительно проверяются duplicate Product keys, presentation/identity coherence, canonical slots, explicit availability membership/duplicates, полнота цен и renderer-safe metadata.

Typed `ProductInputIssue.code`: snapshot, duplicate-product, definition, excluded-preorder, policy, money, price-missing, revision, availability, badge, presentation, fixed-purchase-unavailable. Ошибки доступны в `applicationProductInputs.views.issues`; callers должны учитывать их, а не интерпретировать отсутствие Card как отсутствие Product.

Malformed/partial данные не исправляются молча. Неизвестная availability не становится available. Missing policy не становится none. Invalid/excluded Card inputs не передаются purchasable renderer; оригинальный snapshot и diagnostics сохраняются. Basket сохраняет canonical items и fallback, включая возможность REMOVE. Невалидная snapshot generation даёт typed issue и пустые safe views; null/partial runtime cases протестированы.

## 7. Numeric Pricing Source

Единый numeric источник: таблица `numeric` в `product-input.fixtures.ts`, explicit целые копейки RUB. Следующая таблица фиксирует inventory старых presentation values и выбранные демонстрационные значения; они НЕ считаются production catalog data.

| Product | Existing configuration IDs | Original/current, рубли |
| --- | --- | --- |
| tea-presentation | tea-50 / tea-100 / tea-200 / tea-250 | 1030/1030; 1980/1980; 3800/3800; 4650/4650 |
| discount-tea-presentation | discount-50 / discount-100 / discount-200 / discount-250 | 850/640; 1600/1200; 3040/2280; 3600/2700 |
| long-title-tea-presentation | long-50 / long-100 / long-200 / long-250 | 2800/2800; 5400/5400; 10300/10300; 12600/12600 |
| availability-tea-presentation | availability-50 / availability-100 / availability-200 / availability-250 | 1030/1030; 1980/1980; 3800/3800; 4650/4650 |
| pressed-puer-presentation | canonical fixed | 1500/1500 |
| teapot-pharaoh-presentation | canonical fixed | 9300/9300 |
| preorder-tea-presentation | preorder-50; остальных slots нет | 1600/1600; исключён из purchase integration |

Всего snapshot сохраняет 7 Product records и 19 исходных configuration identities. Valid Card projection содержит 6 Products, 18 configurations; preorder не достраивается.

Для no-discount fixtures O=C явно записаны в numeric source; это выбранная демонстрационная интерпретация отсутствия discount metadata, не доказательство production policy. Для active fixture исходные O/C сохранены без исправления процента. Все цены заданы двумя числами, а не вычисляются из discount/другой фасовки.

Из frozen `product-card.fixtures.ts` переиспользуются только non-price metadata и definitions. Старые price strings не входят в snapshot и не читаются builder: S16 подменяет их throwing getters и подтверждает успешную construction. `cart-pricing.fixtures.ts` больше не является production application source; файл сохранён для existing tests/изолированных dev QA scopes.

## 8. Product-level Discount Policy

Используется existing `ProductDiscountPolicy` (`basket-pricing.types.ts`): confirmed-none, confirmed-active, unavailable, invalid. На Product одна policy; все configuration prices ссылаются на её policyRevision.

Для confirmed-none O=C, нет discount presentation, badge или savings. Для active O>C>0 для каждой configuration. `projectProductBadge` валидирует presentation metadata отдельно от денег. Невалидный badge даёт diagnostic, но не уничтожает monetary quote; Card получает пустой percentage label при сохранённых original/current, Basket badge отсутствует. Frozen Card renderer может сохранить пустой badge element — renderer не менялся; действующие application fixtures имеют валидный badge.

Badge −25% скидочного fixture не используется для денежной арифметики: 850/640 сохраняется как явная демонстрационная пара.

## 9. ProductCard Integration

`productInputCards` использует `resolveBasketLineQuote` для Q=1, `formatBasketMoney` для current/original strings и `projectProductBadge` для label. Выбранная initial price соответствует canonical 50 г.; options сортируются по explicit nominal-weight metadata, IDs не меняются. Selectable unavailable/unknown options остаются visible/selectable и получают disabled purchase flag.

`homeDailyTopProducts` получает те же четыре Products в том же порядке из `applicationProductInputs.cards`. Renderer, public props, normalization, selector/Sheet purchase/focus flow и media/content сохранены. S33 загружает реальный application module и проверяет reference inclusion, а не только grep.

## 10. Cart Pricing Integration

`productInputCartPricing` реализует существующий `ResolveCartPricing`. Он вызывает Gate 8B `resolveBasketLineQuote` для actual resulting Q и форматирует currentLine. Все multiplication/overflow checks остаются в Gate 8B, с BigInt intermediates и JSON-compatible numeric outputs. Дополнительного pricing engine нет.

`CartApplicationProvider` передаёт resolver существующему CartProvider. Missing/invalid/stale/overflow quote становится существующим `{status:'unavailable'}`; stale old line-total string не переиспользуется. Штатная unavailable pricing не запрещает разрешённую existing Cart mutation и не превращается в zero.

Ограничение refresh: prepared pricing сохраняется в CartItem при mutation. Новая Product generation сама не обновляет существующие CartItems. S35 показывает, что новый resolver даёт новую цену, а существующий canonical item сохраняет прежнюю. Mutation lifecycle не менялся; dynamic refresh не обещается.

## 11. F1 Target Validation Integration

`productInputTransferTarget` вызывает неизменённый `resolveProductTransferTarget` с shared definition metadata, затем проверяет target status через существующий `basketAvailability` на той же generation. Unknown возвращает validation-unavailable; unavailable target не авторизует increase/merge. Невалидный Product/duplicate/preorder отвергается до transfer.

Existing F1 semantics сохранены: fixed target остаётся invalid-identity; unknown configuration не проходит membership; unavailable source может перейти в available target; existing target merge использует actual target Q. Canonical expectedSource передаётся как исходная reference, без clone/restore. Atomicity, source precondition и publication принадлежат прежнему model/Provider. S22/S26/S29/S30/S39 и existing F1 suite это проверяют.

## 12. CartWidget Availability Integration

`productInputWidgetAvailability` выводит status из тех же `views.products/availability`, что Basket/F1. `ProductWidgetAvailability` совместим со старым container prop и дополнительно несёт canonical CartIdentity/status. У fixed identity остаётся `{kind:'fixed'}`; пустой compatibility configurationId не является selectable identity и не используется для её создания.

`RootLayout` inject эту projection. `isUnavailable` (`cart-widget.adapter.ts`) сравнивает canonical identities, включая fixed. Unknown/missing/duplicate status консервативно отображается существующим unavailable presentation; ни строка, ни Q не удаляются. Явный empty availability input не подтверждает наличие. Старые изолированные callers без availability сохраняют прежний presentation-only режим; production всегда получает explicit projection.

Widget items/price snapshot, REMOVE handler, focus behavior, renderer и Header не менялись. Widget не имеет increase controls; purchase increase guards используют ту же source availability через Card/F1, а Basket canIncrease требует current available definition. Decrease/REMOVE existing canonical lines сохраняются.

## 13. Basket Pricing Integration

`projectProductInputBasket(items, views)` (`product-input.basket.ts`) вызывает существующий `projectBasketPricing` с shared products, bundles, context и availability. Вызов для будущего Basket consumer:

```ts
const projection = projectProductInputBasket(cart.items, applicationProductInputs.views);
```

Это пример будущего application wiring, а не существующий UI caller. Сейчас adapter вызывается integration tests. По ADR-G9B1-B1 этот результат принят для Gate 9B-1; фактическое подключение к application UI относится к Gate 9B-2.

Нет BasketFeature/store/route, копии quantities, fetch, новой arithmetic или Checkout action. Все coverage/issues/totals semantics принадлежат Gate 8B. S40 сравнивает integration output с прямым Gate 8B вызовом и подтверждает partial coverage без full total. Caller также имеет доступ к `views.issues` для input diagnostics.

## 14. Cross-consumer Price Parity

S17/S18 сравнивают Card строки с numeric O/C. S21 проверяет все 18 valid identities при Q=1/2/7/101: Cart line-total string совпадает с форматированным Basket currentLine. S22/S30 проверяют target price после transfer/merge; S23 — Widget/Basket availability для available, unavailable, fixed и missing.

Примеры: tea-100 ×3 = 594000 коп. = `5 940 ₽`; discount-50 ×4 = O 340000 / C 256000 / savings 84000 коп.; merge discount-50 ×2 в discount-100 ×3 даёт Q5, C 600000 коп. = `6 000 ₽`. Rounding edge O101/C86 коп. ×4 даёт 404/344/60, не пересчитанные 343.

## 15. Revision / Coherence Verification

`prepareProductInputs` использует `validateCatalogBundle`; bundle/policy/configuration contexts должны совпадать с snapshot source/catalogRevision/pricingRevision. Все prices ссылаются на актуальную policyRevision; priceRevision — отдельное nonempty identity изменения цены. Проверены stale policy binding и source/catalog/pricing context mismatch.

Local revision strings маркируют coherent demonstration generation, а не backend freshness. Badge-only metadata не входит в monetary arithmetic. Асинхронные quote acceptance, transport versioning, retries и F4 publication guarantees не добавлялись.

## 16. Fixed / Missing / Invalid Product Behavior

Fixed Tea сохраняет physical weight label и canonical fixed identity; Ceramics не получает weight. F1 для fixed не расширяется. Для недоступного fixed Product frozen Card не имеет disabled purchase prop, поэтому Card исключается с typed `fixed-purchase-unavailable`; existing CartItem сохраняется в Basket/Widget с safe removal и current pricing при наличии quote.

Missing Product/configuration сохраняет canonical snapshot, quantity и REMOVE. Malformed standard metadata не нормализуется путём выдумывания slots; Gate 8B получает invalid definition либо missing fallback с отдельным boundary diagnostic.

Preorder fixture имеет один slot, получает excluded-preorder и validation diagnostics, остаётся в source snapshot, но исключена из purchasable Card/F1 integration. Definitions/IDs не исправлены и не достроены. При существующей CartItem Gate 8B fallback/removal сохраняются.

## 17. Tests S1–S40

`frontend/scripts/product-input-integration.test.mjs`: **40/40 S-tests PASS**.

| Сценарии | Проверяемые факты |
| --- | --- |
| S1–S8 | Single snapshot, duplicates, canonical membership/order, fixed/missing/malformed, deep immutability, identity parity |
| S9–S16 | Safe RUB integers, none/active policy, общая policy, badge independence, stale revisions, invalid money/overflow, no old-string reads |
| S17–S24 | Numeric Card O/C, Cart/Basket Q totals/parity, F1 pricing, Widget availability, canonical identity/snapshot preservation |
| S25–S32 | Available/unavailable/unknown target, unknown configuration, fixed behavior, actual-Q merge, missing removal, unavailable retention/decrease |
| S33–S40 | Actual application imports/injection, legacy source exclusion, refresh limitation, fixture authority, no Checkout, protected/wiring semantics, no second store/optimistic mutation, Gate 8B coverage |

S33 исполняет реальные TS/TSX application modules, проверяет props actual CartApplicationProvider/RootLayout elements и reference membership DailyTop. UI leaves и CartProvider boundary заменены test stubs; это deterministic composition proof, не browser interaction/render test. Legacy regression suites отдельно подтверждают domain/adapter semantics.

CR-9B1-01 condition 5 проверяется S38/S39: Provider AST содержит единственную function с единственным return, нет module-level state; runtime injection использует именно shared resolver references и сохраняет children; Widget mapping на deeply frozen Cart input сохраняет identity/Q/snapshot и не мутирует canonical state. R30 дополнительно проверяет неизменность model/Provider/F1. Existing Widget mapping regressions остаются PASS.

## 18. Additional Edge Cases

**22/22 additional integration tests PASS**: NaN/Infinity/negative/zero/fraction/unsafe money, source/catalog/pricing mismatch, unavailable/invalid/missing policy, duplicate definition/price/availability, partial/null Product/snapshot, fixed unavailable, unknown/non-purchasable status, empty availability, exact fractional kopeks, unavailable-source transfer, non-RUB currency, very large valid Q, aggregate overflow без полного total, malformed mood metadata, label/weight/slot mismatch и foreign identities.

S24/S35/S39 дополнительно доказывают сохранение CartItem presentation/pricing snapshot, отсутствие hidden optimistic mutation и identity-reference source guard. Нет broad catch, маскирующего programming exceptions как quote-unavailable.

## 19. Existing Regression Tests

До application implementation после CR-9B1-02: **205/205 PASS**. После implementation: повторно **205/205 PASS**, 0 skipped. Команда из `frontend`:

```powershell
node --test --test-concurrency=1 --test-reporter=spec scripts/basket-pricing.test.mjs scripts/cart-domain.test.mjs scripts/cart-transfer-product.test.mjs scripts/cart-widget-adapter.test.mjs scripts/configuration-contract.test.mjs scripts/focus-ownership.test.mjs scripts/notification.test.mjs scripts/product-pending-feedback.test.mjs scripts/purchase-sheet-draft.test.mjs
```

Новые suites выполнены отдельно: **94/94 PASS** (62 integration + 32 protection):

```powershell
node --test --test-concurrency=1 --test-reporter=spec scripts/product-input-integration.test.mjs scripts/product-input-protection.test.mjs
```

Первый запуск новой integration suite выявил неверное ожидание S2: duplicate Product/bundle даёт invalid-pricing-data по existing Gate 8B, а не unavailable. Исправлен только новый тест; existing monetary assertions/semantics не менялись. Monetary parity failures не обнаружены.

## 20. ESLint / TypeScript / Production Build

Финальные проверки выполнялись последовательно из `frontend`:

| Команда | Результат |
| --- | --- |
| `npm.cmd run lint` | PASS, 0 errors/warnings |
| `npx.cmd tsc --noEmit --incremental false` | PASS |
| `npm.cmd run build` | PASS, Next.js 15.5.27, production compilation/static generation/traces завершены |
| `git diff --check` | PASS |

Guard использует `.cjs`, поскольку существующий R30 synchronous и разрешено менять только его тело. Новый guard имеет локальное объяснённое ESLint исключение no-require-imports; глобальная ESLint конфигурация не менялась.

Browser QA не выполнялась: visual/focus/purchase renderers не менялись. Проверки composition основаны на реальных application imports и outputs; production build подтвердил Next boundaries. Это не замена будущему browser review Basket UI.

## 21. Protected Files Diff — CR-9B1-01 / CR-9B1-02

**CR-9B1-01:** исходный R29 запрещал любой HEAD diff в AGENTS, Knowledge, cart directory, ProductCard directory, SiteHeader и styles. Этот targets list сохранён полностью. Новый assertion исключает ровно `frontend/features/cart/CartApplicationProvider.tsx` и `frontend/features/cart/cart-widget.adapter.ts` через Set точных paths; все остальные changed paths должны дать пустой остаток. Directory/prefix/wildcard exception отсутствует.

**CR-9B1-02:** в R30 заменены только два statements после исходного root declaration: загрузка нового synchronous guard через Module.createRequire и `assert.doesNotThrow(() => verifyRepository(root))`. Имена tests, callbacks/envelopes и остальной existing файл не менялись. R29 assertions не удалены; R30 не пропускается и не принимает весь файл без проверки.

Новый `product-input-protection.cjs` использует:

1. Fixed immutable Git object `7689095178f65ee2f28e084e35e88c586d006d06`, versioned в `product-input-protection.baseline.json`; текущий HEAD не является доверенным baseline.
2. TypeScript AST для поиска ровно двух top-level tests с точными именами и block callbacks. Только содержимое callback bodies выделяется как regions; всё вне них, включая имена/envelopes/порядок, сравнивается с исходным файлом.
3. SHA-256 allowlist точных утверждённых body texts R29/R30 из versioned baseline. Пустые assertions, дополнительные statements или расширенный allowlist не принимаются как произвольное разрешённое тело.
4. Проверку всех остальных initial existing scripts и frozen paths против fixed baseline. Помимо исторического R29 scope guard охватывает Footer, Notification, focus-ownership, globals и перечисленные core Gate 8B files. Для двух разрешённых wiring paths остаются S38/S39 и regression checks.

Сравнение text content использует canonical LF, чтобы штатный Windows CRLF checkout не считался изменением. Иной текст вне regions не разрешён. Baseline не генерируется из нового HEAD при запуске и не обновляется автоматически после commit. Даже committed изменение существующего test/domain/Provider/F1 отклоняется при том же контракте. Нужен доступ к pinned Git object; его отсутствие fail-closed, без доверия к текущему HEAD. Изменение самого versioned guard/baseline требует отдельного review, как изменение тестового защитного контракта.

Approved body SHA-256:

- R29: `bf1a79b0b0106b45dd74d8ce19ce1a3d37b4b44f50df049867c0ab99499f1f4b`.
- R30: `794516111202e20205a06f20ae931e676b4d2c2fc81cb2e040f58ec51bfb7a11`.

**32/32 protection tests PASS:** exact corrections принимаются; изменения другого existing script/внешнего текста/Cart Domain/Provider/F1 отклоняются, как и deletion/rename R29/R30, пустые assertions, directory exception, расширение region и перенос кода наружу. Post-commit resilience проверена injected readers с changed content против independent baseline; реальный commit для теста не создавался. Actual repository verification также прошла через R30 и S38.

Никаких изменений Cart model/types/Public Interface/Provider/F1, Gate 8B core, ProductCard/Sheet/Widget renderers, Header/Footer/Notification, focus-ownership, AGENTS, Knowledge, global styles или остальных existing tests нет. Единственное согласованное исключение existing test — тела R29/R30.

## 22. Remaining Limitations

- Все source amounts/policies/availability/revisions демонстрационные. `application: 'catalog-confirmed'` — имя existing Gate 8B input literal; при source fixture это локальная согласованность, не подтверждение backend.
- Existing CartItem prepared pricing обновляется только при existing mutations, не при смене Product inputs. Dynamic refresh и backend stock enforcement отсутствуют.
- Preorder malformed fixture исключена явно. Недоступный fixed Product не передаётся purchasable frozen Card; это safe exclusion с diagnostic, не новый out-of-stock UI.
- Invalid badge оставляет valid monetary quote; frozen Card не имеет отдельного optional badge prop и может создать пустой badge element. Валидные application fixtures этим не затронуты.
- `/dev` harnesses и existing tests сохраняют legacy fixtures/resolvers для diagnostic scopes. Не все dev consumers изолированы: `/dev/cart-widget-integration` использует настоящий application Cart, но Card inputs получает из legacy fixtures. Эти dev-страницы закрыты production guards; единство source/parity принято в пределах существующей production-цепочки RootLayout/CartApplicationProvider/DailyTop, а не всех dev inputs.
- Нет runtime/backend Product ownership, quantity-dependent stock authorization, async refresh guarantees, Checkout, persistence или новой Basket UI. F4/F7/F8 не закрываются этим gate.
- Protection guard требует наличия pinned Git object; shallow CI checkout без него завершится fail-closed. Изменение versioned guard/baseline требует отдельного review. Browser QA будущего Basket UI остаётся обязательной отдельной проверкой.

## 23. Open Decisions

Blocking decision B1 закрыт владельцем по ADR-G9B1-B1. CR-9B1-01 и CR-9B1-02 CLOSED. Source inventory и explicit fixture choices документированы, не объявлены production truth. Открытых решений для закрытия Gate 9B-1 нет.

Backend migration остаётся отдельным этапом: получить endpoints/DTO, сопоставить domain identity/configurations, money/policies/revisions и authoritative availability; затем заменить fixture producer adapters, отдельно согласовать mutation/refresh/stock/Checkout contracts. Не выдавать существующий frontend input type за будущий DTO и не менять AGENTS/архитектурные правила молча.

## 24. Gate 9B-2 Readiness

Shared integration boundary архитектурно принята по ADR-G9B1-B1. В Gate 9B-2 будущий Basket consumer должен получить `applicationProductInputs.views` и вызвать `projectProductInputBasket` с canonical Cart items. Adapter подготовлен и протестирован на тех же price/availability inputs; application UI wiring пока отсутствует и перенесено в Gate 9B-2.

Это readiness только frontend fixture boundary. `/basket`, BasketFeature, configuration editor, Checkout и persistence не созданы. Gate 9B-2 не начат и требует отдельного разрешения.

## 25. Final Recommendation

Gate 9B-1 **CLOSED / ACCEPTED** владельцем по ADR-G9B1-B1 с документированными scope и ограничениями. Основание: четыре подключённых production consumers, подготовленный и протестированный Basket adapter, S1–S40, edge/parity tests, existing regressions и VERIFIED quality/build checks. Изменение guard само по себе не является основанием принятия.

Остановиться на этом gate. Git commit не выполнялся; AGENTS/Knowledge/Figma и frozen contracts не менялись. К Gate 9B-2 переходить только по отдельному заданию.
