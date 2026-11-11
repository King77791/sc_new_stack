# Music Production Profile — template

Незаполненный шаблон, не профиль State. Нормативная основа — [контракт](../../docs/architecture/06-music-production-contract.md). Будущий путь: `knowledge/music/states/{state_id}/production.md`.

| Поле | Placeholder / инструкция |
| --- | --- |
| schema_version | 1.0 |
| document_id | null — stable ID |
| content_revision | null — immutable revision |
| document_status | draft |
| owner | null |
| state_id / state_ref | null — canonical ID и repository-root path |
| music_interpretation_ref | null — path + content_revision + immutable locator approved interpretation |
| provenance | null — источники и interpretation framing |
| approval | draft; reviewer=null; reviewed_at=null; target_revision=null; remarks/evidence_ref=null |

## Музыкальные характеристики

Заполнить каждую строку по утверждённой interpretation; null сохраняет неизвестное. Не копировать определение State.

| Характеристика | Placeholder |
| --- | --- |
| Genres/styles | null |
| Target BPM/range | null — художественный ориентир, не Suno control |
| Rhythm | null |
| Harmony | null |
| Melody | null |
| Instrumentation | null |
| Textures | null |
| Arrangement | null |
| Dynamics | null |
| Emotional arc | null |
| Vocal approach | null |
| Prompt strategy | null |
| Positive characteristics | null |
| Excluded characteristics | null |
| QC expectations | null — со ссылкой на общие QC rules |

## История ревизий

TODO: revision, дата, автор, причина; проверять актуальность upstream approvals. Без semantics/interpretation документ остаётся draft и не используется как approved production source.
