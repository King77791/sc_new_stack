# Claims Policy

Минимальный утверждённый общесистемный claims contract, материализованный в Patch v0.1.1. Он применяется к system-level и state/product-specific знаниям, relations и их будущим content/AI explanations. Основа — [Root Architecture](../docs/architecture/01-root-architecture.md).

Различать категории claims:

```text
SUPPORTED
BRAND INTERPRETATION
UNSUPPORTED / PROHIBITED
```

Также различать epistemic nature утверждения:

```text
FACT
OBSERVATION
INTERPRETATION
HYPOTHESIS
```

Это различения по смыслу, а не новая production metadata schema или автоматическое правило присвоения статусов. Значения терминов определены в [terminology](terminology.md). Provenance сохраняет происхождение и основание знания; его окончательная schema утверждается отдельно.

State-позиционирование нельзя превращать в медицинское обещание или научно подтверждённый эффект. Формулировка «в нашей дегустационной модели воспринимается как согревающий» не эквивалентна «повышает температуру тела». Это иллюстрация границы, не готовое утверждение о конкретном продукте и не разрешение выдумывать наблюдение.

Особенно осторожно относиться к `immunity`, `sleep`, physiological effects и health-related wording. Наличие State ID не доказывает health effect. Не придумывать медицинские доказательства; при недостаточном основании останавливать зависимое утверждение согласно [AGENTS](../AGENTS.md).

Полный scientific/medical claims framework сейчас не проектируется. Policy не добавляет медицинских фактов, системы доказательных порогов или новых схем.

## Production RAG v1.0

[RAG Contract v1.0](../docs/architecture/05-rag-contract.md) исключает canonical HYPOTHESIS и UNSUPPORTED / PROHIBITED claims из production retrieval. Approval не превращает гипотезу в FACT. SUPPORTED проходит остальные eligibility checks; BRAND INTERPRETATION (обозначается также BRAND_INTERPRETATION в logical metadata) сохраняет interpretation framing/context.

Извлекаются утверждённые safety rules, а не самостоятельные prohibited claim units. Примеры запрещённого wording остаются в canonical policy context и не выделяются в searchable positive claims. Отдельный safety vector index не создаётся; metadata filter не является разрешением индексировать запрещённое утверждение как обычное знание. Runtime и machine schemas в рамках материализации отсутствуют.
