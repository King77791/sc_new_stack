# Home Categories — implementation QA

CategoriesSection подключена после PromoSection. Это implementation task;
Incremental Code Review и Final Polishing не выполнялись. Статус READY/FROZEN
не присваивался.

## Реализация

- Server Component, один renderer и CSS Modules; без новых зависимостей.
- Shared identity/title/slug из `lib/site-data.ts`; отдельные явные UI fixture
  counts и full Home image mapping. Backend DTO/API не создавались.
- `productCount === 0` фильтруется до вычисления grid. Empty list возвращает null.
- Desktop recipes 4 / 3+2 / 4+2 / 4+3 / 4+4; tablet 2+2 / 3+2 / 2+2+2 /
  2+2+3 / 2+3+3; mobile пары с full-width последним нечётным элементом.
- N=1..3: один равномерный ряд на всех viewport. N>8: группы по четыре +
  равномерный остаток; tablet разбивает группы по четыре на пары, mobile — пары.
- Row lists используют desktop CSS Grid; на tablet/mobile `display: contents`
  позволяет внешней grid менять composition без дублирования ссылок/разметки.
- CSS breakpoints 1280 и 760 px согласованы с существующим Home PromoSection.
- Mobile title 20px/25px, count 12px/15px; между line boxes 8px.
- One whole-card `/category/{slug}` link, декоративное image alt="", lazy next/image.
- Image transition .5s ease-in-out. N=8 standard и N=7 enlarged: 40%→15%;
  wide: −50%→15%. Для N=5 wide использовано ближайшее утверждённое правило N=6;
  normal/medium: measured resting geometry и −85px motion.
- Underline локально повторяет Header: 1px, cream-gold, scaleX, right origin,
  180ms ease. Keyboard focus включает image/gradient/underline и outline.
- Skeleton статический: 4 desktop / 2×2 tablet-mobile, без fake текста,
  ссылок, shimmer, таймеров и искусственного loading на Home.

## Assets

Полные прозрачные PNG 480×480 экспортированы из Figma без редактирования:
black `145:46156`, green `145:46158`, white `145:46160`, red `145:46162`,
oolong `145:46166`, puer `145:46168`.

`public/images/categories` также содержит добавленные пользователем полные
assets `gifts.png` и `accessories.png`. Оба подключены в mapping
`categories.fixtures.ts`: изображения доступны для всех восьми категорий.
Header images не подменяют Home imagery. Поддержка явно отсутствующего
изображения через null сохраняется для будущих данных.

## Проверки данных и responsive

Через Chrome DevTools Protocol без установки browser dependencies проверены
77 browser cases: production Home на 12 ширинах и N=0..12 на пяти ширинах.

Home widths: 1920, 1440, 1280, 1279, 1024, 800, 768, 760, 759, 375, 360, 320.
Data widths: 1920, 1024, 768, 375, 320.

A–I проверены через восемь input categories и последовательное изменение
count на 0: visible N=8,7,6,5,4,3,2,1,0. J проверен для N=9,10,11,12.
Проверены количество ссылок, row composition, равномерная ширина cards,
отсутствие nested focus stops, title/count overlap, broken images и page overflow.
Для N=0 отсутствует nav/container. Ссылки сохраняют input order и `/category/`.

При обычном desktop scrollbar Chrome резервирует 15px: фактическая content
width меньше emulated viewport на 15px; cards корректно делят доступную ширину.
При layout width 1920 формулы дают Figma 445 / 602.67 / 912px.

Отдельный interaction smoke: hover всей card, pointer leave, gradient/underline,
Tab/Shift+Tab, focus-visible outline, Enter navigation, wide image −240→72px,
reduced-motion transitions off, touch tap navigation. Skeleton проверен на
1920/1024/375/320: четыре placeholders, card heights 180/120/100, без текста,
ссылок, animations и overflow.

Application console errors/hydration warnings не обнаружены на Home/data cases.
Навигация Enter/tap подтверждает `/category/black`; сам Catalog вне scope,
поэтому destination пока отвечает 404. Это не имитируется dummy category page.

Dev preview: `/dev/categories-section?visible=7`, `?visible=0`, `?visible=11`,
`?skeleton=1`. По конвенции проекта preview недоступен в production и noindex.

## Итоговые automated checks

- `npm.cmd run lint` — успешно, без autofix.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` — успешно.
- `npm.cmd run build` — успешно, production Home prerendered.
- `git diff --check` — успешно.
- На финальной production сборке повторно проверены Home HTTP 200, все 12
  ширин, formatter, загрузка шести decorative lazy images, отсутствие page
  overflow/text overlap/application console errors/hydration warnings.
- Production dev-preview HTTP 404 — ожидаемо по guard.
- Все измеренные ряды заполняют доступную ширину с правильными gaps;
  дополнительно проверены row recipes и остатки N=9..12.

Chrome/CDP, QA scripts и browser profiles были временными инструментами
проверки; новые test/browser dependencies в проект не добавлялись.

## Границы

ProductCard, PromoSection, PromoBanner, UpcomingEventPromo, DailyTop,
Header/Footer и их routes не изменены. AGENTS.md дополнен durable Categories
contract. Fixture counts не являются бизнес-данными production.
