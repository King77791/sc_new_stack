# Music Production System v1.0

Материализация M1.2, 2026-11-12. Расширение существующего Knowledge Domain, вне runtime и независимо от Recommendation Engine.

- [Music Production Contract](../docs/architecture/06-music-production-contract.md)
- [Stolitsa Chaya Sound](../system/music-system.md)
- [State Contract](../docs/architecture/02-state-contract.md)
- [Playlist Vocal Policy](playlist-vocal-policy.md)
- [Quality Control и ownership](quality-control.md)
- [State music template](templates/state-music.template.md)
- [Production profile template](templates/production-profile.template.md)
- [Suno preset template](templates/suno-preset.template.yaml)
- [Generation job template](templates/generation-job.template.yaml)
- [Track template](templates/track.template.yaml)
- [Playlist template](templates/playlist.template.yaml)

`states/`, `jobs/`, `tracks/`, `playlists/` пока содержат только .gitkeep. Шаблоны не являются instances или formal machine schemas. Null означает unknown/unfilled; placeholders не дают права утверждать материал. Пути внутри references задаются от корня репозитория; будущие instance paths перечислены в контракте.

Четыре `.yaml` templates используют JSON-compatible YAML 1.2: JSON syntax является допустимым подмножеством YAML. Заполнить null и удалить демонстрационные пустые элементы arrays перед созданием будущей записи; они показывают форму, не реальные attempts/audio/entries. Неизвестное не заменять вымыслом. settings содержит только проверенные service controls; artistic_parameters — внутренние ориентиры. target_bpm и target_bpm_range могут задаваться отдельно или совместно; при совместном задании BPM находится внутри диапазона. intended_vocal_mode: instrumental / vocal_texture / full_vocal (null — unknown). Правила структурированного prompt, совместимости prompt_text и точного approval.target_revision определены в разделе Preset refinement контракта. selected_results адресует attempt_id/result_id; попытки считаются по массиву. Decision records внутри audio revision ссылаются target_revision на audio_revision_id и наследуют её checksum scope; playlist records — на content_revision. rights_review и final_authorization используют pending / approved / rejected; exception_review — pending / approved / rejected / not_applicable (последнее только при выполнении диапазона). Final authorization принадлежит Brand Owner. Новая audio revision требует повторной классификации и всех gates; Незаполненные Track/Playlist templates имеют publication_hold=true; false не является выполненной review или clearance. Требования publication safety, provenance, asset references и playlist integrity определены в Final hardening production contract.

Workflow: approved semantics → interpretation → production profile → preset version → job/attempts → track/audio revision → independent QC/artistic/clearance → immutable playlist version → выпуск после разрешения Brand Owner. Ответственность и обязательные gates определены контрактом. Для параллельной работы назначать owner записи, уникальные IDs, менять отдельные entity files; конфликт approval/revision решать review, не last-write-wins. Git history дополняет явно сохранённые revision/decision records.

Аудио и закрытые rights documents вне Git; provider не выбран. Secrets и временные signed URLs запрещены. Production metadata не индексируется автоматически; scope/type registries RAG не расширяются. State interpretation не доказывает medical effect и не создаёт Product × State assignment. M1.2 не разрешает наполнение 11 States, реальные генерации, jobs/tracks, M2–M4 или runtime.
