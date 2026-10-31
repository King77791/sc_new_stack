# Product × State Contract v1.0

Статус: утверждённый контракт в рамках [checkpoint v0.1](00-overview.md).

Product × State — самостоятельная утверждаемая интерпретационная связь между характеристиками продукта, характером его употребления и State в онтологии «Столицы чая». Это не утверждение, что чай гарантированно вызывает состояние.

Факты принадлежат [Product Knowledge](03-product-contract.md); сущность и семантика State — [State Contract](02-state-contract.md). Relation хранит обоснование их связи, не дублируя canonical facts.

## Будущая структура

```text
states/{state_id}/products/{product_id}/
├── README.md
├── rationale.md
├── evidence.md
├── use-cases.md
├── boundaries.md
├── comparisons.md
└── content.md
```

Структура только документируется. Конкретные relations и назначения продуктов States сейчас не создаются.

## Содержание relation

Relation должна поддерживать `product`, `state`, `strength`, `confidence`, `status`, `version`, `related states`, rationale, evidence, use cases, boundaries, comparisons, content implications и cross-state relations. Product адресуется собственным [canonical_product_id](03-product-contract.md), State — canonical State ID. `{product_id}` в Knowledge paths означает `canonical_product_id`; техническая production schema не определяется. Общесистемные правила — в [Product × State Model](../../system/product-state-model.md).

Strength:

```text
primary
secondary
supporting
```

`strength` — значимость State для продукта. `confidence` — уверенность в обоснованности самой связи. Их нельзя смешивать; шкала confidence и числовые значения здесь не задаются.

Reason dimensions могут включать composition, sensory, brewing, experience, context, brand interpretation.

## Evidence

| Уровень | Epistemic status |
| --- | --- |
| A | externally supported |
| B | internally observed |
| C | reasoned interpretation |
| D | exploratory hypothesis |

Это epistemic status, а не абсолютная шкала истинности. Сохранять provenance и различать происхождение утверждений. Evidence level не подменяет strength, confidence или lifecycle approval.

Концептуальная цепочка:

```text
FACT
→ OBSERVATION
→ INTERPRETATION
→ RECOMMENDATION
```

Интерпретацию или гипотезу нельзя превращать в подтверждённый scientific/medical fact. Действуют [границы claims](01-root-architecture.md).

## Use cases и boundaries

Use cases различаются как `strong`, `conditional`, `poor`. Boundaries должны описывать, когда связь не следует переоценивать или использовать как единственное основание рекомендации.

Согласно [RAG Contract v1.0](05-rag-contract.md), для relation как достаточного основания recommendation обязательна завершённая boundary review, а не обязательный actual boundary. Not reviewed отличается от reviewed — none identified и reviewed — boundaries present. Parent и required rationale/evidence/use-case/context references образуют согласованный approved комплект revisions. Выявленные boundaries загружаются по references без повторной similarity competition; incomplete bundle не становится достаточным основанием.

Cross-State relations в будущем должны позволять описывать не только список других States продукта, но и характер их сочетания. Конкретная schema сочетаний не утверждена.

## Brand policy

```text
maximum states per product = 3
```

Это текущая brand policy, а не вечное ограничение архитектуры. Нельзя самостоятельно назначать продукту новые States или превышать лимит без согласования. Если продукт потенциально требует >3 States, остановить зависимое изменение и запросить решение. Policy не отменяет текущих Product Domain Mood rules.

## Application projection — уточнение Patch v0.1.1

Approved Product × State relation — Source of Truth назначения. Направление: Knowledge State + approved Product × State → application projection/mapping → Product.moods. State является канонической Knowledge ontology; `moods` не образует независимую онтологию и не переименовывается сейчас. Rationale, evidence, confidence, strength, use cases, boundaries и provenance остаются в Knowledge Domain. Прямое редактирование moods не создаёт утверждённой relation. См. [State System](../../system/state-system.md) и [ADR-011](decisions.md).

Runtime synchronization, mapping table и конкретные назначения в patch не реализуются.

## Lifecycle

```text
draft
review
approved
deprecated
```

Draft/review relation не является production-approved knowledge. Status и version сохраняются вместе с cross-references; автоматическое присвоение approved этим контрактом не разрешается.
