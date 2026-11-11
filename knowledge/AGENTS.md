# AGENTS.md — Knowledge Domain

## Область действия и источники

Инструкции действуют во всём `knowledge/`, если более глубокий `AGENTS.md` в будущем явно не переопределяет правила. Также действуют [корневые инструкции](../AGENTS.md). Это локальный контракт Knowledge Domain, не изменение Product Domain Model или runtime архитектуры.

Перед изменением читать [обзор](docs/architecture/00-overview.md), [Root Architecture v1.0](docs/architecture/01-root-architecture.md) и соответствующие [State](docs/architecture/02-state-contract.md), [Product](docs/architecture/03-product-contract.md), [Product × State](docs/architecture/04-product-state-contract.md) contracts. Учитывать [Architecture Decisions](docs/architecture/decisions.md).

Для projection/retrieval читать утверждённый [RAG Contract v1.0](docs/architecture/05-rag-contract.md) и [rag support documents](rag/README.md). Текущее явное задание разрешает их архитектурную материализацию и согласованные cross-reference/ADR/AGENTS updates. Прежние ограничения checkpoint на проектирование RAG относились к предыдущему scope; runtime, schemas и следующий Recommendation Contract по-прежнему не разрешены. На этом архитектурный этап завершается.

Patch v0.1.1 явно разрешает материализацию `system/` и согласованные уточнения контрактов по State ↔ moods и canonical Product identity; это не разрешение менять application code или проектировать RAG. [State System](system/state-system.md), [Product × State Model](system/product-state-model.md), [Content System](system/content-system.md), [Music System](system/music-system.md), [Visual System](system/visual-system.md), [Claims Policy](system/claims-policy.md) и [Terminology](system/terminology.md) — канонические общесистемные правила. Читать применимые system documents до редактирования Knowledge; state-specific files подчиняются system-level contracts.

Patch v0.1.2 разрешает узкое уточнение Product measurement/commercial form и исправление SKU-примера в Knowledge-документации. [Product Contract](docs/architecture/03-product-contract.md) различает canonical_product_id, product_form, measurement_model, purchase_unit и operational weightByUnit. Это conceptual boundary, не новая schema, Product Domain migration или runtime integration.

## MUST

M1.2 (2026-11-12) явно разрешает [Music Production Contract](docs/architecture/06-music-production-contract.md), policies и шесть незаполненных Markdown/YAML templates в [music/](music/README.md), placeholders и согласованные navigation/ADR updates. Это ограниченное исключение прежних запретов schemas/editorial workflow только для музыкальных контрактов и шаблонов, не formal machine schemas или реальные instances. State/Product/relation instances, наполненные presets/jobs/tracks/playlists, M2–M4, runtime и Recommendation Contract по-прежнему запрещены. QC, artistic approval и publication clearance независимы и привязаны к exact revisions. Codex не присваивает художественное или юридическое approval. Production records не получают автоматического RAG допуска; types/scopes не расширяются. Остальные MUST/MUST NOT сохраняются.

- Сохранять утверждённую архитектуру и границы Knowledge / Reasoning / Experience.
- Читать соответствующие contracts перед изменением Knowledge.
- Сохранять provenance; различать fact / observation / interpretation / hypothesis.
- Сохранять UNKNOWN как unknown: UNKNOWN ≠ FALSE, отсутствие знания не заполняется догадкой.
- Использовать стабильные canonical IDs. Knowledge Product identity — собственный `canonical_product_id`, практически immutable после утверждения; не придумывать конкретный ID без основания и не подменять его SKU/slug без отдельного решения.
- Сохранять State как canonical ontology; `Product.moods` — application projection approved Product × State, не независимая Mood ontology и не источник назначения.
- Учитывать широкие последствия изменений `content-system.md`, `music-system.md`, `visual-system.md`, `claims-policy.md`, `terminology.md`; не менять их случайно ради одного State/Product.
- Уважать lifecycle/status и version: State — draft/active/deprecated; Product Knowledge и relation — draft/review/approved/deprecated.
- Минимизировать дублирование: Store facts once. Interpret them many times. Факты — в Product Knowledge, State-specific интерпретации — в relation.
- Сохранять cross-references между State, Product Knowledge, relation и источниками.
- Сообщать о противоречиях вместо самостоятельного разрешения архитектурных конфликтов.
- Сохранять изоляцию от runtime в рамках текущего checkpoint.

## MUST NOT

- Самостоятельно создавать новые States: это изменение онтологии с явным согласованием.
- Самостоятельно присваивать Product новые States.
- Создавать новые Product × State назначения через прямое редактирование `moods`, независимую Mood ontology или переименование `moods` в `states` без отдельного migration decision.
- Превышать текущий лимит 3 States на продукт без согласования; это policy, не вечное ограничение архитектуры.
- Выдумывать отсутствующие сведения или фиктивные факты ради наполнения каталогов.
- Копировать dynamic Product Domain data как Knowledge Source of Truth, включая цену, stock, discount, доступные веса и SKU availability.
- Считать RAG самостоятельной вручную поддерживаемой Knowledge Base.
- Индексировать draft/review/deprecated knowledge как обычное production knowledge; approved само по себе не означает eligible/indexed/served.
- Превращать brand interpretation в scientific/medical fact или обещание гарантированного State-эффекта.
- Автоматически выводить личные характеристики пользователя из косвенного контекста. Soft hypotheses требуют confidence/evidence, не становятся фактами и самостоятельно не исключают продукты.
- Менять contracts без явного задания или молча разрешать открытые архитектурные вопросы.
- Менять frontend/backend в рамках работы над Knowledge Architecture.
- Устанавливать новые зависимости без необходимости и согласования; текущий checkpoint не предусматривает установки зависимостей.
- Реализовывать RAG/recommendation runtime в рамках checkpoint, включая parser/chunker, embeddings, retrieval API, AI endpoints и generated RAG files.
- Создавать production schemas, окончательный scientific/medical claims framework или editorial workflow в рамках текущей материализации. Минимальные логические provenance/approval правила определены RAG Contract; их machine schema остаётся будущей задачей.
- Наполнять конкретные States/Products/relations в рамках архитектурного checkpoint.
- Создавать runtime mapping tables/synchronization в рамках архитектурных patches.
- Создавать отдельный Knowledge Product только из-за другого `weightByUnit`.
- Создавать отдельный SKU для каждого веса вопреки действующему Product Domain: один Product имеет один SKU независимо от фасовки.
- Интерпретировать `fixed_weight` как variable-weight availability или выдумывать возможность покупки части готовой единицы.
- Дублировать актуальные доступные веса Product Domain в Knowledge как Source of Truth или выводить purchasable options только из Knowledge.
- Смешивать `canonical_product_id`, SKU, slug, product_form, measurement_model и purchase_unit либо объединять measurement/purchase semantics в перегруженный sale_model enum.
- Считать RAG Source of Truth или вручную создавать новые facts внутри projection; generated retrieval artifacts не ведутся как canonical knowledge.
- Использовать canonical HYPOTHESIS в production RAG v1.0 или превращать её в FACT после approval.
- Индексировать prohibited claim как обычный production claim; запрещённый wording example не становится самостоятельной positive unit. Не создавать отдельный safety vector index v1.0.
- Считать active State автоматически approved document; approval относится к canonical document revision.
- Вводить положительный eligibility override, обходить publication_hold/revocation/deprecation или выдавать physically indexed за allowed to serve.
- Считать отсутствие boundary доказательством отсутствия ограничений или требовать выдуманный boundary: обязательна завершённая review, включая допустимое reviewed — none identified.
- Обходить необходимую parent/context expansion или повторно ставить обязательные boundaries в similarity top-k competition.
- Выводить Product × State assignment, evidence или изменение strength/confidence из embedding similarity.
- Подтверждать price, availability, доступный вес или budget fit из статического RAG без актуальной Product Domain validation.
- Превращать UNKNOWN в FALSE или смешивать confidence, strength, epistemic status, evidence level, approval и retrieval relevance.
- Создавать runtime/vector DB implementation, State/Product/relation instances или Recommendation Contract без отдельного задания.

## ESCALATE / ASK

Остановить зависимую часть работы, сообщить о проблеме и запросить решение, если:

- требуется новый State;
- Product потенциально требует >3 States;
- источники противоречат друг другу;
- невозможно определить canonical ID;
- новое знание конфликтует с approved knowledge;
- неизвестно, является ли утверждение fact или interpretation;
- изменение требует нарушения утверждённого contract;
- возникает необходимость изменить Product Domain;
- требуется медицинское/физиологическое утверждение без достаточного основания;
- неясно, являются ли две коммерческие формы одним предметом знания;
- физическая форма существенно меняет brewing, sensory profile или experience;
- Product Domain representation противоречит Knowledge semantics;
- невозможно однозначно определить measurement semantics продукта;
- approval source не определён или provenance недостаточен;
- relation bundle incomplete или boundary review не завершён;
- canonical documents конфликтуют или claims classification неясна;
- semantic unit невозможно безопасно отделить от обязательного контекста;
- mapping к Product Domain отсутствует там, где нужен commercial claim.

Не разрешать такие конфликты догадкой, автоматическим назначением State или изменением статуса на approved. Потенциальное улучшение, не входящее в задание, описать в итоговом отчёте как `OPEN QUESTION / POSSIBLE IMPROVEMENT`, без реализации.
