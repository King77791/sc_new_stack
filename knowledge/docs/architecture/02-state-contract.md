# State Contract v1.0

Статус: утверждённый контракт в рамках [checkpoint v0.1](00-overview.md).

State — самостоятельная доменная сущность, центральная для state-based контентной и рекомендательной системы. Его identity не сводится к подписи фильтра или иконке.

## Текущая онтология

Утверждённые canonical State IDs:

```text
energy
concentration
balance
harmony
immunity
sleep
joy
confidence
intuition
composure
chakras
```

Это текущий набор, а не жёстко зашитое вечное ограничение количества States. Создание нового State — изменение онтологии, требующее явного согласования. Автоматически создавать States запрещено. Наличие ID в онтологии не утверждает медицинских эффектов.

## Будущая структура

```text
states/{state_id}/
├── README.md
├── philosophy.md
├── semantics.md
├── content.md
├── music.md
├── visual.md
├── recommendation.md
└── products/
```

Это документированная структура будущего наполнения. В checkpoint каталоги конкретных States и их содержание не создаются.

## Содержание State

В перспективе State должен описывать:

- identity: id, name, status, version;
- essence, philosophy, emotional transition;
- semantics: what it is, what it is not;
- related states, differences from neighboring states, compatibility, conflicts;
- State Axes;
- recommendation signals: strong signals, possible signals, weak signals, anti-signals;
- contexts;
- content identity, music identity, visual identity;
- icon semantics, watermark behavior, motion signature;
- связанные [Product × State relations](04-product-state-contract.md).

State Axes — внутренняя брендовая сравнительная модель, а не научные измерения. Шкалы, значения и production schema здесь не определяются.

## Lifecycle

```text
draft
active
deprecated
```

Статусы State следует отличать от lifecycle Product Knowledge и relation (`draft`, `review`, `approved`, `deprecated`). Автоматические переходы и технические форматы метаданных этим контрактом не задаются.

Для retrieval действует [RAG Contract v1.0](05-rag-contract.md): active State не утверждает документы. Approval относится к canonical document revision; eligibility вычисляется отдельно. Типизированные State relations сохраняются без автоматического вывода conflicts, symmetry или transitivity.

Использовать стабильные canonical IDs, сохранять version/status и cross-references. Противоречия в семантике соседних States требуют решения, а не самостоятельного изменения онтологии.

## Уточнение Patch v0.1.1 — State ↔ moods

State является канонической Knowledge ontology. `Product.moods` — существующее application-level представление связей продукта с States. Source of Truth назначения — approved Product × State relation; отдельная независимая Mood ontology не создаётся. Направление: Knowledge State + approved relation → application projection/mapping → Product.moods.

Rationale, evidence, confidence, strength, use cases, boundaries и provenance остаются в Knowledge Domain. Прямое редактирование moods не создаёт утверждённого назначения. `moods` не переименовывается; возможная миграция — отдельное решение. Фактический UI формат и необходимость будущего mapping описаны в [State System](../../system/state-system.md), решение — [ADR-011](decisions.md).

State-specific файлы подчиняются общим [Content](../../system/content-system.md), [Music](../../system/music-system.md), [Visual](../../system/visual-system.md) contracts, [Claims Policy](../../system/claims-policy.md) и [Terminology](../../system/terminology.md). Конкретные State directories в patch не создаются.
