# Architecture Decisions

Журнал утверждённых решений Knowledge Architecture Checkpoint v0.1. Статус всех записей: **принято**. Дата фиксации: 2026-10-31. Основание — утверждённые пользователем контракты, перечисленные в [обзоре](00-overview.md). Записи документируют решения, не разрешая реализацию будущих этапов.

Patch v0.1.1 от 2026-10-31 добавляет ADR-011 и ADR-012; ADR-001–ADR-010 сохраняют базовую линию. Материализация семи system documents — выполнение уже утверждённых contracts, не отдельное новое архитектурное решение. Patch v0.1.2 от 2026-10-31 уточняет ADR-012, устраняет неоднозначный SKU-пример и добавляет ADR-013; Product Domain не меняется.

RAG Contract v1.0 materialization от 2026-10-31 фиксирует принятые после research решения Q1–Q6 и ADR-014–ADR-017. ADR-014 уточняет уже принятую основу ADR-005 в части rebuildability/generated artifacts; не создаёт конкурирующее решение. Все записи документируют архитектуру, не разрешая runtime или следующий этап.

## ADR-001 — State как центральная сущность

- **Decision:** State является центральной сущностью state-based контентной и рекомендательной системы.
- **Reason:** Состояние объединяет семантику, контент и интерпретацию продуктов в концепции бренда.
- **Consequences:** State имеет самостоятельную identity и lifecycle; изменение онтологии требует явного согласования. См. [State Contract](02-state-contract.md).

## ADR-002 — Разделение Product Domain и Product Knowledge

- **Decision:** Product Domain и Product Knowledge разделены.
- **Reason:** Operational-модель и устойчивые знания имеют разные обязанности и характер изменений.
- **Consequences:** Knowledge не переопределяет коммерческую модель; будущая интеграция требует подтверждённого mapping. См. [Product Contract](03-product-contract.md).

## ADR-003 — Один источник operational truth

- **Decision:** Operational data не дублируются в Knowledge Base как Source of Truth.
- **Reason:** Цена, stock, discounts и availability изменяются и принадлежат Product Domain/backend.
- **Consequences:** Будущий AI получает актуальные коммерческие данные из operational-источника, не из RAG Markdown. См. [Product Contract](03-product-contract.md).

## ADR-004 — Самостоятельная Product × State relation

- **Decision:** Product × State является самостоятельной relation entity.
- **Reason:** Интерпретация соответствия State требует собственного обоснования, evidence и утверждения.
- **Consequences:** Relation имеет status/version, strength и confidence; связь не гарантирует наступление состояния. См. [Product × State Contract](04-product-state-contract.md).

## ADR-005 — RAG как projection

- **Decision:** RAG является retrieval projection утверждённой Knowledge Base.
- **Reason:** Ручное ведение параллельной базы создаёт конкурирующие источники знаний.
- **Consequences:** Production RAG использует только approved knowledge после остальных eligibility checks. На этапе checkpoint полный контракт и pipeline откладывались; теперь [RAG Contract v1.0](05-rag-contract.md) материализован, runtime pipeline по-прежнему не реализуется. Основа решения сохраняется; rebuildability/artifact ownership уточнены ADR-014.

## ADR-006 — Однократное хранение фактов

- **Decision:** Facts хранятся один раз и интерпретируются многократно.
- **Reason:** Один продукт может иметь разные State-specific интерпретации одного факта.
- **Consequences:** Fact хранится в Product Knowledge, его значение для State — в relation с cross-reference. См. [Product Contract](03-product-contract.md).

## ADR-007 — UNKNOWN сохраняется

- **Decision:** UNKNOWN не заменяется догадкой; UNKNOWN ≠ FALSE.
- **Reason:** Отсутствие знания не доказывает отрицание и не подтверждает предположение.
- **Consequences:** Пробелы сохраняются явно неизвестными, без выдуманного наполнения. См. [Product Contract](03-product-contract.md).

## ADR-008 — Soft hypotheses не являются фактами о пользователе

- **Decision:** Soft hypotheses не являются фактами о пользователе.
- **Reason:** Косвенный контекст не подтверждает личные характеристики или бюджет.
- **Consequences:** Гипотезы имеют confidence/evidence, самостоятельно не исключают продукт; сильное влияние требует уточнения вопросом. См. [Root Architecture](01-root-architecture.md).

## ADR-009 — Полнота State identity

- **Decision:** State identity включает в перспективе philosophy + semantics + content + music + visual + recommendation logic.
- **Reason:** State — самостоятельная брендовая сущность с целостным смыслом и опытом взаимодействия.
- **Consequences:** Будущая структура State предусматривает эти направления; сейчас содержимое и интерфейсы не создаются. См. [State Contract](02-state-contract.md).

## ADR-010 — Knowledge Domain внутри репозитория, вне runtime

- **Decision:** Knowledge Domain находится внутри `sc_new_stack/knowledge/`, но на текущем этапе изолирован от runtime integration.
- **Reason:** Source control позволяет фиксировать каноническую архитектуру до реализации интеграций.
- **Consequences:** Checkpoint добавляет только Knowledge-документы и пустые каталоги; frontend/backend, API и зависимости не меняются. См. [обзор](00-overview.md).

## ADR-011 — State is canonical; moods is application projection

- **Decision:** State является канонической ontology entity. `Product.moods` — application-level projection/mapping approved Product × State relations; approved relation является Source of Truth назначения.
- **Reason:** Избежать двух конкурирующих онтологий State/Mood.
- **Consequences:** Knowledge определяет semantic relation; application может использовать moods для UI/фильтрации без копирования rationale/evidence/confidence/strength/use cases/boundaries/provenance. Runtime synchronization и конкретный mapping проектируются отдельно; moods пока не переименовывается. См. [State System](../../system/state-system.md).

## ADR-012 — Knowledge uses canonical_product_id

- **Decision:** Knowledge Product получает собственный стабильный `canonical_product_id`, идентифицирующий самостоятельный предмет знания, не SKU, весовую опцию, URL или marketing variation. Уточнено в Patch v0.1.2.
- **Reason:** Отделить identity предмета знания от коммерческого SKU и routing slug; не привязывать relations к изменяемым URL или ассортименту SKU.
- **Consequences:** Один весовой Product имеет один SKU и несколько разрешённых Product Domain weightByUnit; варианты веса сами по себе не создают новые Knowledge identities. Fixed-weight продукт также имеет Knowledge identity на уровне самостоятельного предмета знания. Изменение slug не ломает Knowledge relations. ID уникален, lowercase, machine-safe, human-readable где разумно и практически immutable после утверждения. Mapping с Product Domain остаётся будущей задачей, uid может быть mapping target; runtime table не создаётся. См. [Product Contract](03-product-contract.md).

## ADR-013 — Product measurement semantics are distinct from product identity

- **Decision:** Knowledge Architecture различает `canonical_product_id`, `product_form`, `measurement_model` и `purchase_unit`; operational purchase configuration и weightByUnit остаются в Product Domain.
- **Reason:** Корректно различать весовые продукты, продукты фиксированного веса, товары в штуках и наборы, не смешивая их с Knowledge identity или SKU и не сливая measurement/purchase semantics в один enum.
- **Consequences:** Весовые варианты сами по себе не создают отдельные Knowledge Products. Fixed weight не означает variable-weight availability. Будущий Recommendation Engine проверяет Product Domain для реальных purchasable options; budget reasoning учитывает measurement semantics и не изобретает дробление готовой единицы. Product Knowledge не становится вторым operational catalog. Существенное влияние формы на знания требует явного решения об объединении/разделении entity. См. [Product Contract](03-product-contract.md).

## ADR-014 — RAG is a derived projection of canonical Knowledge

- **Decision:** RAG — производная projection, не Source of Truth; индекс полностью логически rebuildable из canonical snapshot и projection rules.
- **Reason:** Индексная инфраструктура и generated content не должны становиться параллельной вручную поддерживаемой базой истины.
- **Consequences:** Generated documents/chunks/embeddings/index generations не являются canonical Knowledge, не ведутся вручную внутри knowledge дерева; storage/deployment определяется позже. Поддерживающие rules/vocabulary материализованы в rag/, runtime отсутствует. См. [RAG Contract](05-rag-contract.md).

## ADR-015 — Retrieval eligibility is computed and serving is independently revocable

- **Decision:** Approved ≠ eligible ≠ indexed ≠ served. Eligibility computed для scope; publication_hold только veto. Deprecated/revoked/hold немедленно запрещают serving независимо от физической записи.
- **Reason:** Approval не гарантирует scope/provenance/claims/completeness, а физическое удаление из индекса не должно быть условием отзыва допуска.
- **Consequences:** Document revision approval отделён от entity lifecycle; содержательная revision не наследует старое approval автоматически. Публикация использует snapshot generations, актуальные checks и объяснимые причины. Canonical hypotheses и prohibited claims исключены из production v1.0, положительный override запрещён. См. [RAG Contract](05-rag-contract.md).

## ADR-016 — Recommendation retrieval requires boundary-complete context

- **Decision:** Product × State как достаточное основание recommendation требует complete approved bundle и завершённой boundary review; хотя бы один actual boundary не требуется.
- **Reason:** Отсутствие данных не означает отсутствие ограничений, но обязательное выдумывание boundary также нарушает UNKNOWN ≠ FALSE.
- **Consequences:** Различаются not reviewed / reviewed — none identified / reviewed — boundaries present. Parent и required dependencies относятся к согласованным approved revisions; incomplete bundle не используется как достаточное основание. См. [RAG Contract](05-rag-contract.md).

## ADR-017 — RAG uses semantic units with parent/context expansion

- **Decision:** Semantic units не равны автоматически Markdown files/paragraphs. Children могут находиться search, но обязательный parent/context восстанавливается до использования.
- **Reason:** Изолированный rationale без conditions, evidence и boundaries создаёт ложное безусловное утверждение.
- **Consequences:** Boundaries/constraints загружаются по canonical references без повторной similarity competition; eligibility и scopes применяются ко всему expansion. AI-generated parent summaries не требуются v1.0. См. [RAG Contract](05-rag-contract.md).
