# State System

Канонические общесистемные правила, материализованные в Knowledge Architecture Patch v0.1.1 на основании [State Contract v1.0](../docs/architecture/02-state-contract.md). State-specific файлы подчиняются этим правилам.

State — каноническая сущность Knowledge ontology state-based системы «Управляй состоянием!». Он описывает желаемое или релевантное состояние в рамках брендовой модели. State не является медицинским диагнозом, научным измерением психофизиологического состояния или характеристикой личности пользователя. State Axes — внутренняя брендовая сравнительная модель.

State является центральной сущностью для content, music, visual identity, recommendation, Product × State relations и будущего AI experience.

> Не классифицируй человека. Понимай ситуацию.

## Онтология и lifecycle

Текущие canonical State IDs:

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

Количество States не является вечным hardcoded limit. Новый State требует отдельного согласования ontology change. Наличие State в онтологии не доказывает физиологического эффекта продукта; действуют [claims-policy](claims-policy.md).

Lifecycle:

```text
draft
active
deprecated
```

## State и application moods

**State является канонической Knowledge ontology. `Product.moods` является существующим application-level представлением связей продукта с States.** Отдельная независимая Mood ontology не создаётся.

```text
Knowledge State + approved Product × State
→ application projection / mapping
→ Product.moods
```

Source of Truth назначения — approved Product × State relation. `moods` — упрощённая projection для фильтрации, UI и совместимости с существующей Product Domain Model. Rationale, evidence, confidence, strength, use cases, boundaries и provenance остаются в Knowledge Domain, не дублируются в `moods`.

`moods` сейчас не переименовывается в `states`; возможное переименование требует отдельного Product Domain migration decision. Прямое редактирование `moods` не создаёт утверждённого назначения Product × State. См. [системную модель relations](product-state-model.md) и [ADR-011](../docs/architecture/decisions.md).

## Фактическое представление приложения

В [ProductCard.types.ts](../../frontend/features/product/ProductCard/ProductCard.types.ts) `ProductCardMood` содержит `slug`, `label`, `icon`, `iconWidth`, `iconHeight`; `moods` у Tea — tuple из 1–3 элементов, у Ceramics отсутствует. Это UI presentation inputs, не окончательный Product DTO. [ProductCard](../../frontend/features/product/ProductCard/ProductCard.tsx) использует `mood.slug` для key и ссылки `/catalog/mood/...`. В [fixtures](../../frontend/features/product/ProductCard/product-card.fixtures.ts) присутствуют `energy`, `concentration`, `immunity`, совпадающие с canonical State IDs.

Совпадение отдельных строк не утверждает готовый универсальный mapping. Будущий mapping layer должен сопоставлять canonical State ID с application slug/display metadata; формат остальных данных и runtime synchronization проектируются отдельно. Текущие fixtures не объявляются approved Knowledge. Правила Tea (1–3 Mood), Ceramics (без Mood) и независимость Mood от Taste сохраняются в application model.
