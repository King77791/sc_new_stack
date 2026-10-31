# Product × State Model

Общесистемная модель, материализованная в Patch v0.1.1. Основа — [Product × State Contract v1.0](../docs/architecture/04-product-state-contract.md).

```text
Product
   ↕
Product × State
   ↕
State
```

Product × State — самостоятельная утверждаемая интерпретационная relation entity между характеристиками продукта, характером употребления и State. Связь не гарантирует наступления состояния.

Relation поддерживает product, state, strength, confidence, status, version, rationale, evidence, use cases, boundaries, comparisons, content implications и cross-state relations. Product адресуется через [canonical_product_id](../docs/architecture/03-product-contract.md), State — через canonical State ID. Конкретная production schema не задаётся.

Уточнение v0.1.2: связь адресует самостоятельный предмет знания, не выбранный вес или SKU. Разные weightByUnit одного Product сами по себе не создают новые Knowledge Products/relations. Product form, measurement_model и purchase_unit различаются по [Product Contract](../docs/architecture/03-product-contract.md); актуальные purchasable options и цены берутся из Product Domain. Fixed weight нельзя трактовать как variable-weight availability. Существенное влияние формы на brewing/sensory/experience требует явного решения о Knowledge identity, без автоматического объединения или разделения.

Strength: `primary`, `secondary`, `supporting` — значимость State для продукта. Confidence — уверенность в обоснованности связи; это отдельное понятие, без установленной здесь числовой шкалы.

Lifecycle:

```text
draft
review
approved
deprecated
```

Evidence различает A — externally supported, B — internally observed, C — reasoned interpretation, D — exploratory hypothesis. Это epistemic status, а не абсолютная шкала истинности и не замена approval. Reason dimensions могут включать composition, sensory, brewing, experience, context, brand interpretation.

Use cases различают strong, conditional, poor. Boundaries объясняют, когда связь не следует переоценивать или использовать как единственное основание рекомендации. Cross-state relations описывают в перспективе характер сочетания States, не только их список.

Факты хранятся один раз в Product Knowledge; relation ссылается на них и хранит State-specific интерпретацию. Сохраняются provenance, UNKNOWN ≠ FALSE и [claims-policy](claims-policy.md).

Для retrieval применяется [RAG Contract v1.0](../docs/architecture/05-rag-contract.md): relation как достаточное основание recommendation требует согласованного approved bundle с rationale, evidence, use cases, canonical references и завершённой boundary review. Actual boundary не обязателен: reviewed — none identified допустимо и отличается от not reviewed. Required parent/context и выявленные boundaries загружаются по references, не конкурируя повторно за similarity top-k. Содержательная revision не наследует document approval автоматически; similarity не создаёт assignments.

## Brand policy

```text
maximum states per product = 3
```

Это текущая policy, а не фундаментальное техническое ограничение. Новые назначения требуют согласования; потенциальная потребность в >3 States требует отдельного решения.

## Application projection

```text
approved Product × State
→ application projection / mapping
→ Product.moods
```

Approved relation — Source of Truth назначения, `moods` — упрощённое application-level представление для фильтрации/UI. Rationale, evidence, confidence, strength, use cases, boundaries и provenance не переносятся туда как дублируемый источник знаний. Отдельная Mood ontology не создаётся; `moods` не переименовывается. Фактический формат и необходимость mapping описаны в [State System](state-system.md).

Это контракт направления данных, не реализованная runtime synchronization или mapping table. Не создавать конкретные relations, State/Product directories и runtime integration в рамках patch.
