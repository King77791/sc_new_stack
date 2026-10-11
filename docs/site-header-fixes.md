# Site Header — исправления поведения

Исправлена существующая реализация без новых dependencies, API, domain models,
страниц назначения или изменений unrelated code. Приоритет: текущий bug report,
сохранённые Figma contexts, затем поведение production сайта. Исходный визуальный
отчёт сохранён как архив в `site-header.md`.

## Причины и исправления по пунктам bug report

| Пункты | Причина | Исправление |
| --- | --- | --- |
| 1, 25 | В первой итерации interaction reference не определял поведение | Production сайт проверен в браузере; спорные top/scroll-up состояния реализованы по bug report, legacy код не переносился |
| 2 | Контакты были presentation spans | Настоящие mailto/tel anchors, hover underline и focus-visible |
| 3 | Действия были disabled либо без явного interactive cursor | Pointer только для anchors, buttons и summaries; disabled сохраняет default |
| 4 | Поиск был отключён в ожидании интеграции | Подключён открытый UI по сохранённому Figma context `145:45062`; autofocus, ввод, закрытие, Escape и восстановление focus |
| 5 | Навигационные действия ошибочно были buttons | Favorites и Basket — Next.js Links `/favorites`, `/basket` |
| 6 | Temporary products были приняты за main project navigation | Второй уровень содержит только четыре утверждённых раздела |
| 7 | Не было нужной анимации project links | Псевдоэлемент 1px, scaleX, transform-origin right, 180ms, без изменения геометрии |
| 8 | Каждый temporary navigation control открывал общий каталог | Только pointer hover ссылки «Каталог» открывает desktop menu; другие links закрывают его и выполняют navigation |
| 9 | Product labels были spans | Links `/product/{slug}`, данные title/slug передаются через presentation props |
| 10 | Category CTA был disabled button | Link `/catalog/{categorySlug}` для каждой выбранной категории |
| 11 | Переключение категории и navigation не разделялись | Category buttons меняют только presentation state, products/CTA — ссылки |
| 12 | Mobile logo зависел от ширины правых controls | Симметричные grid columns и центрированный logo slot; реальный mobile SVG 150×60, при <360px 130×52 |
| 13–17 | Header был в обычном потоке без scroll state | Fixed primary, исходно видимый второй уровень, collapse после порога, reveal вверх/hover, reset наверху |
| 18 | Не существовало scroll state model | Один passive listener с requestAnimationFrame, накоплением движения и cleanup |
| 19 | Не было animated collapse | Нижний уровень уходит translateY(-80px) за primary с z-index; постоянный spacer исключает content jump |
| 20 | Catalog state не координировался со scroll | Open panel удерживает navigation раскрытой; меню прилегает к nav root без hover-gap |
| 21 | Только общая desktop disclosure model | Mouse hover проверяет hover capability; mobile/tablet burger; отдельный keyboard/touch desktop disclosure button |
| 22 | Тип элемента выбирался по внешнему виду | Navigation — Link/anchor, state change — button, accordions — native details/summary |
| 23 | API отсутствует, прежнее ожидание API блокировало UI | Presentation props заменяемы; backend и домены не создавались |
| 24 | Новых design данных для исправлений не требовалось | Дополнительных Figma MCP calls: 0 |
| 26 | Первая проверка не покрывала нужное scroll/navigation behavior | Выполнены браузерные semantic, interaction, responsive и reduced-motion проверки |
| 27 | Старый отчёт описывал ошибочную модель | Этот отчёт фиксирует актуальное поведение и ограничения |

## Файлы и границы компонентов

Изменены `frontend/components/SiteHeader/SiteHeader.tsx`, `MainNavigation.tsx`,
`header-data.ts`, `SiteHeader.module.css`, `docs/site-header.md`.
Созданы `HeaderBehavior.tsx` и этот отчёт.

`SiteHeader` остаётся Server Component, принимает optional `categories` props,
формирует контакты, picture/logo и навигационные action Links на сервере.
Новый Client Component `HeaderBehavior` получает серверную разметку slots и
управляет scroll, hover, focus, Search и единственным panel state.
Существующий Client Component `MainNavigation` управляет category selection,
burger/menu и отображает presentation links. Весь SiteHeader в client не переведён.

## Навигация и меню

Main navigation: `/catalog`, `/delivery-payment`, `/events`, `/contacts`.
У «Каталог» сохранена настоящая ссылка; keyboard пользователь может Tab перейти
на соседний disclosure button и открыть menu через Enter/Space. Он виден при
focus-visible и на desktop без hover capability, не сдвигает layout.
Pointer переводится в menu через непрерывную область одного header/nav root:
menu стоит на `top:100%`, close delay не требуется. Другие project links не
открывают каталог. Escape, pointer outside и выход focus закрывают panel.

Desktop selectors изменяют selected category slug. В каждой категории только её
`items`, отдельный category CTA и локальное изображение. Mobile использует native
category accordions и те же данные. Burger остаётся CSS control с transform/opacity
burger↔X, aria-expanded/controls, keyboard support и reduced-motion. Mobile panel
блокирует body scrolling и восстанавливает прежние styles при закрытии.

## Scroll algorithm

Primary имеет 80px, navigation — 80px. Wrapper резервирует постоянные 160px
на desktop и 80px ниже breakpoint 1280px. Threshold измеряется из DOM:
1.5 × (primary height + navigation height), сейчас 240px.

Listener passive, один на mount; события объединяются requestAnimationFrame.
Направление определяется изменением scrollY от последней значимой позиции;
движения накапливаются до 4px, уменьшая дрожание и лишние state transitions.
Вниз после threshold устанавливает collapsed, вверх снимает его. Ниже threshold
минус 8px состояние сбрасывается; эта hysteresis исключает колебания у границы.
Hover верхней части, keyboard focus и открытый panel удерживают navigation видимой.
Начало страницы гарантированно сбрасывает collapse. Media listener закрывает panel
при переходе desktop↔tablet. Все listeners и pending animation frame очищаются.

Lower nav скрывается transform на свою высоту под primary, без display:none.
После transition visibility:hidden; inert немедленно исключает скрытые links из
Tab/pointer взаимодействия. Reduced-motion отключает transitions.

## Search и адаптивность

Search использует сохранённое пустое Figma состояние: панель 72px под primary,
form max-width 824px, 20px текст, underline, локальные search/close SVG, blur.
При открытии фокус переходит в поле; native form submit не вызывает backend или
fake results. Закрытие кнопкой очищает query; Escape закрывает и возвращает фокус,
введённый query сохраняется. Search и catalog/mobile panel взаимоисключающие.

Breakpoints сохранены: 1280px desktop/tablet (место для contacts/logo/actions),
800px spacing/actions, 600px mobile logo и typography, 360px compact spacing.
Симметричная сетка центрирует logo относительно доступной ширины viewport, включая
случай видимого scrollbar. Mobile logo переключается единственным picture source,
SVG файлы не изменены. Локальные fonts 400/500 и изображения переиспользованы.
Семь category images всё ещё rotate(90deg), accessories без rotation и с left clip.
Новые глобальные tokens, зависимости и копии assets не добавлены.

## Временные данные и отличия

Все шесть временных tea titles сохранены. Пять сгруппированы в demo black category,
длинный Gaba title — в oolong. Это исключительно UI grouping, не утверждение
ассортимента/классификации. Остальные категории имеют пустые items и рабочий CTA;
список намеренно не повторяется во всех категориях. Product slugs имеют `demo-`
prefix, category segments black/green/oolong/puer/red/white/gifts/accessories
временные до подтверждения navigation/backend data. Ни один slug не объявлен
production контрактом. Категории и items можно заменить через SiteHeader props.

Страницы назначения вне scope, поэтому сейчас дают 404. Это ожидаемое ограничение
проекта, не runtime exception Header. Search results/API отсутствуют намеренно.
Необходимы реальные product/category navigation data и файл Cera Pro Bold:
tablet accordion пока использует подтверждённый Medium 500, font synthesis выключен.
Accessories/gifts отдельного Figma состояния нет: ранее согласованная адаптация
clipping сохранена. Количество/тексты product positions отличаются от placeholders
Figma; длинный item переносится без ellipsis. X остаётся на позиции burger вместо
отдельной Figma close placement. Scroll top/up поведение следует bug report,
а не наблюдаемым спорным состояниям legacy сайта.

## Проверки

Chrome/CDP: 1920, 1600, 1280, 1279, 1024, 800, 799, 600, 599, 414, 390, 375,
360, 320px. Проверены anchors и URL, underline 1px/right origin/180ms, category
switching и CTA, products links, длинный title, hover Catalog→menu, другие hover,
keyboard disclosure/Enter/Escape/focus return, Search input/submit, collapse вниз,
reveal вверх/hover, pinned catalog, reset top, стабильный spacer, mobile logo centre,
overflow, native touch burger, reduced-motion и отсутствие runtime exceptions.
Scroll проверен с временным DOM spacer в браузере; Home content в код не добавлен.
Результат: 14 viewport widths, 0 runtime errors, все assertions пройдены.
Скриншоты desktop/tablet/mobile/Search сохранены во временном каталоге браузерной
проверки вне repository. `npm.cmd run lint` и `npm.cmd run build` успешно пройдены,
включая TypeScript validation. Production сервер запущен через `npm.cmd run start`.
Тот же браузерный набор повторно пройден на production build: 14 ширин,
все assertions успешны, runtime errors отсутствуют. Приложение доступно
на `http://localhost:3000`.

В текущей итерации Figma MCP calls отсутствуют: использованы уже полученные
concrete Header/menu/search contexts. Полный повторный анализ не выполнялся.
