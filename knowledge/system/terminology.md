# Terminology

Канонический словарь Knowledge Domain, материализованный в Patch v0.1.1. State-specific и product-specific документы используют эти термины согласованно с архитектурными контрактами.

| Термин | Значение |
| --- | --- |
| State | Каноническая сущность Knowledge ontology, описывающая релевантное/желаемое состояние в брендовой модели. Не диагноз и не характеристика личности. |
| Mood | Существующее application-level представление (`Product.moods`) связей с States; не отдельная Knowledge ontology. |
| Product | В Knowledge — предмет знания независимо от конкретного SKU. Operational Product остаётся сущностью Product Domain. |
| canonical_product_id | Стабильная identity самостоятельного предмета знания, не SKU, весовая опция, URL или marketing variation; практически immutable после утверждения. Весовые варианты одного Product сами по себе не создают новых Knowledge identities. |
| SKU | Коммерческий идентификатор Product Domain; не автоматически Knowledge identity. В текущей модели один Product имеет один SKU независимо от выбранного веса. |
| weightByUnit | Product Domain mechanism, определяющий разрешённые весовые варианты весового товара. Актуальные доступные варианты не ведутся в Knowledge как второй Source of Truth; backend DTO этим термином не задаётся. |
| measurement_model | Семантика отношения продукта к весу: variable_weight, fixed_weight, not_weight_based. Независима от purchase_unit; conceptual values, не production enum. |
| purchase_unit | Семантика единицы покупки: weight, piece, set. Отдельна от measurement_model и operational unit; set не требует изменения текущего unit набора. |
| product_form | Физическая/товарная форма, отдельная от Knowledge identity, SKU, measurement model и purchase unit; например loose_leaf, cake, brick, tuo, vacuum_pack, portion_pack, other. Примеры не являются окончательной schema. |
| fixed-weight product | Готовая товарная единица с фиксированным физическим весом; не предполагает произвольной фасовки. |
| variable-weight product | Продукт, для которого покупатель выбирает разрешённый Product Domain весовой вариант. |
| Product Domain | Operational Source of Truth приложения; актуальные commerce data принадлежат этому домену/backend. |
| Product Knowledge | Канонические устойчивые знания о продукте. |
| Product × State | Самостоятельная утверждаемая интерпретационная relation; approved relation — Source of Truth назначения продукта State. |
| Strength | Значимость State для конкретного Product: primary, secondary, supporting. |
| Confidence | Уверенность в обоснованности знания/relation; не strength и не approval status. |
| Fact | Утверждение фактического характера с соответствующим основанием. |
| Observation | Наблюдение, например internal tasting. |
| Interpretation | Вывод/брендовая интерпретация на основании известных данных. |
| Hypothesis | Неутверждённое вероятностное предположение, не автоматически установленный факт. |
| Provenance | Происхождение знания и основание утверждения. |
| RAG | Производной retrieval layer для утверждённых единиц знания с контекстом и metadata; не Source of Truth и не вся Reasoning Layer. |
| RAG projection | Производное retrieval-представление canonical Knowledge, прошедшего eligibility; восстанавливается из snapshot и projection rules. |
| Knowledge Unit | Семантически целостное утверждение, правило, объяснение или сценарий с необходимыми context, applicability и references; файл/paragraph не являются автоматическими границами. |
| RAG Document | Адресуемое projection representation Knowledge Unit с metadata; не новый canonical факт. |
| Technical Chunk | Техническая часть RAG Document, используемая с восстановлением обязательного parent/context. |
| Retrieval Scope | Логическое назначение retrieval, применяемое также к expansion; не физическое устройство индекса. |
| Eligibility | Вычисляемая допустимость unit для scope по approval, lifecycle, epistemic/claims policy, provenance, completeness, publication state и veto. |
| Publication Hold | Только veto публикации/serving: сужает доступ, никогда не делает ineligible знание eligible. |
| Indexed | Projection revision физически присутствует в index generation; не означает served. |
| Served | Unit разрешена к использованию в текущей выдаче с учётом актуальных checks/hold/revocation. |
| Index Generation | Согласованная версия retrieval corpus из canonical snapshot и projection rules version; serving использует опубликованную generation. |
| Source Revision | Точная canonical document revision, породившая representation; approval относится к revision. |
| Projection Rules Version | Версия правил преобразования canonical Knowledge в retrieval projection. |
| Boundary Review | Проверка ограничений: not reviewed / reviewed — none identified / reviewed — boundaries present; actual boundary не обязателен, завершённая review обязательна для достаточного основания recommendation. |
| Recommendation Bundle | Согласованный approved parent/context комплект Product × State с rationale, evidence, use cases, завершённой boundary review и required references; не ranking algorithm. |
| Unknown | Отсутствующее знание; UNKNOWN ≠ FALSE. |

Подробности: [State System](state-system.md), [Product Contract и canonical identity](../docs/architecture/03-product-contract.md), [Product × State Model](product-state-model.md), [Claims Policy](claims-policy.md).

Retrieval-термины определены [RAG Contract v1.0](../docs/architecture/05-rag-contract.md). Approved, eligible, indexed и served различаются; entity lifecycle не подменяет document approval. Canonical HYPOTHESIS сохраняется как знание о предположении, но исключена из production RAG v1.0; soft hypotheses Query Understanding — другой объект.
