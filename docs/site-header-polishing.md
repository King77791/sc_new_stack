# Site Header polishing

Точечная итерация после `site-header-fixes.md`: scroll state, listeners,
catalog triggers и Server/Client boundaries не изменены.

- Underline раньше явно включал `.contacts a`, а product hover отдельно использовал
  text-decoration. Теперь animated pseudo-element принадлежит только классу
  `mainNavigationLink`, назначенному четырём desktop main links. Contacts и остальные
  links не имеют underline; product hover меняет цвет. Focus outlines сохранены.
- Обе category CTA имеют текст «Перейти в каталог», white-space:nowrap, icon
  flex:0 0 32px. Существующая ширина 280px и max-width сохранены; ниже 600px CTA
  display:none (включая исключение из keyboard navigation).
- Ниже 600px верхний Favorites скрыт, внутри burger он первая карточка перед
  каталогом: 20px/400, padding 8px 16px, gap 8px, icon box 40px, radius 12px,
  white 5% background. Mobile menu gutter 16px; первая карточка y=72px рядом
  с Figma y≈70px. Остальной menu layout не переписывался.
- Две responsive link representations имеют общий источник href/label/icon
  `favoritesNavigation`; одновременно виден только один entry. Tablet и desktop
  сохраняют верхний link; route `/favorites` и production `favorite_ic.svg` сохранены.
- Logo по-прежнему центрируется независимой симметричной grid-сеткой.

Изменены SiteHeader.tsx, MainNavigation.tsx, header-data.ts и SiteHeader.module.css.
HeaderBehavior.tsx, глобальные tokens, assets и зависимости не изменены.

Figma: один get_design_context для `145:48090`, с встроенным screenshot; определил
позицию и параметры Favorites. Отдельных screenshot/metadata/variables/assets calls
не было. Ранее прочитанные design-to-code инструкции сохраняют силу.

Lint и production build (включая TypeScript) проходят. Отдельные browser checks
прошли на 1920/1024/600/599/375/320px: underline scope, nowrap, responsive CTA и
Favorites visibility, локальная иконка, logo centre (<0.6px), overflow, runtime.
Скриншот 375px визуально проверен.

Подтверждено пользователем: используются Cera Pro 400/500; Bold в Figma неактуален,
его отсутствие не является blocker, technical debt или visual difference.
Сохранённые отличия:
CSS X остаётся на позиции burger, остальные размеры существующего mobile menu
не приведены заново к новому reference вне scope. В reference меньше категорий и
другие secondary links; утверждённые project routes и категории сохранены.

Финальная косметическая правка: `.bar::after` — нижний divider высотой 1px,
белый gradient 0/0.5/0, pointer-events:none. Родитель уже position:relative,
дополнительный DOM и изменения высоты не требуются.
Статус Header: **ALMOST DONE**. Визуальная, responsive и client interaction часть
завершена; оставшаяся интеграция backend data/API не блокирует развитие frontend.
