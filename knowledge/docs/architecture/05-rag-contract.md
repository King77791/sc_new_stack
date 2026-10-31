# RAG Contract v1.0

Статус: **утверждённый архитектурный контракт**. Материализован 2026-10-31 на основании Architecture Research и явных решений Q1–Q6 пользователя. Основа — [Root Architecture](01-root-architecture.md), [State](02-state-contract.md), [Product](03-product-contract.md), [Product × State](04-product-state-contract.md), [Claims Policy](../../system/claims-policy.md) и [Terminology](../../system/terminology.md). Реализация runtime не входит в этот контракт.

## 1. Назначение и источник истины

> RAG извлекает не просто похожий текст, а утверждённую единицу знания вместе с её смыслом, контекстом, статусом, эпистемической природой, provenance, boundaries и отношениями.

```text
Canonical Knowledge
→ approved knowledge
→ eligibility
→ RAG projection
→ index
→ retrieval
→ Reasoning Layer
```

RAG — производная retrieval projection, не Source of Truth. RAG text не становится canonical truth. Индекс должен полностью логически восстанавливаться из canonical Knowledge snapshot и projection rules; удаление индекса не теряет канонических знаний. Projection не добавляет новые facts, provenance, approval или Product × State assignments.

## 2. Scope и non-goals

Контракт определяет eligibility, logical units, knowledge types, scopes, metadata semantics, epistemic metadata, provenance, claims safety, boundaries, parent/child retrieval, State relations, Product × State retrieval, semantic chunking, versioning, publication/revocation, Product Domain boundary, failure behavior, explainability и projection ownership.

Контракт не выбирает vector DB, embedding provider/model, LLM provider, reranker, orchestration framework (включая LangChain/LlamaIndex), token limits, chunk token sizes и overlap constants. Не определяет ranking weights, recommendation scoring, question-selection algorithm, final conflict-resolution algorithm, price scoring или diversity. Backend DTO, runtime API и production deployment architecture остаются отдельными задачами.

Материализация ограничена Markdown-документами. Не создавать schemas, State/Product/relation instances, Recommendation Contract, backend mapping, migrations, dependencies, generated artifacts или retrieval implementation.

## 3. Entity lifecycle и document approval — Q1

Entity lifecycle и document approval — разные измерения:

| Объект | Vocabulary |
| --- | --- |
| State entity lifecycle | draft / active / deprecated |
| Product Knowledge и Product × State lifecycle | draft / review / approved / deprecated |
| Canonical document approval | draft / review / approved / deprecated |

`State.status = active` не означает approved State documents. Статус relation также не утверждает автоматически все её документы. Основная редакционная единица approval v1.0 — **canonical document revision**.

Semantic units утверждённой document revision могут наследовать её approval, если тип знания не требует более строгого правила. Наследование относится к точной revision и не перекрывает более строгие eligibility checks. Содержательно изменённая revision не наследует старое approval автоматически. При нескольких source documents проверяются все необходимые revisions.

Неизвестный approval source не считается approved. Каноничность system document или архитектурного правила не является автоматическим разрешением customer-facing индексации. Полный editorial workflow и алгоритм typo-only vs substantive change не определяются здесь.

## 4. Computed eligibility и publication hold — Q2

Eligibility вычисляется для unit, scope и действующей версии policy; положительный canonical override `retrieval_eligible: true` не допускается.

```text
eligible(unit, scope) =
    approved source knowledge
    AND admissible entity lifecycle
    AND approved applicable relation
    AND allowed epistemic policy
    AND allowed claims policy
    AND sufficient provenance
    AND complete required context
    AND allowed retrieval scope
    AND current published revision
    AND NOT publication_hold
```

Условия relation/entity применяются, когда unit относится к соответствующему типу; brand manifesto не обязан иметь Product × State relation. Eligibility проверяется для всех обязательных зависимостей и при parent/context expansion. Без разрешённого scope или определённого approval/provenance знание не допускается. Причины допуска/отказа и policy version должны быть прослеживаемы.

`publication_hold` — только veto: способен сузить доступ, но никогда не сделать ineligible знание eligible. Удержание parent или обязательной зависимости делает связанный комплект недоступным для использования, требующего этой зависимости.

| Status / condition | Production eligibility |
| --- | --- |
| draft | Нет |
| review | Нет в production RAG v1.0 |
| approved | Потенциально, после остальных checks |
| deprecated / revoked | Не допускается к serving |
| State active без document approval | Недостаточно |
| HYPOTHESIS | Исключено из production RAG v1.0 |
| UNSUPPORTED / PROHIBITED claim | Исключено |
| Недостаточный provenance / обязательный контекст | Нет для соответствующего использования |

## 5. Approved ≠ eligible ≠ indexed ≠ served

| Понятие | Смысл |
| --- | --- |
| Approved | Canonical knowledge прошло утверждение в определённой revision |
| Retrieval eligible | Знание допустимо для конкретного scope по действующим правилам |
| Indexed | Projection revision физически присутствует в index generation |
| Served | Unit разрешена к использованию в текущей выдаче |

Indexed не означает served. Если approved unit ранее была eligible и indexed, новый publication_hold немедленно запрещает serving. Ранее рассчитанное `eligible = true` не является разрешением после изменения hold/policy. Повторная актуальная проверка учитывает veto.

Deprecated/revoked unit не served даже при физическом наличии записи в индексе. Revocation — отзыв допуска к serving, не новый автоматически введённый lifecycle enum canonical сущности. Высокая similarity не отменяет этих условий.

## 6. Canonical hypotheses — Q3

Canonical Knowledge может сохранять HYPOTHESIS, но approval не превращает её в FACT. Canonical hypotheses исключены из production RAG v1.0: не используются как retrieval basis, основание product recommendation или установленный факт production answer. Research retrieval mode сейчас не создаётся.

Soft hypotheses Query Understanding/Reasoning о контексте пользователя — другой объект. Для них сохраняются confidence/evidence и запрет автоматического превращения в facts или самостоятельного исключения продукта. Их существование не разрешает извлекать canonical HYPOTHESIS в production.

## 7. Boundary review и completeness — Q4

Обязателен **завершённый boundary review**, а не хотя бы один boundary. Для каждой Product × State relation, используемой как достаточное основание recommendation, необходимо различать:

| Состояние review | Смысл |
| --- | --- |
| NOT REVIEWED | Проверка не завершена или не подтверждена |
| REVIEWED — NONE IDENTIFIED | Проверка завершена, ограничений не выявлено |
| REVIEWED — BOUNDARIES PRESENT | Проверка завершена, ограничения зафиксированы |

Это обязательная семантика, не production machine enum. Не выдумывать ограничения ради заполнения поля. `no boundary data` не равно `reviewed and none identified`; это UNKNOWN ≠ FALSE. Review относится к согласованной revision relation bundle, а не является бессрочной гарантией отсутствия ограничений.

## 8. Coherent recommendation bundle

```text
Product × State Relation Parent
├── rationale
├── evidence
├── use cases
├── boundary review
├── boundaries / anti-signals, if present
├── comparisons, when relevant
└── canonical references
```

Для использования relation как достаточного основания recommendation комплект должен содержать проверенные rationale, evidence, use cases, завершённую boundary review и разрешимые canonical references. Если review выявил boundaries/anti-signals, они обязательны. Comparisons нужны при релевантном сравнении; content implications не загружаются в recommendation автоматически.

Parent и обязательные зависимости должны относиться к согласованной approved revision комплекта: references фиксируют совместимые document revisions, а не произвольные последние версии каждого файла. Это не требование одинаковых version strings всех документов. Optional children не обязаны существовать; незавершённые required parts делают комплект incomplete. Machine schema completeness и workflow не создаются сейчас.

## 9. Knowledge types и retrieval scopes

Логический реестр типов определён в [knowledge-types.md](../../rag/knowledge-types.md), scopes — в [retrieval-scopes.md](../../rag/retrieval-scopes.md). Это contract-supporting vocabulary, не machine enum или runtime configuration. Он расширяется явным изменением контракта, не считается вечным закрытым списком.

Scopes: recommendation, explanation, product_information, brand, content_generation, music, visual. Они описывают назначение использования, независимо от физического устройства индекса.

State music/visual/content и Product × State content не попадают автоматически в обычный recommendation retrieval. Запрос «Что выпить вечером, чтобы спокойно поработать?» не получает motion rules, Suno strategy, watermark rules или content hooks, если запрос не относится к соответствующим scopes. Filtering распространяется на children, parent и context expansion. Обязательный контекст нельзя молча пропустить из-за scope: либо весь нужный комплект разрешён для использования, либо результат incomplete и не используется как достаточное основание.

AGENTS, ADR и developer documentation не индексируются автоматически как customer-facing Knowledge. Safety rules могут быть явно спроецированы из утверждённого canonical policy context после eligibility checks.

## 10. Logical knowledge unit и RAG Document

```text
Canonical document
→ semantic section / approved knowledge unit
→ RAG Document
→ optional technical chunks
```

Logical knowledge unit — семантически целостное утверждение, правило, объяснение или сценарий с достаточным контекстом для корректного использования. Markdown file и paragraph не являются автоматическими retrieval boundaries.

Unit сохраняет meaning, context, applicability, boundaries, knowledge type, scope, approval, epistemic nature, provenance, version и relationships. Она может включать несколько связанных sections, если разделение разрушает смысл; все source references и approvals сохраняются.

RAG Document — производное адресуемое представление unit, пригодное для filtering, versioning и provenance. Technical chunk — часть представления, а не самостоятельное canonical знание; использование требует восстановления обязательного контекста.

## 11. Children + Parent/Context Expansion

Semantic retrieval может найти child: rationale, evidence, use case, boundary, comparison или content implication. Для сложного знания до передачи в Reasoning Layer восстанавливается необходимый parent/context bundle.

```text
semantic search
→ rationale child
→ parent relation
→ mandatory boundary/context lookup
→ evidence bundle
→ eligibility/completeness validation
→ Reasoning Layer
```

Boundaries и обязательные constraints не конкурируют повторно за similarity top-k: они загружаются по canonical references. Все dependencies проходят status, scope, provenance, revision и serving checks. При недоступности обязательной части нельзя передать неполный rationale как безусловную рекомендацию.

AI-generated parent summaries не требуются v1.0. Parent может детерминированно собираться из canonical metadata/references без создания новых фактов. Факты остаются в Product Knowledge, их State-specific интерпретации — в relation.

## 12. Logical metadata model

Required — обязательная логическая информация; conditional — обязательна при указанном условии; optional — может отсутствовать. Это не физическая schema vector DB и не утверждённый формат сериализации.

### Common metadata

| Поле | Требование | Семантика |
| --- | --- | --- |
| knowledge_unit_id | Required | Стабильная semantic identity unit |
| rag_document_id | Required | Identity projection representation |
| knowledge_type | Required | Тип знания по реестру |
| retrieval_scopes | Required | Разрешённые scopes |
| source_path | Required | Основной canonical документ |
| source_section | Required | Стабильный section locator или явный document-level locator |
| source_refs | Conditional | Дополнительные источники составной unit и их revisions |
| knowledge_status | Required | Approval знания, включая разрешённое наследование |
| document_status | Required | Approval исходной document revision |
| version | Required | Canonical version знания |
| source_revision | Required | Точная canonical revision |
| projection_rules_version | Required | Версия правил преобразования |
| content_hash | Required | Fingerprint содержимого |
| language | Required | Язык содержания |
| epistemic_status | Required | Природа утверждения либо сохраняемая локальная attribution |
| provenance | Required | References на canonical происхождение и основания |
| claims_class | Conditional | Для claim-bearing units |
| applicability | Conditional | Если есть условия применимости |
| required_context_refs | Conditional | Если смысл/корректность требуют зависимости |
| parent_unit_id | Conditional | Для child units |
| chunk_locator | Conditional | Для technical chunks |

Отсутствие claims_class у явно non-claim unit допускается типовым контрактом; неизвестная классификация claim не означает SUPPORTED. Отсутствующие сведения не заполняются значениями по умолчанию, имитирующими факты.

### Type-specific metadata

| Поле | Требование | Когда применяется |
| --- | --- | --- |
| state_id | Conditional | State-specific unit |
| canonical_product_id | Conditional | Product-specific unit |
| relation_id | Conditional | Product × State и его children |
| relation_status | Conditional | Для Product × State |
| relation_version | Conditional | Для Product × State |
| relation_strength | Conditional | Для Product × State: primary/secondary/supporting |
| relation_confidence | Conditional | Для Product × State; без изобретения шкалы |
| entity_lifecycle | Conditional | Если unit зависит от lifecycle сущности |
| evidence_level | Conditional | При evidence classification A/B/C/D; может относиться к отдельным основаниям |
| state_relations | Conditional | Для типизированных semantic State relations |
| use_case_kind | Conditional | Для use cases: strong/conditional/poor |
| constraint_refs | Conditional | При boundaries, anti-signals и иных constraints |
| comparison_targets | Conditional | Для comparative knowledge |
| product_form | Optional | Если canonical Product Knowledge определяет форму |
| measurement_model | Optional | Если релевантна семантика веса |
| purchase_unit | Optional | Если релевантна семантика покупки |

Publication hold, результаты eligibility/reasons, policy version и index generation должны быть доступны publication/serving checks и trace. Их физическое хранение не определяется здесь. Boundary review/completeness обязательно представимы для recommendation bundle, но machine fields/enums не фиксируются.

## 13. Epistemic metadata

FACT / OBSERVATION / INTERPRETATION / HYPOTHESIS описывают природу утверждения. Evidence Product × State различает A — externally supported, B — internally observed, C — reasoned interpretation, D — exploratory hypothesis. Confidence, strength, approval и retrieval relevance — отдельные измерения.

Запрещены автоматические равенства A = FACT, C = low confidence, high similarity = high canonical confidence и approved = fact. INTERPRETATION может иметь высокую confidence; FACT со слабым provenance имеет проблему качества, а не автоматически надёжное основание.

Если fragment смешивает FACT и INTERPRETATION, предпочтительно разделить units. Если это разрушает смысл, сохраняется локальная epistemic attribution, без завышения статуса всего текста. Hypothesis-bearing фрагменты не обходят production exclusion через смешанную маркировку; если их нельзя безопасно отделить, unit не допускается. Evidence D не превращается в основание product recommendation из-за approval или similarity.

## 14. Provenance

Provenance — first-class metadata, связанная с canonical records/sections. Отдельная citation database не создаётся.

| Поле | Требование |
| --- | --- |
| provenance_ref | Required: canonical запись/section |
| source_type | Required |
| source_reference | Required: конкретное основание, не только category label |
| source_date | Conditional: когда известна или необходима для применимости |
| verified_at | Conditional: если проверка действительно проводилась |
| notes | Optional |

Source categories: manufacturer, supplier, internal_tasting, historical, scientific, brand_interpretation. Неизвестная дата остаётся unknown; index generation date не становится verified_at. Brand interpretation имеет прослеживаемое редакционное основание и references на использованные знания, не обязательно внешний scientific source.

Source path указывает, где хранится знание; provenance объясняет, откуда оно получено. Эти ссылки не подменяют друг друга. Недостаточное основание блокирует соответствующее утверждение. Это минимальная логическая модель, не production provenance schema и не полный scientific claims framework.

## 15. Claims safety — Q6

Применяется [Claims Policy](../../system/claims-policy.md). BRAND_INTERPRETATION обозначает ту же категорию, что «BRAND INTERPRETATION» в policy; это не конкурирующая категория и не выбор machine enum.

| Claims class | Production использование |
| --- | --- |
| SUPPORTED | Только после остальных eligibility checks |
| BRAND_INTERPRETATION | С сохранением interpretation framing/context |
| UNSUPPORTED / PROHIBITED | Не является production retrieval unit |

Prohibited claims не индексируются как обычные claim documents с надеждой на metadata filtering. Отдельный safety vector index в v1.0 не создаётся. Извлекаются утверждённые safety rules, например «не обещать медицинский эффект».

Prohibited wording examples могут оставаться в canonical policy context, но не превращаются в самостоятельные searchable positive claim units. При projection сохраняется смысл запрета; нельзя отделить пример от отрицания. Особенно важны immunity, sleep, physiological effects и health-related wording. RAG не является медицинским validator и не создаёт доказательств.

## 16. Negative knowledge, boundaries и UNKNOWN

Не сводить ограничения к knowledge_polarity = positive/negative: условная релевантность не равна запрету. Сохраняются boundary knowledge, anti-signals, applicability conditions, constraint refs, required context и boundary review completeness. Recommendation context получает их по canonical references, независимо от similarity competition.

UNKNOWN ≠ FALSE. Отсутствие evening_use не означает not suitable for evening; отсутствие boundary не означает no boundary exists. Отсутствие price не означает free; отсутствие commercial mapping не означает out of stock. RAG и Reasoning обязаны сохранять неизвестность.

## 17. State relations и conflict-aware retrieval

Одного related_state_ids недостаточно для reasoning. Logical relation содержит source_state_id, target_state_id, relation_type, conditions, canonical source, status, version и provenance. Candidate vocabulary: compatible_with, contrasts_with, conflicts_with, supports; это не окончательный закрытый schema enum.

Не выводить автоматически symmetry, reverse relation, transitivity, compatibility из related или conflict из названий States. Например, sleep и energy не становятся конфликтующими автоматически: связь должна существовать в canonical Knowledge.

Для запроса «Хочу перед сном что-нибудь бодрящее» retrieval сохраняет обе кандидатные направленности и возвращает существующие conditions, distinctions, conflicts и boundaries. Не создаёт новых State assignments. Разрешение конфликта принадлежит Reasoning Layer; алгоритм здесь не определяется.

## 18. Product × State retrieval

Parent relation содержит canonical_product_id, state_id, status, version, strength, confidence, rationale refs, evidence refs, use-case refs, boundary review, boundary refs, comparison refs и content refs.

```text
Query Understanding
→ intent + scopes + candidate States
→ eligible Product × State retrieval
→ relevant children
→ parent expansion
→ mandatory context / boundaries / evidence
→ Product Knowledge references
→ eligibility/completeness validation
→ Reasoning Layer
```

Embedding similarity не создаёт relation или State assignment, не меняет strength/confidence, не обходит maximum states per product = 3 и не создаёт evidence. Факты загружаются по references, не копируются вручную в projection как новый источник истины. Required dependency, исключённая из production, не может незаметно войти через expansion; комплект признаётся incomplete для требующего её использования.

## 19. Dynamic Product Domain boundary

```text
RAG → semantic candidates + knowledge context
Product Domain → current commercial truth
Reasoning / Ranking → final recommendation
```

Точная последовательность может оптимизироваться позже. Но перед «можно купить сейчас» или «входит в ваш бюджет» обязательна актуальная Product Domain validation.

RAG не является Source of Truth текущих price, discount, stock, available weights, SKU availability и current purchasable options. Правила [Product Contract v0.1.2 clarification](03-product-contract.md) сохраняются: variable-weight проверяется по реальным weightByUnit, fixed-weight нельзя искусственно дробить; один Product имеет один SKU независимо от выбранного веса. Knowledge identity, product_form, measurement_model и purchase_unit не сливаются с commerce data.

Без подтверждённого mapping и commercial data можно объяснить семантическую релевантность, но не подтверждать цену/наличие/доступный вес или budget fit. DTO, mapping, pricing formulas и scoring не создаются в этом задании.

## 20. Semantic chunking

Применять heading-aware, semantic-section-aware и relation-aware разделение; сохранять atomic claims, list context, table headers/units/context, parent references, локальную epistemic attribution и boundaries/context.

Нельзя разорвать recommend when X и except / do not recommend when Y так, чтобы retrieval создал безусловное утверждение. Табличная строка отделяется только вместе с необходимыми headers, units и условиями; вводная фраза и отрицания списка не теряются.

Token/overlap constants здесь не задаются. Overlap не заменяет semantic references. Если unit невозможно безопасно отделить или необходимый контекст не помещается в будущий технический лимит, требуется восстановить контекст либо не использовать unit как достаточное основание, а не обрезать ограничения.

## 21. Stable identity, versioning и publication — Q5

| Обозначение | Смысл |
| --- | --- |
| knowledge_unit_id | Стабильная semantic identity |
| rag_document_id | Identity projection representation |
| source_revision | Точная canonical revision |
| content_hash | Fingerprint содержимого, не semantic identity |
| projection_rules_version | Версия правил projection |
| index_generation | Версия retrieval corpus; serving использует опубликованную generation |

Knowledge unit ID не зависит только от content hash, номера строки или изменяемого heading slug. Изменение содержания меняет fingerprint/revision, а не автоматически semantic identity. Для split/merge нужны явные replacement relations и исключение obsolete units, без проектирования machine schema сейчас.

```text
canonical snapshot + projection rules version
→ build generation
→ validate
→ publish
```

При build проверяется допустимость кандидатов для целевого snapshot; публикация устанавливает согласованную current revision/generation. Это не обход serving eligibility: до publication наличие build artifact не разрешает выдачу. В опубликованной generation применяются все актуальные serving checks, в том числе veto/revocation.

Изменённая canonical revision не получает старое approval автоматически. Obsolete revision перестаёт быть актуальной и не используется как актуальное знание только потому, что новая generation ещё не опубликована. Нельзя произвольно смешивать revisions parent/children разных согласованных комплектов.

Deprecated, revoked и publication_hold должны иметь возможность немедленно исключить unit из serving независимо от физического удаления из индекса. **PHYSICALLY INDEXED ≠ ALLOWED TO SERVE.** Отзыв обязательной зависимости распространяется на использующий её комплект. Конкретный deployment pipeline не задаётся.

Rebuild логически воспроизводит corpus из snapshot/rules; byte-identical embeddings не требуются. Происхождение опубликованной generation и её состава прослеживается.

## 22. Language

Language — required metadata. Основной язык сейчас ru; en, zh и другие не блокируются. Перевод не является автоматически утверждённой equivalent revision. Полный multilingual retrieval и fallback policy здесь не проектируются.

## 23. Query Understanding и Recommendation boundary

```text
User Language
→ Query Understanding
→ retrieval intent / scopes / explicit constraints / candidate States
→ RAG
→ Reasoning
```

«Мне всю ночь писать диплом» может дать long intellectual work, night context, candidate states concentration/energy, но не student/poor/young без основания. RAG не классифицирует личность пользователя. Не классифицируй человека. Понимай ситуацию.

Reasoning получает knowledge units, revisions, applicability, boundaries, evidence/provenance, completeness и conflicts/unknowns. Контракт готовит данные для будущего Recommendation Contract, но не определяет ranking weights, scores, question selection, constraint priority, conflict resolution, price scoring или diversity.

## 24. Failure behavior

| Ситуация | Обязательное поведение |
| --- | --- |
| No relevant knowledge | Не выдумывать; сообщить недостаточность данных / передать необходимость уточнения |
| Low canonical confidence | Сохранить неопределённость, не усиливать claims |
| Low retrieval relevance | Не выдавать similarity result за доказанное основание |
| Conflicting approved knowledge | Передать обе стороны и условия Reasoning Layer |
| Missing provenance | Не использовать соответствующее утверждение в production retrieval |
| Only hypothesis available | Не использовать как production retrieval basis или установленный факт |
| Boundary review incomplete | Recommendation bundle incomplete |
| Required context unavailable | Не использовать неполный комплект как достаточное основание |
| Commercial data unavailable | Не подтверждать price, availability, доступные веса или budget fit |
| Missing contextual knowledge | Сохранять UNKNOWN |
| Obsolete revision / revoked / hold | Не использовать как актуальное разрешённое знание |

## 25. Explainability

```text
answer claim
→ recommendation rationale
→ retrieved knowledge unit + revision
→ canonical source section
→ provenance
```

Должны прослеживаться retrieval scopes, filters, generation, loaded boundaries, completeness state, exclusion reasons и применённая eligibility policy version. Полная telemetry platform не проектируется; хранение пользовательских сообщений не является требованием контракта.

## 26. Projection ownership и generated artifacts

[knowledge/rag/](../../rag/README.md) содержит projection rules, vocabulary, scope definitions и contract-supporting documentation. Основной контракт — здесь; support documents уточняют его применение, не дублируют полный текст и не образуют конкурирующих business sources.

Generated RAG documents, technical chunks, embeddings, vector indexes, index generations и temporary build artifacts не являются canonical Knowledge. Их нельзя вручную вести внутри canonical knowledge дерева. Место хранения и deployment определятся будущей implementation architecture; сейчас artifacts не создаются. Canonical content исправляется в источнике, не патчем generated projection.

## 27. Future schemas

| Schema need | Назначение |
| --- | --- |
| knowledge-document | Document revision approval, source identity, language |
| state | Entity identity/lifecycle отдельно от document approval |
| product-knowledge | Knowledge identity/semantics без commerce DTO |
| product-state | Relation, references и boundary review/completeness |
| provenance | Canonical происхождение и основания |
| rag-document | Common + type-specific logical envelope |
| projection-release | Snapshot, rules version и согласованная generation |
| state-relation — при необходимости | Типизированные State relations, если отдельная schema оправдана |

Schemas, validation implementation и schema language в этом задании не создаются. `schemas/` сохраняет placeholder.

## 28. Acceptance criteria и граница завершения

Будущая реализация обязана проверять исключение draft/review/deprecated, hypotheses и prohibited claims; State active не подменяет document approval. Hold только запрещает доступ, revocation блокирует serving независимо от индексной записи. Scope separation действует при search и expansion. Boundaries/constraints загружаются без повторного similarity competition; boundary review обязателен, actual boundary — нет. Unit не теряет provenance, conditions, epistemic nature или revision. Obsolete revisions не served как актуальные. UNKNOWN не становится FALSE; commerce claims требуют Product Domain validation.

Текущая материализация заканчивается этим контрактом, четырьмя rag support documents и согласованными cross-references/ADR/AGENTS. Не переходить к Recommendation Contract, schemas, instances, mapping, DTO, vector DB, embeddings, runtime retrieval или ranking без отдельного задания.
