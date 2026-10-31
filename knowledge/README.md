# Knowledge System — Столица чая

**Knowledge Architecture Checkpoint v0.1** фиксирует утверждённую архитектуру базы знаний бренда, состояний, продуктов и связей Product × State.

**Knowledge Architecture Patch v0.1.1** материализует общесистемные документы и закрывает решения State ↔ `moods` и `canonical_product_id`, сохраняя четыре базовых контракта и изоляцию от runtime.

**Knowledge Architecture Patch v0.1.2 — Product Measurement & Commercial Form Clarification** отделяет Knowledge identity от product form, measurement model, purchase unit и operational weight options; устраняет неоднозначность SKU-примера без изменения Product Domain.

**RAG Contract v1.0 — Materialization** фиксирует утверждённые решения Q1–Q6, semantic retrieval architecture и supporting rules. Это завершение текущего архитектурного этапа, без runtime и перехода к Recommendation Contract.

`knowledge/` — самостоятельный source-controlled Knowledge Domain внутри `sc_new_stack/`. Он изолирован от runtime приложения. Это не часть frontend, не общая документация разработки, не копия Product Domain, не RAG index, не vector database и не runtime storage.

## Навигация

- [Обзор checkpoint и границы реализации](docs/architecture/00-overview.md)
- [Root Architecture v1.0](docs/architecture/01-root-architecture.md)
- [State Contract v1.0](docs/architecture/02-state-contract.md)
- [Product Contract v1.0](docs/architecture/03-product-contract.md)
- [Product × State Contract v1.0](docs/architecture/04-product-state-contract.md)
- [RAG Contract v1.0](docs/architecture/05-rag-contract.md)
- [RAG projection support](rag/README.md)
- [Architecture Decisions ADR-001–ADR-017](docs/architecture/decisions.md)
- [Локальные инструкции агентам](AGENTS.md)

Канонические общесистемные документы:

- [State System](system/state-system.md)
- [Product × State Model](system/product-state-model.md)
- [Content System](system/content-system.md)
- [Music System — Stolitsa Chaya Sound](system/music-system.md)
- [State Visual System](system/visual-system.md)
- [Claims Policy](system/claims-policy.md)
- [Terminology](system/terminology.md)

## Структура

```text
knowledge/
├── README.md
├── AGENTS.md
├── docs/
│   └── architecture/
│       ├── 00-overview.md
│       ├── 01-root-architecture.md
│       ├── 02-state-contract.md
│       ├── 03-product-contract.md
│       ├── 04-product-state-contract.md
│       ├── 05-rag-contract.md
│       └── decisions.md
├── manifest/
├── system/
│   ├── state-system.md
│   ├── product-state-model.md
│   ├── content-system.md
│   ├── music-system.md
│   ├── visual-system.md
│   ├── claims-policy.md
│   └── terminology.md
├── states/
├── products/
├── recommendation/
├── rag/
│   ├── README.md
│   ├── projection-rules.md
│   ├── knowledge-types.md
│   └── retrieval-scopes.md
├── schemas/
└── experience/
```

Каталоги следуют утверждённой архитектуре: `manifest/` — для будущего manifest, `system/` — системных знаний бренда, `states/` — States и их relations, `products/` — Product Knowledge, `recommendation/` — основ рассуждения, `rag/` — правил/vocabulary/scopes retrieval projection, `schemas/` — отдельно утверждаемых схем, `experience/` — границы пользовательского опыта. В `system/` семь документов, в `rag/` четыре support documents; остальные перечисленные каталоги сохраняют только пустые `.gitkeep`. Конкретные State/Product entities, schemas, generated artifacts и runtime не создаются.

Четыре контракта версии v1.0 документированы в рамках checkpoint v0.1. Версия checkpoint не заменяет версии контрактов. Следующие этапы требуют отдельного задания.

RAG Contract v1.0 добавляет пятый контракт: approved ≠ eligible ≠ indexed ≠ served; active State ≠ approved document. Boundary review обязательна для relation как достаточного основания recommendation, actual boundary не обязателен. Generated retrieval artifacts не являются canonical Knowledge; их storage/deployment остаётся будущей задачей.

State — canonical Knowledge ontology; approved Product × State — источник назначения, `Product.moods` — application projection без переименования. Knowledge Product имеет собственный `canonical_product_id`, не производный автоматически от SKU/slug или выбранного веса. [Product Contract](docs/architecture/03-product-contract.md) различает product_form, measurement_model и purchase_unit: один весовой Product имеет один SKU и разрешённые Product Domain weightByUnit; fixed weight не означает произвольную фасовку. Актуальные purchasable options определяет Product Domain.
