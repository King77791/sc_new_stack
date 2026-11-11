# Music System

Канонический общебрендовый контракт, материализованный в Patch v0.1.1.

> **Stolitsa Chaya Sound**

Все State-направления являются частями одной музыкальной идентичности бренда, а не 11 несвязанными музыкальными проектами. Будущие `states/{state_id}/music.md` подчиняются этому общему контракту и [State System](state-system.md).

State-specific документы в перспективе могут определять BPM/range, rhythm, harmony, dynamics, texture, density, instrumentation, vocals, space, emotional arc, prompt strategy, negative directions, naming и playlist/album cohesion. Конкретные значения здесь не задаются.

Музыка может сопровождать State, использоваться на product pages и в контенте, формировать узнаваемую аудиоидентичность бренда. Музыкальная интерпретация State не является доказательством физиологического воздействия; применима [claims-policy](claims-policy.md).

Сейчас фиксируется только общий контракт: треки, конкретные BPM для States, Suno prompts и runtime музыкальных интеграций не создаются.

## M1.2 — Music Production Architecture v1.0

Новое ограниченное разрешение от 2026-11-12 материализует [production contract](../docs/architecture/06-music-production-contract.md), [policies и незаполненные templates](../music/README.md). Общая музыкальная identity выше сохраняется. Canonical semantics → music interpretation → production profile → preset → job/attempt → track/audio revision → playlist. Семантика State не копируется; без approved semantics interpretation/profile остаются незаполненными или draft. Реальные треки, presets и State profiles не создаются. [Vocal Policy](../music/playlist-vocal-policy.md) и [QC](../music/quality-control.md) нормативны для будущего производства, не medical claims. Approval, technical QC и publication clearance независимы; production metadata не получает автоматического RAG допуска.
