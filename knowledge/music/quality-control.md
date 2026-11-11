# Music Quality Control v1.0

Нормативное приложение к [Music Production Contract](../docs/architecture/06-music-production-contract.md). QC, художественное решение и разрешение публикации независимы; общий boolean approved запрещён.

## Technical QC

Technical Reviewer проверяет clipping, clicks/pops, dropout, нежелательные скачки громкости, генеративные артефакты, начало/окончание, чистоту вокала, разборчивость lyrics, checksum и соответствие заявленной audio revision, пригодность для listening context. Для отсутствующего вокала отмечать not applicable с основанием. На уровне playlist также проверять последовательность, переходы и доступность всех точных assets. LUFS, true peak и export formats не нормируются до утверждения каналов публикации.

## Artistic approval

Brand Owner оценивает соответствие State через утверждённую interpretation, точному production profile, эмоциональную выразительность, arrangement, жанровую/тембровую целостность, разнообразие playlist и субъективную пригодность к длительному прослушиванию. Отсутствующая semantics не разрешает художественно утверждать вымышленный профиль. Проверить [Vocal Policy](playlist-vocal-policy.md) и документировать допустимые исключения.

## Publication clearance

Rights Reviewer проверяет provenance, основание использования, права и ограничения, доступность подтверждений и разрешённый способ распространения; незакрытые юридические вопросы блокируют clearance. Подписка на Suno автоматически не подтверждает права. Закрытые документы вне Git, в records только устойчивые безопасные references. После rights review Brand Owner отдельно даёт final_authorization для точной revision и способа распространения.

## Records и gates

Каждое решение содержит status, reviewer, reviewed_at, target_revision, remarks или evidence_ref. Track records находятся внутри соответствующей audio revision и привязаны к её checksum; playlist records адресуют content_revision фиксированной playlist_version. Clearance содержит самостоятельные rights_review и final_authorization.

technical_qc: pending / passed / failed. artistic_approval: pending / approved / rejected. publication_clearance: pending / cleared / denied / revoked. Ready требует passed + approved + cleared без hold, с полными references и положительными rights_review/final_authorization. Для playlist это относится и ко всем entries; N=0 блокирует выпуск. Любой missing/unknown/negative gate блокирует ready/published. Новые revisions требуют новых решений. Revocation/hold останавливают использование независимо от прежнего статуса; причину и последствия для playlists документировать.

Music Producer ведёт attempts и первичный QC; Technical Reviewer отвечает за техническое решение, Rights Reviewer — rights review, Brand Owner — направление, artistic approval и окончательное разрешение публикации. Совмещение ролей допустимо, объединение записей — нет. Codex может проверить заполненность, но не присваивает художественное или юридическое approval.
