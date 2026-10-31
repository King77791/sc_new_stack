# Product Contract v1.0

Статус: утверждённый контракт в рамках [checkpoint v0.1](00-overview.md).

```text
PRODUCT
├── Product Domain
├── Product Knowledge
└── RAG projection
```

## Product Domain

Существующая operational-модель приложения остаётся Source of Truth для operational data и изменяемых коммерческих данных. К её ответственности относятся title, uid, slug, SKU, price, discount, images, unit, weightByUnit, stock, sale status, availability и operational metadata.

Названия `uid`, `SKU`, `weightByUnit` здесь обозначают концепты из задания, а не новую API schema или предписание распространять legacy naming. [Корневая Product Domain Model v0.1](../../../AGENTS.md) сохраняется: предпочтительны id/title/slug/sku, Purchase Configuration остаётся domain concept до анализа backend API.

Не копировать operational data в Knowledge Base как второй Source of Truth. Особенно это касается актуальной цены, stock, discount, доступных весов и SKU availability. Будущий AI получает такие данные из Product Domain/backend, а не из RAG Markdown. Backend contract пока не предоставлен; endpoints и DTO здесь не определяются.

## Product Knowledge

Product Knowledge — канонические устойчивые знания о продукте. Будущая структура:

```text
products/{product_id}/
├── README.md
├── identity.md
├── origin.md
├── sensory.md
├── brewing.md
├── experience.md
├── contexts.md
├── comparisons.md
├── claims.md
└── sources.md
```

Это только документированная структура. Каталоги конкретных продуктов и их данные сейчас не создаются.

Возможные направления знаний:

- identity, tea family/type, origin, production;
- sensory: aroma, taste, texture, body, aftertaste, bitterness, astringency, sweetness, sensory axes;
- canonical brewing, practical brewing;
- experience, beginner friendliness, session character;
- contexts, comparisons, claims, provenance.

`identity.md` не создаёт второй operational master record. Knowledge о происхождении и приготовлении не переопределяет operational Country/Origin или BrewingGuide: эти domain concepts и их backend types остаются под действующими корневыми правилами.

## Canonical Product identity — решение Patch v0.1.1, уточнение v0.1.2

Knowledge Domain имеет собственный стабильный `canonical_product_id`. Он идентифицирует самостоятельный предмет знания, а не SKU, весовую опцию, URL или маркетинговую вариацию. `{product_id}` в документированных Knowledge paths означает `canonical_product_id`.

ID уникален внутри Knowledge Domain, стабилен, human-readable где разумно, machine-safe, lowercase и практически immutable после утверждения. Он независим от цены, скидки, stock, выбранного веса, measurement model, purchase unit и marketing flags; product form не является самим ID. Иллюстрация формата: `mengku-2014`, а не `mengku-2014-50g-sale`; это не созданная запись продукта.

SKU и slug не используются автоматически как Knowledge identity: SKU — commercial reference, slug — потенциально изменяемый routing/SEO concern. Relations должны переживать изменение URL и ассортимента SKU.

```text
Knowledge Product
canonical_product_id: mengku-2014
        │
        ▼
Product Domain Product
├── uid/reference
├── SKU
├── slug
├── unit
├── weightByUnit
│   ├── 50
│   ├── 100
│   ├── 200
│   └── 250
├── price
└── stock
```

Это концептуальная иллюстрация границы, не schema хранения или новая запись продукта. Один Product имеет один SKU; весовые варианты разрешаются Product Domain через механизм `weightByUnit`, не создавая SKU по фасовкам. Показанные веса не универсальны для всех товаров. Для стандартного weight-based Tea сохраняется утверждённый корневой контракт четырёх canonical slots и backend-authoritative availability (§8.10), без распространения этого правила на другие товары.

Mapping с Product Domain проектируется отдельно; runtime mapping table сейчас не создаётся. Если Product Domain uid обладает нужной стабильностью, он рассматривается как mapping target / implementation consideration, не заменяя решение о собственной Knowledge identity. См. [ADR-012](decisions.md).

### Совместимость с текущей моделью и кодом

Patch v0.1.2 исправляет прежнюю неоднозначную иллюстрацию SKU[]: для одного весового Product разные `weightByUnit` не создают отдельные SKU. Это соответствует корневым §§8.2, 8.16, 8.28, 8.33, а не изменяет их. `weightByUnit` — Product Domain mechanism, не утверждённая этим документом структура backend DTO; корневая legacy mapping также требует учитывать тип товара.

В текущих [ProductCard presentation types](../../../frontend/features/product/ProductCard/ProductCard.types.ts) есть slug, но нет полей uid/SKU; тип прямо помечен как UI input, не Product model/backend contract. [ProductCard](../../../frontend/features/product/ProductCard/ProductCard.tsx) использует slug для routing и локального Cart productKey; [Cart types](../../../frontend/features/cart/cart.types.ts) явно обозначают такой key как frontend-only, не backend ID. Это не canonical Knowledge identity. Стабильность реального uid пока не подтверждена: backend contract отсутствует. Код, routing, Cart identity и Product Domain в patch не меняются.

## Product measurement и commercial form — Patch v0.1.2

| Вопрос | Концепт и ответственность |
| --- | --- |
| WHO IS IT? | canonical_product_id — Knowledge identity |
| WHAT FORM IS IT? | product_form — физическая/товарная форма |
| HOW IS WEIGHT SEMANTICALLY TREATED? | measurement_model — семантика веса |
| WHAT IS THE PURCHASE UNIT? | purchase_unit — семантика единицы покупки |
| WHAT CAN BE BOUGHT RIGHT NOW? | Product Domain — current purchasable options |

Последний вопрос никогда не определяется только статическим Knowledge Markdown. Эти измерения не сливаются в перегруженный `sale_model` enum и не предписывают физические поля текущего backend.

### Независимые измерения

`measurement_model` концептуально различает:

- `variable_weight`: весовой товар; покупатель выбирает разрешённый Product Domain весовой вариант. Например, чай на развес с 50/100/200/250 г; актуальная доступность вариантов — operational data.
- `fixed_weight`: вес — характеристика готового товарного исполнения. Покупается единица фиксированного веса, например вакуумная упаковка 200 г, блин пуэра 357 г или брикет 1 кг, а не произвольная фасовка. Числовой физический вес гибкий, не enum известных весов.
- `not_weight_based`: вес не является основной моделью продажи, например чайник, пиала или ваза. Это не утверждение отсутствия физической массы предмета.

`purchase_unit` — отдельная семантика единицы покупки: `weight`, `piece`, `set`.

| Product example | measurement_model | purchase_unit |
| --- | --- | --- |
| Чай на развес | variable_weight | weight |
| Вакуумная упаковка 200 г | fixed_weight | piece |
| Блин пуэра 357 г | fixed_weight | piece |
| Брикет 1 кг | fixed_weight | piece |
| Чайник | not_weight_based | piece |
| Подарочный набор | not_weight_based | set |

Это иллюстрации, не production schema или исчерпывающая матрица допустимых сочетаний. Conceptual `purchase_unit = set` не меняет operational `unit`: корневой §8.17 допускает продажу подарочного набора в штуках. Gift Set остаётся самостоятельным Product со своим SKU/stock и composition, не динамическим bundle из retail stock (§§8.24–8.26). `unit = piece` не определяет само по себе тип товара или его поведение. Volume чайника не становится purchase option.

`product_form` описывает физическую/товарную форму, отдельно от SKU, measurement model, purchase unit и canonical ID. Примеры для чая: `loose_leaf`, `cake`, `brick`, `tuo`, `vacuum_pack`, `portion_pack`, `other`. Это illustrative examples, не окончательная production schema и не жёсткий enum; по одному form label не выводятся доступные покупки.

### Identity dimensions и граница источников истины

| Измерение | Концептуальное обозначение |
| --- | --- |
| Knowledge identity | canonical_product_id |
| Product Domain identity/reference | uid |
| Commercial identifier | SKU |
| Routing identity | slug |
| Physical/product form | product_form |
| Measurement semantics | measurement_model |
| Purchase semantics | purchase_unit |
| Operational weight options | weightByUnit |

Knowledge понимает семантику identity, form, measurement и purchase unit. Актуальные SKU, unit, weightByUnit, price, discount, stock, availability и current purchasable options принадлежат Product Domain. Не вести `available_weights`, `current_price`, `current_stock`, `current_discount` вручную как Knowledge Source of Truth. Значения semantic concepts не заменяют operational purchase configuration и не являются новой API model.

### Fixed weight и budget reasoning

Fixed weight нельзя интерпретировать как variable-weight availability. Блин 357 г не означает возможность покупки 50/100/200 г, если Product Domain явно не предоставляет таких вариантов. Для чая на развес может быть несколько разрешённых `weightByUnit`.

Будущий Recommendation Engine соединяет Product Knowledge + Product Domain → current purchasable options. Для запроса «Хочу попробовать что-нибудь до 500 рублей» variable-weight продукт может остаться кандидатом, если Product Domain подтверждает: 100 г дороже бюджета, но 50 г укладывается в него и доступен. Для fixed-weight продукта 357 г с minimum purchasable unit = 1 piece и ценой выше бюджета нельзя изобретать покупку 50 г. Это иллюстрация правила, не реальные цены, расчёт pricing или recommendation runtime.

### Когда выделять самостоятельный предмет знания

`canonical_product_id: mengku-2014` остаётся одним для 50/100/200/250 г, если это один Product Domain Product и меняется только выбранный `weightByUnit`. Нельзя создавать `mengku-2014-50g` и `mengku-2014-100g` как разные Knowledge Products только из-за веса. Fixed-weight продукт также получает identity на уровне самостоятельного предмета знания, а не опции фасовки.

Коммерческие варианты объединяются в одну Knowledge Product Entity только тогда, когда различия не меняют значимые предметные знания. Изменения physical form, processing, storage/ageing behavior, brewing, sensory profile, product experience или recommendation context могут потребовать отдельной entity.

Один чай в loose leaf и compressed cake нельзя автоматически объединять только из-за общего сырья/названия; нельзя и автоматически разделять на два Knowledge Products. Нужны фактические данные и явное решение. Form не является ID, но его существенное влияние на знания учитывается при определении самостоятельного предмета знания. Неясность measurement semantics или конфликты с Product Domain требуют escalation по [AGENTS](../../AGENTS.md). См. [ADR-013](decisions.md).

## Инварианты знания

> UNKNOWN ≠ FALSE.

Отсутствующие сведения остаются неизвестными. Нельзя заполнять их догадками, подменять отсутствующий факт отрицанием или автоматически достраивать характеристики продукта.

> Store facts once. Interpret them many times.

Факт о продукте хранится в Product Knowledge один раз. Его значение для конкретного State хранится в [Product × State relation](04-product-state-contract.md), со ссылкой на исходное знание вместо независимой копии факта.

Сохранять provenance; различать fact / observation / interpretation / hypothesis. Принципы происхождения описаны в [Root Architecture](01-root-architecture.md), минимальные границы claims — в [Claims Policy](../../system/claims-policy.md). Окончательная provenance schema и полный scientific/medical claims framework утверждаются отдельно.

## Lifecycle

```text
draft
review
approved
deprecated
```

Только approved knowledge в будущем может по умолчанию попадать в production RAG. Draft/review нельзя индексировать как production-approved; deprecated не является approved. Этот checkpoint не задаёт workflow автоматического утверждения.

## RAG projection

RAG — производная retrieval projection approved Knowledge, а не третья вручную поддерживаемая копия продукта. Утверждённый [RAG Contract v1.0](05-rag-contract.md) определяет computed eligibility и serving отдельно от approval. Canonical HYPOTHESIS исключена из production v1.0; generated RAG files и runtime сейчас не создаются. Measurement/form/purchase semantics выше сохраняются; текущие purchasable options и budget fit требуют актуальной Product Domain validation.
