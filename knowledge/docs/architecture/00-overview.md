# Knowledge Architecture Checkpoint v0.1

## Назначение и статус

M1.2 (2026-11-12) материализует [Music Production Contract v1.0](06-music-production-contract.md), [policies и шесть шаблонов](../../music/README.md), добавляет ADR-018–023. Это ограниченное новое разрешение поверх исторического checkpoint: музыкальные Markdown/YAML templates и контракты допустимы, formal machine schemas, реальные instances, runtime и M2–M4 не разрешены. Для M1.2 self-review дополнительно проверяет шестой контракт, music tree и 23 ADR; прежние критерии ниже описывают базовый checkpoint.

Checkpoint материализует четыре уже утверждённых контракта. Основание — задание пользователя Knowledge Architecture Checkpoint v0.1; дата фиксации — 2026-10-31. Документы описывают архитектуру, а не реализованный runtime или наполненную базу знаний.

Patch v0.1.1 (2026-10-31) материализует семь [system documents](../../README.md), закрывает State ↔ moods и canonical Product identity, добавляет ADR-011/012. Четыре контракта остаются базовой линией v1.0 с этими уточнениями; архитектура не перепроектируется.

Patch v0.1.2 (2026-10-31) уточняет Product Measurement & Commercial Form: исправляет SKU-пример, разделяет Knowledge identity, product_form, measurement_model, purchase_unit и operational weightByUnit. ADR-012 уточнён, ADR-013 добавлен. Код и Product Domain не меняются.

RAG Contract v1.0 materialization (2026-10-31) фиксирует решения Q1–Q6 после research, добавляет пятый контракт, четыре [rag support documents](../../rag/README.md) и ADR-014–017. Это последний архитектурный шаг текущей сессии; runtime и следующий Recommendation Contract не создаются.

| Контракт | Версия | Документ |
| --- | --- | --- |
| Root Architecture | v1.0 | [01-root-architecture.md](01-root-architecture.md) |
| State Contract | v1.0 | [02-state-contract.md](02-state-contract.md) |
| Product Contract | v1.0 | [03-product-contract.md](03-product-contract.md) |
| Product × State Contract | v1.0 | [04-product-state-contract.md](04-product-state-contract.md) |
| RAG Contract | v1.0 | [05-rag-contract.md](05-rag-contract.md) |

Решения зафиксированы в [decisions.md](decisions.md), правила изменения — в [локальном AGENTS.md](../../AGENTS.md). Действуют также [корневые инструкции проекта](../../../AGENTS.md), в частности Product Domain Model v0.1. Этот checkpoint их не изменяет.

## Границы репозитория

```text
sc_new_stack/
├── frontend/     пользовательский интерфейс Next.js
├── backend/      заглушка будущего PHP API, серверной реализации пока нет
├── knowledge/    знания бренда и предметной области
└── docs/         общая документация разработки
```

Knowledge Domain изолирован от runtime: никаких imports, API, build hooks, runtime storage или интеграции с frontend/backend на этом этапе. Пустые каталоги сохраняются через `.gitkeep`, без фиктивных данных.

Разделение ответственности: Product Domain владеет operational data; Product Knowledge — устойчивыми знаниями; Product × State — утверждаемой интерпретацией этих знаний для State; RAG — производной retrieval projection. Его контракт материализован, runtime ещё не реализован. rag/ содержит support rules/vocabulary, не generated business knowledge.

## Что не входит в checkpoint

Не наполнять 11 States философией, не создавать каталоги конкретных чаёв и не распределять продукты по States. Не менять Product Domain Model, frontend, backend или runtime. Не реализовывать AI chat, recommendation engine, RAG, parser/chunker, embeddings, retrieval API, AI endpoints или generated RAG files. Не выбирать vector DB и embedding model. Не писать production schemas, не устанавливать зависимости и не «улучшать» утверждённую архитектуру самостоятельно.

Будущие деревья сущностей в контрактах — документация, а не требование создать эти файлы сейчас.

## Решения, закрытые Patch v0.1.1

State — каноническая Knowledge ontology; approved Product × State relation — Source of Truth назначения продукта State. `Product.moods` — application projection/mapping, без независимой Mood ontology и без переименования application field. Формат UI и необходимость будущего mapping описаны в [State System](../../system/state-system.md). Правила Tea (1–3 Mood), Ceramics (без Mood) и независимость Mood от Taste сохраняются.

Knowledge Product имеет собственный стабильный `canonical_product_id`, независимый от SKU/slug. Контракт identity определён в [Product Contract](03-product-contract.md), решение — ADR-012. Конкретные IDs и runtime mapping сейчас не создаются.

## Отложенные решения

RAG Contract v1.0 утверждён и материализован; schemas, полный scientific/medical claims framework, editorial workflow и implementation infrastructure остаются будущими задачами. Минимальные логические provenance/document approval правила заданы [контрактом](05-rag-contract.md); [claims-policy](../../system/claims-policy.md) сохраняет свой scope. Backend/API и integration DTO неизвестны. Mapping canonical_product_id → Product Domain references и State → moods, runtime synchronization и возможное переименование moods требуют отдельного этапа. Recommendation Contract не начинается в рамках этой материализации.

## Решения Q1–Q6 — RAG Contract v1.0

Approval относится к canonical document revision, отдельно от entity lifecycle. Eligibility computed; publication_hold только veto. Approved, eligible, indexed и served различаются. Canonical hypotheses и prohibited claims исключены из production RAG v1.0. Recommendation bundle требует завершённой boundary review, но reviewed — none identified допустимо. Parent/context expansion восстанавливает required boundaries без повторной similarity competition. Публикация идёт согласованными snapshot generations; revoked/deprecated/hold блокируют serving независимо от физического удаления из индекса.

## SKU contradiction resolved — Patch v0.1.2

Один Product имеет один SKU независимо от выбранного веса; разрешённые весовые варианты задаются Product Domain через механизм weightByUnit. Прежняя неоднозначная иллюстрация SKU[] заменена в [Product Contract](03-product-contract.md). Measurement semantics и purchase unit различаются; fixed weight не разрешает произвольное дробление. Product form не равен Knowledge identity, но существенное влияние формы на знания требует явного решения о самостоятельной entity. Это уточнение документации, не Product Domain migration; вопрос SKU по фасовкам закрыт в рамках текущей модели.

## Self-review checkpoint

При проверке сверить структуру с [README](../../README.md), наличие пяти контрактов, семи system files, четырёх rag support documents и семнадцати ADR, внутренние ссылки и локальные MUST / MUST NOT / ESCALATE правила. Проверить удаление system/rag placeholders при сохранении остальных, отсутствие независимой Mood ontology и открытых формулировок по закрытым решениям. Убедиться, что SKU не размножается по весам, measurement_model и purchase_unit независимы, product_form не заменяет identity, fixed weight не трактуется как доступная фасовка и operational truth не продублирован. State lifecycle не подменяет document approval; eligibility/indexed/served различаются. Boundary review может завершиться без выявленных ограничений; UNKNOWN не становится FALSE. Проверить constraints/parent expansion, scope separation, provenance и versioning по [RAG acceptance criteria](05-rag-contract.md). Конкретные instances, schemas, Recommendation Contract и runtime не созданы. Вне knowledge/ изменений быть не должно; зависимости без изменений.
