# Root Architecture v1.0

Статус: утверждённый контракт, зафиксированный в [checkpoint v0.1](00-overview.md).

## Knowledge Layer

**Что система знает?**

Слой включает философию бренда, [States](02-state-contract.md), [Products](03-product-contract.md), [Product × State](04-product-state-contract.md), sensory knowledge, contexts, provenance, claims, content/music/visual knowledge.

Это канонические source-controlled знания. Operational-модель продукта остаётся отдельным источником истины; Knowledge не хранит её динамические данные как второй Source of Truth.

Уточнение Patch v0.1.1: State — canonical Knowledge ontology, approved Product × State — Source of Truth назначения, `Product.moods` — application projection без независимой Mood ontology. Knowledge Product identity — собственный `canonical_product_id`, не SKU/slug. Общие [State](../../system/state-system.md), [Product × State](../../system/product-state-model.md), [content](../../system/content-system.md), [music](../../system/music-system.md), [visual](../../system/visual-system.md) и [terminology](../../system/terminology.md) contracts каноничны для state-specific знаний. Runtime mapping не реализуется.

## Reasoning Layer

**Как система рассуждает на основании утверждённых знаний?**

Будущий pipeline, только концептуально:

```text
User message
→ Explicit Facts
→ Intent
→ Context
→ Derived Signals
→ Soft Hypotheses + confidence + evidence
→ State Mapping
→ Product Candidates
→ Constraints
→ Conflict Detection
→ Information Sufficiency
→ Question OR Ranking
→ Recommendation
```

> Не классифицируй человека. Понимай ситуацию.

| Класс сигнала | Значение |
| --- | --- |
| Hard / Explicit Signal | То, что пользователь сообщил непосредственно |
| Derived Signal | Логическое следствие из контекста |
| Soft Hypothesis | Вероятностное предположение с confidence и evidence |

Soft hypothesis никогда не становится фактом автоматически и не может самостоятельно исключать продукт. Чем сильнее предположение влияет на рекомендацию, тем выше необходимость подтвердить его вопросом.

Например, «Нужно всю ночь писать диплом» может дать:

```text
Explicit: writing; thesis; all-night context
Derived: prolonged intellectual work; nighttime context
Likely States: concentration; energy
Soft hypotheses: possible educational/student context; possible price sensitivity
```

Это иллюстрация рассуждения, не запись Knowledge или готовая рекомендация. Нельзя выводить `user_is_student = true`, `user_has_low_budget = true` или автоматически исключать дорогие продукты. Цена уточняется либо используется как динамический ranking factor при достаточных основаниях; актуальные значения поступают из Product Domain/backend.

## Experience Layer

**Как пользователь взаимодействует с системой?**

В перспективе сюда относятся State filters, state icons, product pages, AI chat, music integration, content integration и state identity. Сейчас это только архитектурная граница: интерфейсы и интеграции не реализуются.

## RAG: retrieval projection и утверждённый контракт

RAG не является параллельной вручную поддерживаемой базой знаний. Он является **retrieval projection** утверждённой Knowledge Base.

Предпочтительное направление будущего pipeline:

```text
Knowledge Markdown
→ validation
→ approved knowledge
→ parser/chunker
→ RAG documents
→ metadata
→ index
```

По умолчанию в production RAG может попадать только approved knowledge; draft/review не являются production-approved. RAG не становится источником текущих цен, stock или availability.

Утверждённый [RAG Contract v1.0](05-rag-contract.md) материализует eligibility, semantic units, metadata, scopes, completeness и publication/revocation. [rag/](../../rag/README.md) содержит поддерживающие правила и vocabulary, не generated Knowledge. Сейчас не создавать vector DB, embeddings, chunker, parser, retrieval API, AI endpoints, generated RAG files или RAG dependencies.

## Provenance

Knowledge System должна в будущем различать источники, например: manufacturer documentation, supplier statement, internal tasting, scientific source, historical source, brand interpretation.

Происхождение знания сохраняется так, чтобы будущий AI мог отличить подтверждённый факт, внутреннее наблюдение, брендовую интерпретацию и гипотезу. Минимальные логические provenance правила заданы [RAG Contract](05-rag-contract.md); окончательная machine schema остаётся отдельной задачей. Canonical HYPOTHESIS сохраняется, но исключена из production RAG v1.0.

## Claims

Необходимо различать:

```text
SUPPORTED
BRAND INTERPRETATION
UNSUPPORTED / PROHIBITED
```

Субъективное State-позиционирование нельзя превращать в scientific/medical fact или медицинское обещание. «Воспринимается как согревающий» не равно «повышает температуру тела». Это пример границы формулировок, не утверждение об эффекте конкретного продукта.

В Patch v0.1.1 материализована минимальная [Claims Policy](../../system/claims-policy.md). Полный scientific/medical claims framework остаётся за пределами текущего этапа.
