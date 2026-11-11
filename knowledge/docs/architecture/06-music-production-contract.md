# Music Production Contract v1.0

Материализация M1.2 от 2026-11-12 на основании утверждённого M1.1 PASS WITH NOTES и задания владельца проекта. Нормативный контракт музыкального производства; не runtime implementation и не утверждение конкретных произведений.

## 1. Цель и границы

Расширять существующий Knowledge Domain для Stolitsa Chaya Sound. Производство не зависит от Recommendation Engine. M1.2 разрешает только этот контракт, production policies, шесть незаполненных шаблонов и навигационные/ADR updates. Реальные State profiles, presets, jobs, tracks, playlists, formal machine schemas и M2–M4 не создаются. Это ограниченное расширение прежнего checkpoint, не отмена остальных запретов.

## 2. Источники и семантическая иерархия

Источники: [State Contract](02-state-contract.md), [Music System](../../system/music-system.md), [Claims Policy](../../system/claims-policy.md), [RAG Contract](05-rag-contract.md). Product и Product × State contracts сохраняются без изменений.

Canonical State Semantics → State Music Interpretation → Music Production Profile → Suno Preset → Generation Job / Attempts → Track → Playlist.

State ID берётся только из действующего State Contract; повторная ontology не ведётся. Определение State хранится один раз в canonical semantics. Музыкальная интерпретация ссылается на её approved revision, production profile — на approved music interpretation revision. Если semantics отсутствует, допускается только незаполненный шаблон или явно draft документ, без утверждения направления.

## 3. Пути и entities

Следующие пути — будущие, не существующие instances M1.2:

```text
knowledge/states/{state_id}/semantics.md
knowledge/states/{state_id}/music.md
knowledge/music/states/{state_id}/production.md
knowledge/music/states/{state_id}/presets/{preset_id}/{version}.yaml
knowledge/music/jobs/{job_id}.yaml
knowledge/music/tracks/{track_id}.yaml
knowledge/music/playlists/{playlist_id}/{version}.yaml
```

State Music Interpretation задаёт философию выражения, задачу, эмоциональную траекторию, contexts и смысловые границы без копирования State definition. Production Profile задаёт genres, BPM, rhythm, harmony, melody, instruments, textures, arrangement, dynamics, vocal approach и QC expectations. Preset — переиспользуемое задание. Job — конкретная работа; attempt — отдельная попытка внутри job. Track — произведение; audio revision — точный результат обработки этого произведения. Playlist manifest — единственный источник состава и порядка.

## 4. Identity, версии и references

Stable IDs уникальны внутри своего типа, lowercase machine-safe; после назначения не переиспользуются. State ID неизменен и проверяется по State Contract. Interpretation и profile имеют document_id; preset, job, track, playlist — собственные именованные IDs; attempt имеет attempt_id и уникальный положительный ordinal внутри job; audio_revision_id уникален внутри track.

schema_version — версия формата, content_revision — immutable revision содержимого, preset_version/playlist_version — адресуемая версия сущности, approval status — отдельное решение. Изменение содержания требует новой content_revision и новой review. Утверждённая revision не перезаписывается. Исправления решений сохраняются в history с основанием, reviewer и датой.

Точная document reference содержит path (от корня репозитория), content_revision и immutable locator: Git commit или SHA-256 fingerprint. Git locator относится к содержимому документа, не к approval record, который его утверждает. Null locator означает unresolved reference, запрещает зависимое approval. Approval target_revision указывает на content_revision; audio checks дополнительно адресуют audio_revision_id и checksum. Содержательный checksum документа считается без approval/history records во избежание самоссылки; способ canonical serialization должен быть зафиксирован до первого такого fingerprint, иначе использовать Git locator.

Job фиксирует path, preset_id, preset_version, content_revision и locator пресета. Track ссылается на job, точный attempt/result, preset и точную audio revision. Playlist entry содержит track_id, audio_revision_id и checksum; заменять аудио в опубликованной версии нельзя — создаётся новая playlist_version. Изменение статуса/отзыв проверяется по актуальным records, immutable reference не разрешает использование отозванного материала.

## 5. Track identity

Мастеринг, исправление технического дефекта и несущественная обработка создают новую audio revision существующего track. Существенно новая композиция и remix получают новый track_id; допустим derived_from_track_id. Новая генерация Suno не становится автоматически ревизией существующего произведения: Music Producer документирует происхождение, Brand Owner решает спорную identity. Audio revision сохраняет source job/attempt/result и processing history. Vocal class и duration принадлежат точной аудиоревизии, не являются независимой копией на уровне track.

## 6. Lifecycle и неизвестные значения

Document status interpretation/profile/preset и canonical document approval: draft / review / approved / deprecated. State entity lifecycle draft / active / deprecated не меняется.

Job status: draft / ready / generating / review / completed / cancelled. Ready требует разрешённых источников и полного задания; completed означает завершение работы, не approval результатов. Attempt: recorded / failed / completed, без автоматического утверждения результата. Track и playlist lifecycle_status: draft / review / ready / published / deprecated. Ready вычисляется по всем обязательным gates; published фиксируется только после фактической публикации и разрешения Brand Owner. Deprecated/revoked/hold блокируют новый выпуск.

null означает unknown/unfilled, [] — нет записей, не доказательство отсутствия ограничений. Шаблон не является valid production instance. Required IDs, references, owner, dates, classification, assets и решения должны быть заполнены до соответствующего gate. Неоднозначность, конфликт источников, недоступный asset, checksum mismatch или отсутствующее основание запрещают зависимый переход; фиксировать проблему, не выдумывать значение. Исправлять upstream source, затем повторять зависимые reviews.

## 7. Ownership и независимые решения

Brand Owner утверждает interpretation, художественное направление и окончательное разрешение публикации. Music Producer ведёт генерации, attempts и первичный QC. Technical Reviewer проверяет техническую целостность. Rights Reviewer проверяет происхождение и права. Один человек может совмещать роли, но записи решений остаются раздельными. Codex не присваивает художественное или юридическое утверждение.

technical_qc: pending / passed / failed; artistic_approval: pending / approved / rejected; publication_clearance: pending / cleared / denied / revoked. Каждый record содержит status, reviewer, reviewed_at, target_revision, remarks/evidence_ref. Для track решения хранятся внутри конкретной audio revision. Publication clearance дополнительно содержит rights_review с reviewer/date/revision/evidence и final_authorization Brand Owner с теми же атрибутами; cleared требует обоих положительных решений для предполагаемого способа распространения.

Document approval не подменяет эти три gates. Ready track требует technical_qc passed, artistic_approval approved и publication_clearance cleared для точной аудиоревизии с валидным checksum. Ready playlist требует этих же трёх gates для своей точной версии, всех включённых audio revisions и выполнения Vocal Policy либо явно утверждённого допустимого исключения. Approval/QC одной версии не наследуются другой. Publication clearance не эквивалентен RAG eligibility.

Подробные критерии — [Quality Control](../../music/quality-control.md).

## 8. Хранение и provenance

В Git: контракты, шаблоны, разрешённые lyrics, prompts, metadata, approval records, revision history, устойчивые asset references и checksums. WAV, MP3, stems, masters, крупные exports и закрытые документы о правах хранятся вне Git. Credentials, API keys и временные signed URLs запрещены. Storage provider пока не выбирается. Перенос asset не меняет track identity; checksum подтверждает точные байты. References закрытых подтверждений не раскрывают их содержание или секреты.

rights_provenance фиксирует происхождение, основание использования, restrictions, evidence references и разрешённое распространение. Подписка на Suno не считается автоматическим доказательством всех прав; unknown rights блокируют clearance.

## 9. Suno workflow

Проверить semantics → утвердить interpretation/profile → создать адресуемый preset → job с точным preset ref → фиксировать каждый attempt и фактически отправленный prompt/settings → выбрать результаты → определить track identity → зарегистрировать audio revisions → провести три независимые проверки → собрать фиксированный playlist → проверить policy и gates → получить разрешение публикации.

Внутренние художественные параметры не выдаются за Suno controls или гарантии результата. service_settings содержат только фактически проверенные настройки, service/model identifier, дату проверки и evidence; неизвестные значения null. Названия моделей, диапазоны controls и коммерческие условия не придумываются. Attempts сохраняют фактический snapshot prompt/settings, а не только ссылку на текущий preset. Число attempts вычисляется из массива; отдельный счётчик запрещён.

### Preset refinement — правила заполнения

artistic_parameters.intended_vocal_mode допускает instrumental / vocal_texture / full_vocal; null означает неизвестное в draft/template. Это намерение, не фактическая vocal_class результата: результат классифицируется после прослушивания отдельно.

target_bpm — положительное число или null; target_bpm_range — null либо объект {min, max} с положительными числами min ≤ max. Можно задать одно поле или оба; при обоих обязательно min ≤ target_bpm ≤ max. Оба null допустимы, если темп пока не определён. Эти поля — художественные ориентиры, не подтверждённые настройки Suno и не гарантия темпа результата. excluded_characteristics перечисляет конкретные музыкальные признаки (например, резкие перкуссионные атаки или искажённый бас), а не неопределённые эмоциональные оценки вроде «плохое настроение».

Опциональный структурированный блок prompt — внутреннее представление проекта, не утверждение о текущих полях интерфейса Suno: language — язык текста задания; style_text — стилевой текст; exclude_text — сформулированные исключения; lyrics_text — текст вокала при необходимости; instrumental_intent — boolean/null, намерение об инструментальном результате; construction_notes — заметки о сборке. При instrumental/vocal_texture instrumental_intent может быть true, при full_vocal — false; противоречие требует исправления до approval. Для instrumental/vocal_texture lyrics_text остаётся null; нелексические фактуры описываются в style_text. Неизвестное остаётся null.

Для обратной совместимости prompt_text сохраняется как legacy неструктурированный текст. Используется ровно один источник текста: либо prompt_text заполнен и все prompt-поля null, либо структурированный prompt заполнен и prompt_text=null. Одновременное заполнение запрещено; оба незаполнены допустимы только как незавершённое задание. prompt_strategy задаёт общую стратегию, construction_notes — конкретную сборку, а excluded_characteristics — музыкальные ограничения; exclude_text формулирует их для отправки и не переопределяет. Фактически отправленный текст сохраняется в attempt.submitted_prompt независимо от формата preset.

approval.target_revision должен точно совпадать с content_revision утверждаемого preset; null не допускает approved. Изменение утверждённого содержимого требует новой content_revision, адресуемой preset_version и нового approval, прежнее решение сохраняется в истории. Preset approval утверждает инструкции, но не утверждает generation result, фактическую vocal_class, качество аудио или права: результат проходит самостоятельные technical_qc, artistic_approval и publication_clearance.

## 10. Playlist Vocal Policy

Нормативный расчёт и классификация определены в [Playlist Vocal Policy](../../music/playlist-vocal-policy.md). Доля вычисляется из точного состава, не ведётся вручную. Manifest фиксирует порядок и audio revisions. Принадлежность треков плейлистам определяется manifests, не дублируется в track records.

## 11. RAG isolation и claims

Production records по умолчанию исключены из customer-facing retrieval: jobs, attempts, draft prompts, service settings, internal QC, rights documents и неутверждённые profiles. Ни track, ни playlist не получает автоматического допуска по approval/clearance.

Утверждённая State music interpretation может использовать существующие state_music и scope music только после всех checks действующего RAG Contract: approved ≠ eligible ≠ indexed ≠ served. Types/scopes не расширяются M1.2. Hypotheses не становятся facts. Music approval не создаёт Product × State relation, не меняет moods и не служит evidence физиологического воздействия чая. Медицинские обещания запрещены для всех States, включая immunity, sleep и chakras.

## 12. Compatibility и acceptance

### Final hardening — publication и целостность

Незаполненные Track audio revisions и Playlist templates имеют publication_hold=true. false означает только отсутствие этой блокировки, не разрешение публикации. Для ready и published обязательны все положительные gates, применимые к точной revision и предполагаемому способу распространения, включая все entries плейлиста. Pending, failed, rejected, denied, revoked, unknown или действующий hold блокируют выпуск. Актуальный отзыв разрешения или hold запрещает дальнейшее распространение даже при историческом published; снятие hold не восстанавливает утратившие силу разрешения и требует их повторной проверки. Исторические approved revisions не переписываются: новые материалы получают новые revisions/версии; отзывы и решения сохраняются отдельно в history.

Track.source_job_id и source_preset_ref фиксируют исходное происхождение произведения. Для конкретной audio revision источник определяется её source_job_id, source_attempt_id, source_result_id и processing_history. Для обработки существующего аудио достаточно существующего processing_history: каждая операция обязана указывать input_audio_ref {track_id, audio_revision_id, checksum}, operation, responsible и processed_at. Цепочка должна однозначно вести к зарегистрированной исходной revision и generation result, без циклов; новые generation IDs для обработки не выдумываются. Несовпадение provenance блокирует зависимое утверждение. Remix по-прежнему получает новый track_id.

asset_reference — устойчивый непрозрачный идентификатор или постоянный locator точного аудио, без secrets и temporary signed URLs. Он должен однозначно разрешаться в байты с checksum соответствующей audio revision; файл должен быть доступен обязательным reviewers. Один reference не может незаметно указывать на другое аудио. Место хранения и storage provider не определяют track_id. Неподтверждённые технические metadata не обязательны; недоступность файла или checksum mismatch блокирует проверку.

rights_provenance документирует origin, usage_basis, restrictions, permitted_distribution и evidence_refs; ответственный и дата проверки берутся из publication_clearance.rights_review.reviewer/reviewed_at, привязанных к той же exact revision. Эти сведения не дублируются вторым approval record. Пустые evidence/неизвестные ограничения не считаются проверенными правами. Коммерческие права Suno не предполагаются; закрытые документы остаются вне Git.

Playlist integrity: position — положительное целое; positions уникальны и образуют 1..N. Каждая пара track_id/audio_revision_id разрешается однозначно, checksum manifest совпадает с checksum revision. Повторы audio revision и одинаковых audio checksum под другими IDs запрещены. policy_revision_ref обязателен до approval и фиксирует точную policy revision/immutable locator. Unknown vocal_class блокирует публикацию; каждый entry проходит все gates с учётом актуальных отзывов и holds. Требование совпадения State всех entries не вводится: state_id сохраняет контекст playlist, не создаёт новых State assignments.

Сохранять State Contract, Product Contract, Product × State, claims и ADR-001–017. Не менять frontend/backend, operational data, Recommendation, retrieval runtime или зависимости. Не создавать отдельную ontology и фиктивные instances. Проверять YAML syntax, ссылки/будущие пути, unique sequential ADR IDs, точность references, независимость gates и отсутствие audio/secrets. Новые files ограничены knowledge/. Итоговая проверка включает git diff --check и status без add/commit/push.
