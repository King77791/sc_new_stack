# Retrieval scopes

Логический реестр [RAG Contract v1.0](../docs/architecture/05-rag-contract.md), не runtime config и не инструкция выбрать устройство индекса.

| Scope | Назначение |
| --- | --- |
| recommendation | Семантические кандидаты, State signals, approved relations, applicability и ограничения |
| explanation | Проверяемое объяснение оснований с сохранением epistemic framing |
| product_information | Устойчивые знания о продукте, не текущая цена/наличие |
| brand | Философия бренда и значение States |
| content_generation | Утверждённые основания и правила для контента |
| music | Stolitsa Chaya Sound и State music identity |
| visual | State visual identity, icon semantics, motion/watermark rules |

## Separation и expansion

Query Understanding передаёт intent, scopes, explicit constraints и candidate States. Scope filtering применяется к search, parent expansion и каждому mandatory context lookup. Физический один или несколько индексов не изменяют правил допуска.

`state_music`, `state_visual`, `state_content`, `product_state_content` не включаются автоматически в обычный recommendation. Запрос «Что выпить вечером, чтобы спокойно поработать?» не получает Suno strategy, motion/watermark rules или content hooks, если соответствующие scopes не запрошены.

Cross-scope запрос допустим при явном intent и разрешении каждой unit для соответствующего использования. Он не превращает music/visual материалы в evidence Product × State. Generation контента не обходит claims/epistemic policy и не создаёт новых canonical facts.

Обязательные boundaries/constraints получают разрешённый для данного использования scope и загружаются по references, без повторной конкуренции по similarity. Если required context нельзя законно загрузить, результат incomplete; нельзя расширять scope молча или опускать ограничение ради выдачи.

Production scope для canonical HYPOTHESIS или prohibited claims в v1.0 не создаётся. Research mode и отдельный safety vector index не входят в контракт.
