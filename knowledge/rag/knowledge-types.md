# Knowledge types

Логический реестр [RAG Contract v1.0](../docs/architecture/05-rag-contract.md), не machine enum schema. Тип описывает смысл unit, а не автоматически её eligibility. Scopes определены в [retrieval-scopes.md](retrieval-scopes.md). Реестр допускает согласованное расширение; новые instances или assignments этим документом не создаются.

| Knowledge type | Назначение | Применимые scopes после eligibility |
| --- | --- | --- |
| brand_manifest | Философия и принципы бренда | brand, content_generation; explanation при релевантном запросе |
| system_rule | Утверждённое общесистемное правило | Явно назначенные scopes по смыслу правила |
| state_definition | Определение State | recommendation, explanation, brand, content_generation |
| state_philosophy | Философия State | explanation, brand, content_generation |
| state_semantics | Смысл, what it is / is not | recommendation, explanation, brand, content_generation |
| state_recommendation | Signals, anti-signals, контексты State | recommendation, explanation |
| state_content | Content identity State | content_generation |
| state_music | Музыкальная identity State | music |
| state_visual | Visual/icon/motion identity State | visual |
| state_relation | Типизированные semantic relations States | recommendation, explanation; иные scopes при явном назначении |
| product_identity | Предмет знания и canonical identity | product_information, explanation, content_generation; recommendation как необходимый контекст |
| product_origin | Происхождение и производство | product_information, explanation, content_generation; recommendation при релевантном условии |
| product_sensory | Sensory profile | product_information, recommendation, explanation, content_generation |
| product_brewing | Канонические/практические знания о приготовлении | product_information, recommendation, explanation, content_generation |
| product_experience | Experience и характер сессии | product_information, recommendation, explanation, content_generation |
| product_context | Контексты применения | product_information, recommendation, explanation, content_generation |
| product_comparison | Предметные сравнения | product_information, recommendation, explanation, content_generation |
| product_claim | Утверждение о продукте с claims classification | Только явно разрешённые claims policy scopes |
| product_state_relation | Parent envelope утверждённой связи | recommendation, explanation, content_generation |
| product_state_rationale | Обоснование связи | recommendation, explanation, content_generation |
| product_state_evidence | Основания и epistemic support связи | recommendation, explanation, content_generation |
| product_state_use_case | Strong/conditional/poor use case | recommendation, explanation, content_generation |
| product_state_boundary | Ограничения применимости | recommendation, explanation, content_generation |
| product_state_comparison | Сравнение в контексте State | recommendation, explanation, content_generation |
| product_state_content | Content implications relation | content_generation |

Таблица задаёт области применения, а не автоматическое назначение всех scopes каждой unit. Фактические scopes следуют canonical смыслу и eligibility policy. Проекция не утверждает source knowledge и не выводит дополнительные Product × State relations.

System rules, включая необходимые safety/context rules, получают scopes явно; architecture docs, ADR и AGENTS не индексируются автоматически как customer-facing knowledge. Source/provenance records могут служить основаниями unit без автоматического превращения всего файла sources.md в самостоятельный customer-facing результат.
