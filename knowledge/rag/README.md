# RAG projection support

Каталог поддерживает утверждённый [RAG Contract v1.0](../docs/architecture/05-rag-contract.md). Здесь находятся projection rules, retrieval vocabulary, scope definitions и contract-supporting configuration/documentation. Сейчас это только Markdown, не runtime config.

- [Projection rules](projection-rules.md)
- [Knowledge types](knowledge-types.md)
- [Retrieval scopes](retrieval-scopes.md)

Каталог не содержит canonical business knowledge и не является Source of Truth Product, State или Product × State. Canonical facts/relations хранятся в соответствующих областях Knowledge; текущие commercial data принадлежат Product Domain.

Generated retrieval documents, technical chunks, embeddings, vector indexes, index generations и temporary build artifacts здесь не создаются и не ведутся вручную внутри canonical knowledge дерева. Их storage/deployment определится позже. Индекс логически восстанавливается из canonical snapshot и projection rules version.

Материализация v1.0 не включает schemas, конкретные сущности, Recommendation Contract, backend mapping или runtime.
