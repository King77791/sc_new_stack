# Projection rules

Нормативная основа — [RAG Contract v1.0](../docs/architecture/05-rag-contract.md). Это краткие supporting rules, не отдельная business knowledge base и не parser/build implementation.

## Canonical → eligibility → projection → publication

1. Использовать canonical snapshot с точными document revisions и прослеживаемым approval. State active не утверждает документы.
2. Выделить semantic units, сохранив context, applicability, epistemic nature, provenance и required references. Не приравнивать файл/paragraph к unit автоматически.
3. Проверить computed eligibility для scope: approval, lifecycle, applicable relation, epistemic/claims policy, provenance, completeness и publication veto. Не создавать positive override.
4. Создать только производное representation с stable semantic identity, source revision/fingerprint и projection rules version. Не дописывать facts, evidence или назначения по similarity.
5. Проверить согласованность parent/dependencies и подготовленной generation. Только публикация устанавливает current generation; build artifacts сами не разрешают serving.
6. Serving повторно учитывает актуальные hold/revocation/deprecation и published revisions. Physically indexed не означает allowed to serve.

Canonical HYPOTHESIS и UNSUPPORTED / PROHIBITED claims исключены из production RAG v1.0. Prohibited wording в policy examples не выделяется в searchable positive claims; допустимы утверждённые safety rules с сохранением смысла запрета.

## Parent/context expansion

Search может найти child; перед Reasoning необходимо восстановить parent и обязательные context/boundary/evidence references. Эти dependencies не конкурируют повторно за similarity top-k. Scopes и eligibility применяются ко всему расширенному контексту.

Для relation как достаточного основания recommendation проверяются rationale, evidence, use cases, boundary review и canonical references. Actual boundaries нужны, только если review их выявил. NOT REVIEWED отличается от REVIEWED — NONE IDENTIFIED. Parent и required children относятся к согласованному approved комплекту revisions; недоступная required часть делает bundle incomplete.

Generated content не исправляется вручную как новый Source of Truth: изменения делаются в canonical Knowledge с последующей проверкой approval и projection. Runtime, deployment, token sizes, overlaps и schemas остаются за пределами текущего этапа.
