# AGENTS.md — Столица чая / sc_new_stack

## 1. Назначение проекта

`sc_new_stack` — новый frontend интернет-магазина «Столица чая».

Проект создаётся как новая реализация существующего магазина с обновлённым UI/UX и современной frontend-архитектурой.

Новый frontend не должен механически копировать техническую реализацию существующего сайта.

Существующий сайт, Figma, локальные стили и backend имеют разные роли и не являются взаимозаменяемыми источниками информации.

---

## 2. Основные источники истины

При работе над проектом используй следующую иерархию источников.

### Figma — источник истины для UI/UX

Основной Figma-проект:

[https://www.figma.com/design/VZ3bfelRsFChkn6WVuy2yg/%D0%A1%D1%82%D0%BE%D0%BB%D0%B8%D1%86%D0%B0-%D0%A7%D0%B0%D1%8F---%D0%B2%D1%91%D1%80%D1%81%D1%82%D0%BA%D0%B0?node-id=0-1&t=qwVmLU07NyhMDdSh-1](https://www.figma.com/design/VZ3bfelRsFChkn6WVuy2yg/%D0%A1%D1%82%D0%BE%D0%BB%D0%B8%D1%86%D0%B0-%D0%A7%D0%B0%D1%8F---%D0%B2%D1%91%D1%80%D1%81%D1%82%D0%BA%D0%B0?node-id=0-1&t=qwVmLU07NyhMDdSh-1)

Для получения данных из Figma используй подключённый Figma MCP.

Figma определяет:

- структуру интерфейса;
- визуальную композицию;
- расположение элементов;
- размеры;
- spacing;
- типографику;
- цвета;
- состояния компонентов;
- адаптивные варианты;
- изображения и графические элементы;
- design variables/tokens, если они определены в Figma.

При реализации конкретного интерфейса сначала изучи соответствующий Figma Frame/Node через MCP.

Не пытайся воспроизводить дизайн по памяти или только по скриншоту, если необходимые данные доступны через Figma MCP.

---

### Локальные стили — визуальный и исторический reference

В проекте присутствуют CSS-файлы существующей реализации.

Они используются для:

- понимания существующей визуальной системы;
- поиска значений и состояний, которые могут быть полезны при переносе;
- понимания поведения существующих элементов;
- восстановления деталей, которые неочевидны из Figma.

Legacy CSS не является безусловным источником истины.

Если старые CSS конфликтуют с новым Figma-дизайном, приоритет имеет Figma.

Не переносить legacy CSS механически.

Не переносить устаревшие селекторы, DOM-зависимости, хаки и большое количество старых media queries без необходимости.

---

### Существующий сайт — reference бизнес-сценариев и семантики

Текущий сайт «Столицы чая»:

[https://stolica-chaya.ru/](https://stolica-chaya.ru/)

Используй его для понимания:

- назначения элементов;
- пользовательских сценариев;
- структуры каталога;
- поведения карточек товаров;
- корзины;
- оформления заказа;
- существующего контента;
- терминологии;
- общей бизнес-логики, доступной пользователю.

Не считай публичный HTML/JS/CSS текущего сайта точным описанием новой архитектуры.

Не восстанавливай backend-контракты исключительно по поведению публичного сайта.

Новый frontend не обязан повторять техническую реализацию legacy-сайта.

---

### Backend/API — будущий источник истины для данных и серверной бизнес-логики

Полный backend-контракт на текущем этапе ещё не предоставлен.

До получения backend/API:

- не придумывай API endpoints;
- не считай предполагаемые DTO окончательными;
- не фиксируй неизвестные backend-контракты как факт;
- не реализуй mock API как будто это окончательная интеграция;
- явно отмечай места, зависящие от будущего API.

После предоставления backend/API необходимо отдельно проанализировать:

- endpoints;
- request/response DTO;
- модели данных;
- товары и варианты товаров;
- категории;
- цены;
- остатки;
- корзину;
- избранное;
- checkout;
- доставку;
- оплату;
- пользовательскую сессию/авторизацию;
- ошибки API.

После анализа backend предложи необходимые изменения архитектуры и этого AGENTS.md.

Не изменяй архитектурные правила молча.

---

## 3. Текущий утверждённый frontend stack

Базовый стек:

- Next.js;
- App Router;
- React;
- TypeScript;
- обычный CSS;
- CSS Modules для локальных стилей компонентов.

Предпочтителен server-first подход.

Используй Server Components по умолчанию там, где клиентская интерактивность не требуется.

Client Components используй для интерактивных областей.

На текущем этапе не добавляй без необходимости:

- Redux;
- Zustand;
- крупные UI frameworks;
- CSS frameworks;
- дополнительные state-management библиотеки;
- дополнительные abstraction layers.

Новая зависимость должна решать конкретную проблему проекта.

Не добавляй библиотеку только потому, что это распространённое решение.

---

## 4. Архитектурные принципы

Предполагаемое разделение ответственности:

### `app`

Маршрутизация, layouts, страницы, metadata и композиция страниц.

### `components`

Общие UI-компоненты и элементы layout, не принадлежащие одной конкретной бизнес-фиче.

Примеры:

- Button;
- TextField;
- Dialog;
- Container;
- SiteHeader;
- SiteFooter.

### `features`

Предметные области приложения.

Например:

- home;
- catalog;
- product;
- cart;
- favorites;
- checkout;
- content.

Создавай feature только тогда, когда она действительно появляется в реализации.

Не создавай заранее пустые директории и архитектурные заготовки.

### `lib`

Инфраструктурный код:

- API client;
- API adapters;
- форматирование;
- небольшие технические utilities.

### `types`

Типы и domain models, которые используются несколькими областями приложения.

### `styles`

Глобальная визуальная основа:

- tokens.css;
- fonts.css;
- reset.css;
- globals.css.

### `public`

Статические ресурсы приложения:

- fonts;
- icons;
- static images;
- decorative assets.

---

## 5. Компонентная архитектура

Перед созданием нового компонента всегда проверь существующий код проекта.

Не создавай новый компонент, если существующий компонент может решить задачу без нарушения его ответственности.

Не создавай универсальные абстракции заранее.

Выделяй общий компонент только тогда, когда действительно совпадают:

- назначение;
- структура;
- поведение.

Разные визуальные состояния одной сущности не обязательно должны быть разными React-компонентами.

Например:

- обычный товар;
- товар со скидкой;
- предзаказ;

могут быть состояниями `ProductCard`, если их структура и поведение позволяют это.

Desktop, tablet и mobile не должны автоматически становиться отдельными React-компонентами.

Предпочитай общую семантическую структуру и responsive CSS.

Разделяй разметку только там, где UX действительно существенно различается.

---

## 6. Design System

Основу глобальных стилей предполагается разделить на:

- `tokens.css`;
- `fonts.css`;
- `reset.css`;
- `globals.css`.

CSS Modules располагаются рядом с соответствующими компонентами.

Используй существующие design tokens вместо дублирования literal values, если подходящий token уже существует.

Для общих интерактивных элементов учитывай состояния:

- default;
- hover;
- focus-visible;
- active;
- disabled;
- loading;
- invalid.

Не создавай полноценную theme system без продуктовой необходимости.

---

## 7. Responsive design

Основные Figma layouts:

- Desktop — 1920 px;
- Tablet — 1024 px;
- Mobile — 375 px.

Эти размеры являются контрольными макетами, а не единственными поддерживаемыми viewport.

Интерфейс должен корректно работать и между контрольными размерами.

Не копируй legacy breakpoints механически.

Выбирай breakpoint исходя из поведения layout.

При реализации responsive-компонента сначала изучи все доступные варианты соответствующего компонента/экрана в Figma.

---

## 8. Product Domain Model v0.1

Этот раздел описывает предметную модель продукта интернет-магазина
«Столица чая».

Это domain specification, а не окончательная схема backend API,
database schema или набор TypeScript interfaces.

Product Domain Model v0.1 является утверждённым описанием текущей
бизнес-логики продукта «Столицы чая».

Не создавай backend DTO или API models на основании этого раздела.
Backend API будет предоставлен позже и должен быть отдельно сопоставлен
с этой domain model до определения конкретных моделей интеграции.

Цель раздела — зафиксировать бизнес-смысл сущностей и правила,
которые frontend и backend должны соблюдать независимо от конкретной
реализации API.

Legacy frontend содержит ряд плоских полей продукта. Новая архитектура
не должна механически воспроизводить эту структуру.

Backend DTO и frontend domain models могут отличаться.
При необходимости между ними должен использоваться adapter layer.

---

### 8.1. Product

`Product` — основная товарная сущность магазина.

Продукт должен описывать сам товар и его устойчивые характеристики,
но не должен становиться контейнером для всех связанных данных,
пользовательского состояния и вычисляемой бизнес-логики.

На текущем этапе Product концептуально включает:

- identity;
- classification;
- physical characteristics;
- brewing information, если применимо;
- media/content;
- commerce-related references;
- relations with other products.

Точная TypeScript-модель должна быть определена после сопоставления
domain model с backend API.

---

### 8.2. Product Identity

К идентичности продукта относятся:

- `id` / legacy `productUid`;
- `title` / legacy `productTitle`;
- `slug` / legacy `productSlug`;
- `sku` / legacy `productSKU`.

`slug` используется для формирования человеко-понятных URL.

SKU является уникальным артикулом Product.

В текущей бизнес-модели изменение фасовки или выбранного веса
не изменяет SKU продукта.

Не создавай отдельный SKU для каждой фасовки без изменения
бизнес-требований или backend contract.

Legacy naming не должен распространяться по новой кодовой базе без
необходимости.

Предпочтительные domain names:

- `id`;
- `title`;
- `slug`;
- `sku`.

---

### 8.3. Product Classification

Product может быть связан с несколькими независимыми
классификаторами:

- `Category`;
- `Country`;
- `Origin`;
- `Mood[]`;
- `Taste[]`.

Эти сущности имеют разный бизнес-смысл и не должны автоматически
объединяться.

---

### 8.4. Category

`Category` — самостоятельная сущность каталога.

Legacy frontend использует:

- `productCategoryId`;
- `productCategoryTitle`;
- `productCategorySlug`;
- `productCategoryYmCode`.

Концептуально Category содержит как минимум:

- id;
- title;
- slug.

Категория участвует в:

- структуре каталога;
- навигации;
- фильтрации;
- формировании URL;
- применении некоторых promotion rules.

`productCategoryYmCode` относится к analytics metadata
для Яндекс.Метрики и не является фундаментальной частью
предметной модели Category.

Analytics metadata не должна определять архитектуру Product.

---

### 8.5. Country

`Country` и `Origin` являются разными сущностями.

В пользовательской терминологии Country = «Страна», Origin = «Регион» /
более точное происхождение. Например: Китай → Юньнань, Тайвань → Алишань.
Континент не заменяет Country или Origin в текущей Product domain model.
Не превращать неоднозначные Figma-подписи вроде «Африка» автоматически
в domain semantics. Будущая Catalog filtering/navigation должна различать
Country и Origin; окончательные routes определяются на этапе Catalog.

Country используется как самостоятельный классификатор товара и
как часть визуального представления региона на клиенте.

Country может использоваться для:

- фильтрации каталога;
- отображения страны происхождения;
- выбора стилизованного визуального представления;
- отображения country icon;
- отображения country background.

Legacy данные:

- `productCountryTitle`;
- `productCountrySlug`;
- `productCountryIcon`;
- `productCountryBG`;

не должны автоматически интерпретироваться как Origin.

В новой модели данные страны должны быть отделены от более точного
географического происхождения продукта.

Концептуально Country может содержать:

- id;
- title;
- slug;
- icon;
- background image.

Конкретная структура определяется backend contract.

---

### 8.6. Origin

`Origin` описывает более точное происхождение продукта.

Это может быть:

- регион;
- провинция;
- местность;
- чайный район;
- плантация;
- другое конкретное место происхождения.

Origin используется независимо от Country и может участвовать
в фильтрации каталога.

Пример:

Country:
`Taiwan`

Origin:
`Alishan`

Product:
`Габа Улун из Алишаня`

Не ограничивай Origin только уровнем страны.

Архитектура должна позволять в будущем расширять географическую
детализацию без изменения базовой модели Product.

---

### 8.7. Mood

`Mood` — самостоятельная бизнес-сущность.

Legacy field:
`productMoodsSetting`.

Один Product может быть связан максимум с 3 Mood.

Для Tea утверждено от 1 до 3 Mood; для Ceramics Mood отсутствуют.

Mood описывает состояние, для которого продукт может быть выбран
пользователем.

Примеры:

- концентрация;
- энергия;
- гармония;
- баланс;
- сон;
- уверенность.

Mood является частью продуктовой концепции «Столицы чая»
«Управляй состоянием!» и не является только декоративным текстом
карточки товара.

Mood может использоваться для:

- фильтрации каталога;
- навигации;
- рекомендаций;
- подборок;
- product discovery;
- отображения в ProductCard/ProductPage.

Не объединяй Mood с Taste.

---

### 8.8. Taste

`Taste` — самостоятельный классификатор вкусовых характеристик
продукта.

Legacy field:
`productTastes`.

Один Product может быть связан максимум с 3 Taste.

Taste может использоваться для:

- отображения характеристик;
- фильтрации;
- поиска;
- рекомендаций.

Taste и Mood являются независимыми сущностями.

---

### 8.9. Physical Characteristics

Физические характеристики Product зависят от типа товара.

Не предполагай, что каждый Product имеет вес или объём.

Примеры физических характеристик:

- harvest year;
- fixed weight;
- volume;
- другие type-specific characteristics.

Legacy `productYear` соответствует году урожая там, где это применимо.

---

### 8.10. Weight

Вес имеет разный бизнес-смысл в зависимости от способа продажи
продукта.

Не используй одно поле `weight` без понимания его семантики.

#### Weight-based products

Для весового чая выбранный вес является purchase configuration.

Например:

- 50 g;
- 100 g;
- 200 g;
- 250 g.

Базовые Purchase Configuration для весового Tea: 50 / 100 / 200 / 250 г.
Фактически доступные configurations определяет backend по stock;
frontend не вычисляет их доступность самостоятельно. Набор доступных
весов может отличаться между продуктами; глобальный hardcoded selector
для всех товаров не вводится.

Не hardcode глобальный список доступных весов для всех чаёв.

#### Fixed-weight piece products

Прессованный чай может продаваться в штуках, при этом каждая штука
имеет фиксированный физический вес.

Примеры:

- 75 g;
- 100 g;
- 357 g;
- другие значения.

Фиксированный вес должен быть гибким числовым значением.

Не ограничивай его enum из известных на данный момент весов.

Пример:

Product:
`Шу Пуэр`

Sale unit:
`piece`

Physical weight:
`357 g`

Quantity:
`1, 2, 3...`

---

### 8.11. Approximate Weight

Некоторые весовые продукты имеют физическую форму, из-за которой
невозможно гарантировать абсолютно точный фактический вес выбранной
фасовки.

Пример:
`Бу Бу Гао Шен` реализуется в форме отдельных шариков.

Пользователь может выбрать номинальный вес, например 100 g,
но фактически отпускаемый вес может немного отличаться.

Не проектируй механизм tolerance или actual weight без отдельного
бизнес-требования и backend contract.

Однако архитектура не должна исходить из предположения, что
номинальный вес всегда физически равен фактическому весу с абсолютной
точностью.

---

### 8.12. Volume

Объём является физической характеристикой некоторых Product,
например чайников.

Пример:

Product:
`Чайник «Морское ушко»`

Sale unit:
`piece`

Volume:
`180 ml`

Volume не является единицей продажи.

Не моделируй 180 ml как PurchaseOption, если товар продаётся как
один физический предмет.

---

### 8.13. BrewingGuide

Legacy frontend использует:

- `productPreparingTime`;
- `productTemperature`;
- `productCountPerPiece`;
- `productAmountUses`.

Эти значения логически относятся к рекомендациям по приготовлению
продукта и могут быть представлены domain entity/value object
`BrewingGuide`.

Концептуально BrewingGuide может включать:

- infusion/preparing time;
- recommended temperature;
- recommended amount per brewing;
- recommended infusion/use count.

Не изменяй типы этих значений и не вводи min/max структуры
без подтверждения backend contract или отдельного бизнес-требования.

BrewingGuide применяется только к продуктам, для которых эти данные
имеют смысл.

---

### 8.14. Media

Legacy `productImg` представляет основное изображение продукта.

Новая модель должна позволять как минимум:

- main image;
- product gallery.

Media не должна ограничиваться одним legacy `productImg`.

Production media source должен определяться backend/CMS architecture.

Временные Figma URLs не являются production media URLs.

---

## 8.15. Purchase Configuration

Способ покупки Product не должен смешиваться с его устойчивыми
характеристиками.

В зависимости от типа товара пользователь может выбирать:

- вес;
- количество;
- либо только количество при фиксированных характеристиках товара.

До получения backend API не фиксируй окончательное название
`ProductVariant`, `PurchaseOption` или другого DTO.

Используй концепт `Purchase Configuration` для описания выбранного
способа покупки Product.

Purchase Configuration пока является domain concept, а не утверждённым
TypeScript interface.

Не создавай ProductVariant только потому, что он присутствовал
в предыдущем архитектурном предложении.

---

### 8.16. Weight-based Tea Purchase

Весовой чай продаётся посредством выбора доступного веса.

Пример:

`Да Хун Пао`

Available nominal weights:

- 50 g;
- 100 g;
- 200 g;
- 250 g.

Выбранный вес влияет на:

- количество товара, резервируемого из stock;
- цену позиции;
- identity строки корзины.

Выбранный вес не изменяет SKU Product в текущей бизнес-модели.

Набор доступных весов может отличаться между Product.

---

### 8.17. Piece-based Purchase

Некоторые товары продаются в штуках.

Примеры:

- прессованный чай;
- керамика;
- аксессуары;
- подарочные наборы.

`unit = piece` само по себе не определяет правила Product.

Не выводи бизнес-поведение только из единицы измерения.

Например:

- прессованный чай продаётся в штуках и имеет fixed physical weight;
- чайник продаётся в штуках и может иметь volume;
- подарочный набор продаётся в штуках и имеет composition.

---

## 8.18. Inventory / Stock

Stock является server-authoritative business data.

Frontend не должен самостоятельно определять фактический остаток.

Stock имеет различную семантику для weight-based и piece-based
товаров.

### Weight-based stock

Для весового продукта stock выражает доступное количество продукта
по весу.

Пример:

Product:
`Да Хун Пао`

Available stock:
`60 g`

Purchase options:

- 50 g — available;
- 100 g — unavailable;
- 200 g — unavailable;
- 250 g — unavailable.

Purchase option должна быть доступна только если текущего stock
достаточно для выбранного веса.

Количество также должно учитывать stock.

Например при stock = 170 g:

- 50 g × 3 может быть доступно;
- 50 g × 4 недоступно;
- 100 g × 1 может быть доступно;
- 100 g × 2 недоступно.

Нельзя использовать простое правило `stock > 0` для определения
доступности весового товара.

### Piece-based stock

Для штучного товара stock выражает доступное количество физических
единиц.

Пример:

Ceramic teapot:
`stock = 1`

Maximum selectable quantity:
`1`

Если stock = 3, максимальное количество не должно превышать 3.

### Unique products

Не вводи `isUnique` только для ограничения количества уникальной
керамики, если эту задачу полностью решает stock.

Например, уникальный чайник может естественным образом иметь:

`stock = 1`.

Добавляй отдельное понятие uniqueness только если появится
самостоятельная бизнес-логика, которой недостаточно stock.

---

## 8.19. Availability

Availability не должна определяться одним boolean.

На уровне предметной области необходимо различать как минимум:

- in stock;
- out of stock;
- preorder.

Не фиксируй конкретный enum до получения backend contract,
но не создавай набор противоречащих друг другу boolean states,
если этого можно избежать.

---

### 8.20. Pre-order

Legacy field:
`isPreOrder`.

Pre-order имеет специальный бизнес-смысл в «Столице чая».

Pre-order используется для товаров, которых в данный момент нет
в наличии и спрос на которые магазин хочет проверить до принятия
решения о вводе/возврате товара в ассортимент.

Следовательно:

`stock = 0` не всегда означает одинаковое пользовательское состояние.

Пример:

`stock = 0 + preorder disabled`
→ обычное отсутствие товара.

`stock = 0 + preorder enabled`
→ сценарий предзаказа.

Не интерпретируй preorder автоматически как обычную продажу
будущего складского поступления.

Конкретная backend-механика preorder должна быть определена отдельно.

---

## 8.21. Pricing

Pricing является server-authoritative business logic.

Legacy frontend в настоящее время рассчитывает часть цены на клиенте.
Это legacy behavior и не должно переноситься в новую архитектуру.

Для весового товара цена выбранной фасовки в новой системе должна
приходить от backend либо подтверждаться backend.

Frontend не должен быть источником истины для расчёта цены.

Backend может внутри рассчитывать цену из базовой стоимости или
хранить отдельные значения — это backend implementation detail.

Frontend должен работать с подтверждённым pricing result.

Концептуально pricing может содержать:

- base/original price;
- final price;
- applied discount information.

Не фиксируй окончательный DTO до получения backend contract.

---

## 8.22. Discounts and Promotions

Legacy field:
`productDiscount`.

Скидка в текущей системе задаётся в процентах.

Скидки могут применяться:

- к отдельной группе товаров;
- к категории товаров;
- через promo code к корзине.

Например, promotion может применяться ко всем зелёным чаям
или ко всем пуэрам.

Скидка на Product в текущей модели распространяется на все его
весовые фасовки.

Расчёт скидок не должен выполняться frontend.

Backend должен определять:

- применимые promotions;
- приоритет promotions;
- возможность их совместного применения;
- итоговую скидку;
- final price.

Frontend отвечает за отображение результата.

Не распространяй legacy `productDiscount` как фундаментальное поле
Product, если backend model представляет promotion иначе.

---

## 8.23. Favorites

Legacy field:
`isWishedProduct`.

Favorite status не является внутренней характеристикой Product.

Это user/session state, описывающее отношение текущего пользователя
к Product.

Один и тот же Product может быть favorite для одного пользователя
и не быть favorite для другого.

Не включай `isWishedProduct` в фундаментальную domain model Product
только потому, что legacy frontend получает это значение вместе
с Product.

Конкретный механизм хранения favorites будет определён после
получения backend/session contract.

До API разрешено только локальное presentation/interactivity testing:
empty → click → filled и filled → click → empty. После reload состояние
может возвращаться к исходным mock data. Не создавать fake API,
localStorage persistence, фиктивную server synchronization или ложную
бизнес-логику Favorites.

---

## 8.24. Gift Sets

Подарочный набор является полноценным самостоятельным Product.

Gift Set имеет собственные:

- id;
- SKU;
- title;
- slug;
- price;
- stock;
- availability;
- media/content;
- другие применимые характеристики Product.

Gift Set не является динамическим bundle, который автоматически
собирается из текущих розничных остатков входящих товаров.

Товар для подарочных наборов резервируется отдельно.

Следовательно, retail stock отдельного чая и stock Gift Set
являются независимыми inventory quantities.

Изменение розничного stock входящего Product не должно автоматически
изменять stock готового Gift Set.

---

### 8.25. Gift Set Composition

Gift Set может содержать `composition`, описывающий входящие в набор
товары.

Legacy field:
`productGiftSet`.

Не считай legacy array окончательной моделью composition.

Концептуально:

Gift Set Product
→ Composition Items
→ referenced Products.

`CompositionItem` может в будущем содержать дополнительные данные,
например количество или конкретную конфигурацию входящего товара.

Не фиксируй окончательную структуру до получения backend contract.

---

### 8.26. Reverse Gift Set Relation

Для отдельного Product может быть полезно получать список Gift Set,
в которые он входит.

Пример:

`Да Хун Пао`
→ входит в `Мастерская вкуса`
→ входит в другой Gift Set.

Эта связь может использоваться для:

- cross-sell;
- рекомендаций;
- блока «Входит в наборы» на ProductPage.

Не создавай два независимых вручную поддерживаемых источника истины:

- GiftSet → Products;
- Product → GiftSets.

Backend/data model должен иметь один авторитетный relationship.

Обратная связь Product → GiftSets должна вычисляться или
предоставляться API на основании этого relationship.

---

# 8.27. Cart Domain Rules

Cart является отдельной domain area и не является локальным
представлением Product.

Cart должен быть server-authoritative.

Frontend может использовать optimistic/local state для UX только
при условии последующей серверной валидации.

Backend является источником истины для:

- availability;
- stock;
- current price;
- discounts;
- promo codes;
- cart totals;
- delivery-related totals;
- возможности оформления заказа.

До появления Cart/API разрешено только необходимое локальное
presentation/interactivity behavior для тестирования ProductCard.
Не создавать fake Cart API, localStorage Cart, фиктивную server
persistence или frontend-authoritative commerce logic.

---

### 8.28. CartItem Identity

Строка корзины определяется не только Product.

Для товаров с выбираемой конфигурацией логическая identity строки:

`Product + selected Purchase Configuration`.

Пример:

`Да Хун Пао + 50 g`

и

`Да Хун Пао + 100 g`

являются разными CartItem.

При этом они относятся к одному Product и имеют один SKU
в текущей бизнес-модели.

---

### 8.29. Changing Weight Inside Cart

Пользователь должен иметь возможность изменить выбранный вес
весового Product непосредственно в корзине.

Не заставляй пользователя возвращаться на ProductPage только для
изменения фасовки.

Пример:

Cart:

- `Да Хун Пао — 50 g × 1`;
- `Да Хун Пао — 100 g × 1`.

Пользователь изменяет первую строку:

`50 g → 100 g`.

Если Cart уже содержит строку того же Product с resulting Purchase
Configuration `100 g`, строки должны быть объединены.

Результат:

`Да Хун Пао — 100 g × 2`.

Не оставляй две идентичные строки CartItem после изменения
Purchase Configuration.

---

### 8.30. Cart Merge Rule

При изменении Purchase Configuration или добавлении товара:

если Cart уже содержит:

- тот же Product;
- ту же resulting Purchase Configuration;

Cart должен объединить строки путём увеличения quantity.

Концептуально:

`same Product + same Purchase Configuration = one CartItem`.

Это business rule, а не только UI behavior.

Окончательное объединение и проверка должны подтверждаться backend.

---

### 8.31. Cart Stock Validation

Cart должен учитывать фактический stock.

Для weight-based Product суммарный запрошенный вес не должен
превышать доступный stock.

Для piece-based Product суммарное quantity не должно превышать
доступное количество физических единиц.

Наличие Product в Cart не гарантирует, что тот же stock будет
доступен позже.

Backend должен повторно валидировать Cart при изменениях и checkout.

---

### 8.32. Cart Recalculation

Сохранённые ранее:

- price;
- discount;
- availability;
- stock-derived limits;

не должны считаться постоянной истиной.

При восстановлении Cart и перед оформлением заказа backend должен
иметь возможность вернуть актуальное состояние.

Пример:

пользователь добавил вчера:

`Да Хун Пао — 100 g × 2` со скидкой 15%.

Сегодня:

- stock изменился;
- promotion закончилась.

Frontend должен отображать актуальные данные backend, а не
продолжать использовать сохранённую локальную цену и скидку.

---

# 8.33. Non-negotiable Product Business Rules

Следующие правила считаются зафиксированными бизнес-инвариантами
проекта на текущем этапе.

Не изменяй их без явного изменения требований.

1. `Country` и `Origin` — разные сущности.

2. `Mood` и `Taste` — разные сущности.

3. Один Product может иметь до 3 Mood.

4. Один Product может иметь до 3 Taste.

5. SKU относится к Product и в текущей бизнес-модели не меняется
   при выборе другой весовой фасовки.

6. Набор доступных весов может отличаться между Product и не должен
   быть глобально hardcoded.

7. Для weight-based Product доступность конкретного веса зависит
   от фактического остатка продукта.

8. `stock > 0` недостаточно для определения доступности weight option.

9. Для piece-based Product количество ограничивается фактическим stock.

10. Не использовать `unit = piece` как достаточное основание для
    определения поведения Product.

11. Fixed physical weight и sale quantity являются разными понятиями.

12. Volume и sale unit являются разными понятиями.

13. Для некоторых весовых Product номинальный и фактический вес
    могут немного различаться.

14. Frontend не является источником истины для price calculation.

15. Frontend не является источником истины для discount calculation.

16. Frontend не является источником истины для stock.

17. Backend должен подтверждать final price, discounts и availability.

18. Category/group promotions могут применяться к нескольким Product.

19. Promo code является cart-level promotion mechanism и должен
    обрабатываться backend business logic.

20. `isWishedProduct` является user/session state, а не свойством
    фундаментальной Product domain model.

21. Pre-order и обычное отсутствие товара являются разными
    пользовательскими состояниями.

22. Gift Set является самостоятельным Product.

23. Gift Set имеет собственный SKU, slug, price и stock.

24. Stock Gift Set независим от retail stock входящих в него Product,
    поскольку товар для наборов резервируется отдельно.

25. Product может иметь relation к Gift Set, в которые он входит,
    но эта обратная связь не должна становиться вторым независимым
    источником истины.

26. Пользователь может менять вес weight-based Product непосредственно
    в Cart.

27. CartItem определяется комбинацией Product и выбранной Purchase
    Configuration.

28. Одинаковые Product + Purchase Configuration должны объединяться
    в одну CartItem с суммированием quantity.

29. Cart должен повторно валидироваться backend при изменении
    конфигурации, количества и перед checkout.

30. Cart является server-authoritative.

---

## 8.34. Legacy → Domain Mapping

Legacy frontend fields являются источником понимания существующей
системы, но не определяют новую архитектуру напрямую.

Примерное соответствие:

| Legacy field | Domain concept |
| --- | --- |
| `productTitle` | `Product.title` |
| `productUid` | `Product.id` |
| `productSlug` | `Product.slug` |
| `productSKU` | `Product.sku` |
| `productPrice` | `Pricing` |
| `productDiscount` | `Promotion/Pricing` |
| `productImg` | `ProductMedia` |
| `productUnit` | `Purchase Configuration / Sale Unit` |
| `productWeightByUnit` | Weight/Purchase Configuration depending on product type |
| `productMoodsSetting` | `Mood[]` |
| `productCategoryTitle` | `Category.title` |
| `productCategorySlug` | `Category.slug` |
| `productCategoryYmCode` | Category analytics metadata |
| `productCategoryId` | `Category.id` |
| `productCountryTitle` | legacy geography data; map to Country/Origin after backend analysis |
| `productCountrySlug` | legacy geography data; map after backend analysis |
| `productCountryIcon` | `Country.icon` where applicable |
| `productCountryBG` | `Country.backgroundImage` where applicable |
| `productTastes` | `Taste[]` |
| `productYear` | harvest year |
| `productPreparingTime` | `BrewingGuide` |
| `productTemperature` | `BrewingGuide` |
| `productCountPerPiece` | `BrewingGuide` |
| `productAmountUses` | `BrewingGuide` |
| `isWishedProduct` | user/session Favorite state |
| `isPreOrder` | Availability / Pre-order |
| `productGiftSet` | Gift Set Composition |

Не используй эту таблицу как API schema.

После получения backend API необходимо отдельно сопоставить:

`Legacy model → Backend DTO → Domain model → UI model`.

Если backend DTO не совпадает с domain model, используй adapter layer
вместо распространения backend-specific naming по React-компонентам.

---

## 8.35. Open Product Domain Questions

Следующие вопросы намеренно остаются открытыми до получения
дополнительной бизнес-информации или backend contract:

- окончательная структура Product Type;
- окончательная структура Purchase Configuration;
- конкретный формат Pricing DTO;
- конкретный формат Stock DTO;
- способ резервирования stock;
- конкурентное изменение stock несколькими пользователями;
- механизм хранения Cart;
- guest Cart и authenticated Cart;
- механизм Favorites;
- точные promotion priority/stacking rules;
- promo code rules;
- фактический вес товаров с approximate weight;
- окончательная структура GiftSet CompositionItem;
- окончательная geography hierarchy;
- CMS/content model;
- backend validation/error contract.

Не придумывай ответы на эти вопросы.

Если реализация конкретной задачи зависит от одного из них:

1. определи, действительно ли решение необходимо прямо сейчас;
2. изучи доступный backend/API, если он уже предоставлен;
3. если данных недостаточно — сообщи об открытом вопросе;
4. не превращай временное предположение в постоянное архитектурное
   решение без подтверждения.

---

## 8.36. ProductCard — общий Product domain component

### УТВЕРЖДЕНО: назначение и семантика

ProductCard — единый reusable Product domain component для DailyTop,
Catalog, filtered Catalog results и других мест отображения Product.
Не создавать DailyTopProductCard только из-за первого использования
в DailyTop. Не создавать отдельные MobileProductCard, CeramicProductCard
или PreorderProductCard как domain components только из-за presentation
differences. Responsive/state variants сохраняют один component concept.

У ProductCard есть как минимум две responsive/layout presentations:
full / desktop и compact / tablet-mobile. Presentation определяется
доступным layout/context, а не механическим условием `viewport === mobile`.
DailyTop использует full на desktop и standard compact на tablet/mobile.

ProductCard содержит независимые interactive/navigation zones:

- свободная верхняя Product area / Product image и title → Product page;
- Country control → Catalog с соответствующим Country filter;
- Mood control → Catalog с соответствующим Mood filter;
- Favorite и Cart → UI actions;
- selectable Purchase Configuration / Weight в full presentation → UI state;
- weight в compact presentation → informational content без interaction.

Не делать всю карточку одной ссылкой с вложенными actions/ссылками.
Вложенные `<a>` запрещены. Visual layering через position / absolute /
z-index допустим при корректной DOM semantics.
Утверждённый пример Mood navigation: `/catalog/mood/immunity`.
Country в full и compact — настоящий Catalog navigation link с единым
route pattern `/catalog/region/<country-slug>`. Semantic slug хранится явно
в Country presentation data, без runtime transliteration display name.
`region` — routing namespace, а не переименование Country в Origin/Region.
Country ≠ Origin; терминология из разделов 8.5–8.6 сохраняется.
Catalog destination page реализуется отдельно. Figma-подписи не определяют
domain semantics.

### УТВЕРЖДЕНО: presentation requirements

- Product image присутствует всегда и имеет согласованное позиционирование
  внутри ProductCard согласно design system.
- Mood использует модель раздела 8.7 и служит navigation/filter entry point.
  Full presentation показывает icons, hover/focus presentation и tooltip
  с названием Mood; compact presentation скрывает Mood icons.
  Для Ceramics зарезервированная Mood area может оставаться свободной.
- Full presentation имеет regional visual/background и interactive
  Country entry point. Regional visual по умолчанию скрыт и появляется
  при hover карточки с opacity/transform animation. Compact presentation
  постоянно показывает только Country в компактном виде сверху.
  Full и compact показывают Country only. Origin не отображается и не
  занимает отдельную строку/место. Это presentation rule: Country ≠ Origin
  сохраняется; Origin остаётся отдельным data/domain field для Product Page,
  Catalog filtering и detailed product information.
- Compact presentation использует compact image geometry, постоянно
  доступный Favorite сверху, price перед title и широкую нижнюю Cart action
  bar. Title может переноситься согласно compact design. Hover-only desktop
  behavior не переносится на touch.
- Title является ссылкой на Product page. В full default длинное название
  ограничено доступной областью и заканчивается `...`. Marquee запускается
  только при hover непосредственно на title, только если оно не помещается.
  Hover всей карточки не запускает marquee. После ухода pointer с title
  движение прекращается и возвращается truncated/ellipsis presentation.
  Keyboard/accessibility equivalent получения полного названия определяется
  при implementation с сохранением указанного mouse behavior. Compact
  использует собственное title behavior без автоматического переноса
  desktop hover-marquee на touch.
- Weight-based Tea в full presentation позволяет выбрать доступную
  Purchase Configuration прямо в карточке, без перехода на Product Page.
  При выборе configuration немедленно меняются selected configuration
  и display price на готовое значение для неё.
  Для текущей реализации и fixtures default Purchase Configuration = 50 г,
  базовый порядок — 50 / 100 / 200 / 250 г; initial display price и discount
  соответствуют 50 г. Будущий backend определяет фактически доступные
  configurations и initial selection исходя из server authority.
  Dropdown открывается вверх без изменения размеров карточки; arrow
  отражает open/closed state с учётом prefers-reduced-motion.
- В compact weight не является интерактивным control: например `50 г`
  представляет текущий/представляемый вес. Пользователь не меняет Purchase
  Configuration внутри compact ProductCard. На mobile её изменение
  выполняется на Product Page либо через отдельную Future mobile panel.
- Fixed-weight / Pressed Tea в full использует visual area/style обычного
  Weight control, но с фиксированным значением (например `250 г`), readonly,
  без dropdown arrow и interaction. В compact это informational weight text
  без interaction. Не создавать Purchase Configuration для имитации dropdown.
  Применяются правила разделов 8.10, 8.15–8.17.
- Ceramics сохраняет общую full geometry, image, title, price, Favorite
  и Cart, но не имеет Mood и Weight/Purchase Configuration. Отсутствующие
  области не заполняются выдуманными данными. Regional presentation может
  сохраняться; full hover раскрывает regional background/Country, Favorite
  и соответствующие action states согласно design. Compact Ceramics
  использует обычную compact карточку: только Country и Favorite сверху,
  image, price, title, без Weight, с нижней `В корзину` action bar.
- Price отображается для selected Purchase Configuration на основании
  готовых presentation/server-confirmed values для доступных configurations
  (раздел 8.21). До API допустимы только mock presentation values для UI.
  Frontend не вычисляет price: `basePrice * weight` и аналогичные pricing
  formulas запрещены; немедленная смена display price не меняет серверную
  ответственность за pricing.

ProductCard обязан поддерживать Preorder с семантикой раздела 8.20.
Business invariant: Preorder Product нельзя добавить в Cart.

- Full: Purchase Configuration/Weight area заменяется Preorder status;
  Cart отсутствует; Favorite перемещается в основную action position,
  обычно занимаемую Cart. Favorite скрыт по умолчанию и появляется при
  hover/focus-within, как в обычной full карточке.
- Compact: informational weight сохраняется, если применим к Product;
  Favorite остаётся в постоянной compact position сверху; нижняя Cart
  action bar заменяется presentation/action bar `Предзаказ`, без обычного
  Cart action. Не делать full и compact Preorder визуально одинаковыми.

Preorder label отображается как `Предзаказ`, без forced uppercase.
Preorder presentation использует существующий Cera Pro Regular 400.
Не подключать Bold ради Preorder; Bold в Figma является неактуальным
presentation значением. Ограничение DailyTop описано в 21.4 и не отменяет
поддержку Preorder общим ProductCard.

### Implementation details / Open / Future

Desktop/tablet/mobile могут перестраивать расположение элементов,
regional presentation, Mood visibility, actions, typography и размеры.
Точные размеры/positioning уточняются по Figma; окончательные responsive
breakpoints и animation/accessibility implementation не утверждены.
Figma остаётся visual source of truth с утверждёнными уточнениями
раздела 21.6; отдельные domain components для desktop/mobile не вводятся.

Favorite и Cart mock interactions ограничены разделами 8.23 и 8.27;
Notification system и отдельный desktop/tablet Cart Widget — будущие
задачи вне текущего ProductCard implementation scope.
Compact/mobile Cart допускает только минимальное локальное testing
согласно 8.27. Mobile Cart panel и purchase configuration mobile panel —
отдельная Future feature: не исследовать и не реализовывать их в текущем
ProductCard/Home scope. Их architecture не утверждена; не имитировать
backend synchronization.
ProductCard API DTO, реальные Cart/Favorite endpoints и окончательные
backend validation/error contracts не утверждены.

---

## 9. State management

Не вводи глобальный state manager без подтверждённой необходимости.

Предпочтительная модель:

- URL — фильтры, сортировка, пагинация и shareable state;
- local React state — локальная UI-интерактивность;
- Context — ограниченное общее состояние, если оно действительно используется несколькими областями;
- backend — подтверждённые серверные данные.

Backend должен оставаться источником истины для:

- окончательной цены;
- скидок;
- наличия;
- итогов корзины;
- стоимости доставки;
- заказа.

Не сохраняй персональные данные пользователя в `localStorage` без явного требования.

---

## 10. Assets

Статические ресурсы приложения хранятся локально, когда это соответствует их назначению.

Например:

- logo;
- icons;
- fonts;
- decorative graphics.

Контентные изображения должны в будущем приходить из соответствующего backend/CMS, если это предусмотрено архитектурой.

Не используй временные Figma URLs как production URLs.

Если asset доступен через Figma и требуется для реализации дизайна, используй Figma MCP для его получения вместо приблизительного воссоздания.

---

## 11. SEO

Публичные страницы должны проектироваться с учётом SEO.

Предпочитай server-rendered HTML для индексируемого контента.

Учитывай:

- metadata;
- canonical;
- sitemap;
- robots;
- breadcrumbs;
- structured data там, где имеются необходимые данные.

Не меняй существующие публичные URL без анализа последствий.

Перед окончательным утверждением routing необходимо сопоставить старые и новые URL.

Для изменённых индексируемых URL должна быть определена стратегия redirects.

Корзина, checkout и технические страницы результата заказа не должны индексироваться.

---

## 12. Performance

Предпочитай небольшие client boundaries.

Не превращай всю страницу в Client Component из-за одного интерактивного элемента.

Учитывай:

- image optimization;
- font loading;
- lazy loading тяжёлых компонентов;
- pagination;
- разумное server caching;
- отсутствие общего cache для персональных данных.

Не добавляй тяжёлую dependency, если задача решается средствами браузера или текущего stack без существенного ухудшения UX.

---

## 13. Accessibility

Интерактивные элементы должны работать:

- мышью;
- клавиатурой;
- touch input.

Используй семантический HTML.

Учитывай:

- keyboard navigation;
- focus-visible;
- labels;
- disabled states;
- error states;
- prefers-reduced-motion.

Не заменяй стандартную доступную семантику div-элементами без необходимости.

---

## 14. Правила работы с Figma

Для задачи, связанной с конкретным UI:

1. Получи ссылку на соответствующий Figma Frame/Node.
2. Изучи его через Figma MCP.
3. Получи design context.
4. При необходимости изучи variables.
5. При необходимости получи screenshot для визуальной проверки.
6. Найди связанные Figma components.
7. Проверь существующие компоненты в кодовой базе.
8. Только после этого начинай реализацию.

Не делай предположения о значениях, которые можно получить непосредственно из Figma.

Если Figma и legacy CSS расходятся, сообщи о расхождении и по умолчанию следуй Figma.

---

## 15. Правила выполнения задач

Работай последовательными локальными задачами.

Не переходи самостоятельно к следующей feature после выполнения текущей.

Не изменяй несвязанные части приложения без необходимости.

Не выполняй крупный refactoring в рамках локальной UI-задачи без предварительного объяснения причины.

Если задача требует архитектурного решения, которое ещё не определено:

1. остановись;
2. опиши проблему;
3. предложи варианты;
4. укажи рекомендуемый вариант;
5. дождись решения пользователя, если выбор существенно влияет на архитектуру.

Не скрывай предположения.

Явно разделяй:

- подтверждённые факты;
- данные из Figma;
- данные из backend;
- данные legacy-сайта;
- собственные архитектурные предположения.

---

## 16. Перед изменением кода

Перед реализацией задачи:

1. изучи релевантный код;
2. изучи соответствующий Figma node, если задача относится к UI;
3. найди существующие компоненты, которые можно переиспользовать;
4. определи минимальный набор файлов, который потребуется изменить;
5. не меняй файлы за пределами задачи без необходимости.

Для крупных задач сначала кратко опиши план.

---

## 17. Definition of Done

Задача считается выполненной только если применимые к ней условия выполнены.

### UI

- реализация соответствует указанному Figma Frame/Node;
- использованы существующие design tokens;
- проверены необходимые responsive layouts;
- состояния компонента реализованы;
- доступность не ухудшена.

### Code quality

- не создан ненужный дубликат существующего компонента;
- TypeScript не содержит новых ошибок;
- отсутствуют очевидные runtime errors;
- нет ненужных dependencies;
- нет несвязанных изменений.

### Application

- проект успешно проходит применимые проверки;
- build проходит успешно, если задача позволяет его выполнить;
- loading/error/empty states реализованы там, где они необходимы.

### После выполнения

Сообщи:

1. что было реализовано;
2. какие файлы были изменены;
3. какие проверки были выполнены;
4. были ли отклонения от Figma;
5. какие предположения пришлось сделать;
6. остались ли нерешённые вопросы.

Не переходи к следующей задаче самостоятельно.

---

## 18. Язык

Общайся с пользователем на русском языке.

Названия:

- файлов;
- директорий;
- React-компонентов;
- функций;
- переменных;
- TypeScript types/interfaces;
- технических сущностей в коде

используй на английском языке.

Общепринятые технические термины могут использоваться на английском, если это делает объяснение точнее.

---

## 19. Утверждённые правила и открытые вопросы

### УТВЕРЖДЕНО на уровне business/domain rules

- Product Domain Model v0.1 (раздел 8);
- различие Country и Origin;
- различие Mood и Taste;
- бизнес-правила weight-based и piece-based products;
- Stock и Availability rules;
- Pricing/Discount responsibility;
- Pre-order semantics;
- Gift Set semantics;
- Cart business rules.
- общий ProductCard и его navigation/state presentation rules (8.36);
- Home PromoSection rules (раздел 21).

Эти правила описаны в разделах 8 и 21 и не требуют повторного утверждения
при определении технических моделей. Не изменяй их без явного изменения
бизнес-требований.

Purchase Configuration до анализа backend API используется только как
domain concept. ProductVariant не является заранее предполагаемой
domain entity; его упоминание в прежнем архитектурном предложении
не является основанием для создания такой модели.

## 20. Регламент инкрементального Code Review

Перед началом разработки новой крупной фичи необходимо провести
Code Review последней завершённой фичи.

Область проверки:

1. Проведи глубокий Code Review последней разработанной фичи и файлов,
   которые относятся к её реализации.

2. Проверь точки интеграции этой фичи с существующей архитектурой проекта.

3. Не проводи повторный Code Review ранее принятых и не связанных
   напрямую с текущей проверкой частей проекта.

4. Расширяй область Code Review только в том случае, если обнаружена
   конкретная:
   - зависимость;
   - регрессия;
   - конфликт;
   - архитектурная проблема.

5. Выполни доступные автоматические проверки проекта:
   - lint;
   - TypeScript;
   - production build;
   - tests, если они существуют;
   - другие уже предусмотренные проектом checks.

Не выполняй refactoring только потому, что существует альтернативный
способ реализации.

Каждое найденное замечание должно содержать:

- конкретную проблему;
- severity;
- практическое влияние на проект;
- предлагаемое исправление;
- риск предлагаемого исправления.

Используй следующие уровни severity:

- Critical — runtime failure, security issue, потеря данных или другая
  критическая проблема.
- High — существенная архитектурная ошибка, memory leak, regression,
  broken responsive behavior или аналогичная серьёзная проблема.
- Medium — значимое дублирование, неудачная component boundary,
  заметная performance-проблема или проблема maintainability.
- Low — naming, косметический refactoring или улучшение, не влияющее
  существенно на работу проекта.
- Future — потенциальная проблема, которая станет актуальной после
  появления backend, масштабирования или новой функциональности.

Предпочитай оставлять корректный, читаемый и поддерживаемый код
без изменений.

Не оптимизируй код ради самой оптимизации.

Каждое предлагаемое изменение должно решать конкретную обнаруженную
проблему и иметь объяснимую практическую пользу.

Ранее принятые фичи считаются стабильными.

Не пересматривай и не рефактори их без новых оснований:
регрессии, интеграционного конфликта, новой зависимости или обнаруженной
архитектурной проблемы.

ВАЖНО:

На этапе Code Review сначала только анализируй код.

Не вноси исправления автоматически.

Сначала представь результаты Code Review пользователю и дождись
решения о том, какие изменения необходимо реализовать.

### ОСТАЁТСЯ ОТКРЫТЫМ

- конкретная TypeScript-структура Product и окончательная структура Product Type;
- конкретная структура Purchase Configuration;
- полный backend API contract;
- API DTO, включая конкретные форматы Pricing DTO и Stock DTO;
- mapping Backend DTO → Domain Model;
- пользовательская session/auth, включая необходимость авторизации;
- storage Cart/Favorites, включая guest Cart и authenticated Cart;
- delivery/payment contracts;
- способ резервирования stock и конкурентное изменение stock несколькими пользователями;
- точные promotion priority/stacking rules и promo code rules;
- фактический вес товаров с approximate weight;
- окончательная структура GiftSet CompositionItem;
- окончательная geography hierarchy;
- CMS/content model и production media source;
- backend validation/error contract;
- остальные вопросы, которые Product Domain Model v0.1 явно оставляет открытыми;
- окончательная карта старых и новых URL;
- состав первой версии продукта.

Открытые технические структуры и контракты не отменяют утверждённые
business/domain rules. После получения backend API отдельно сопоставь
его с Product Domain Model v0.1. Не создавай API models или backend DTO
на основании одной domain specification.

Не придумывай ответы на открытые вопросы.

По мере получения новой информации соответствующие разделы AGENTS.md должны уточняться.

Этот документ фиксирует текущие постоянные правила разработки проекта.

---

## 21. Home PromoSection

Статус: **PromoSection — READY / FROZEN 🔒**.

Пройдены Implementation, Manual Review, Responsive Polishing, Final Visual
Polishing, Incremental Code Review и Final Fix Gate. Единственный MEDIUM
finding исправлен и прошёл targeted regression QA. Известных текущих
blockers/findings нет.

Стабильные компоненты в рамках feature:

- PromoBanner — READY / FROZEN 🔒;
- UpcomingEventPromo — READY / FROZEN 🔒;
- DailyTop — READY / FROZEN 🔒;
- ProductCard — READY / FROZEN 🔒.

### 21.1. УТВЕРЖДЕНО: состав и условный layout

PromoSection — основной промо-блок Home Page. Он содержит обязательный
PromoBannerSlider (всегда минимум один PromoBanner) и условный PromoSidebar.
Sidebar существует при наличии UpcomingEventPromo (0..1) или DailyTop
(0..1).

| Состав | Desktop layout behavior |
| --- | --- |
| Banner + Event + DailyTop | Banner в основной области, sidebar справа, Event сверху, DailyTop ниже |
| Banner + DailyTop | DailyTop в верхней части sidebar |
| Banner + Event | Event сверху; место DailyTop свободно, Event не растягивается для его заполнения |
| Только Banner | Sidebar отсутствует, Banner занимает всю доступную ширину content area |

На desktop при наличии sidebar Banner занимает оставшуюся доступную ширину.
Ширина sidebar — presentation/layout detail, не domain invariant;
обязательная константа ширины не утверждена.

На tablet / в соответствующей responsive composition Banner занимает
отдельную строку на всю доступную ширину. Ниже располагаются Event
и DailyTop:

- Event + DailyTop: рядом; DailyTop использует compact horizontal-scroll
  presentation из 21.4.
- Только DailyTop: занимает всю доступную ширину под Banner.
- Только Event: сохраняет нормальную presentation geometry; не растягивать
  его на всю ширину ради отсутствующего DailyTop; сохранять ширину будущей
  двухколоночной композиции. На mobile Event занимает доступную ширину.
- Нет обоих: остаётся только Banner.

Не воспроизводить устаревшую tablet Figma-композицию с вертикальным
480px sidebar под Banner слева, desktop DailyTop и большой пустой
областью справа. Окончательные breakpoints не утверждены.

### 21.2. УТВЕРЖДЕНО: PromoBanner и slider behavior

PromoBanner — самостоятельная promotional entity, не Product-specific.
Destination может вести на Product, Category, Event, другую внутреннюю
страницу или внешний ресурс. Internal destination использует обычную
внутреннюю навигацию; external destination открывается в новой вкладке
с необходимыми security attributes.

Весь PromoBanner — одна кликабельная ссылка. CTA внутри banner artwork
не создаёт отдельную вложенную DOM-ссылку или button.

Утверждённый slide состоит из отдельного background asset, общего
frontend gradient, одного неделимого critical artwork asset и
destination/accessibility metadata. Background может responsive crop-иться;
gradient остаётся программным presentation layer и не входит в editor content.
Не объединять background и critical artwork в одну картинку.

Critical artwork около 760×760 px — единый editor/content asset, а не
обязательный размер компонента. Typography, product image, visual CTA,
labels и decorations принадлежат этому цельному изображению. Frontend
не разбивает artwork на child layers и не воспроизводит его внутреннюю
композицию. Artwork масштабируется как единое целое с сохранением
прозрачности; critical information не должна crop-иться. Реализация
Editor/CMS/API остаётся Future.

При одном Banner slider controls скрыты; при нескольких показываются
pagination dots и previous/next controls. Используется autoplay с
утверждённым delay ≈ 5 секунд. Ручное переключение не отключает autoplay
навсегда: после interaction начинается новый период ожидания, затем
автоматическое переключение продолжается. Delay должен быть простой
изменяемой implementation constant/configuration без разбросанных magic
numbers. Это не вводит admin setting или API field.

Видимая Pause/Resume control не используется; скрытый focusable аналог
не добавляется. Mobile/touch поддерживает horizontal swipe через ту же
manual navigation: swipe сбрасывает autoplay interval. Вертикальный scroll
страницы поверх Banner сохраняется; tap открывает destination, swipe — нет.

Видимость Banner в viewport сама по себе не приостанавливает autoplay.
Hover pause относится ко всей visual/navigation surface только при
реальном наведении hover-capable pointer; touch tap/swipe не оставляют
hover pause. После pointer leave начинается новый полный 5-second interval.
Keyboard focus внутри Banner приостанавливает autoplay; после его ухода
или перехода к pointer interaction countdown возобновляется заново.
Hidden browser tab отдельно приостанавливает autoplay; после возвращения
начинается новый interval без догоняющих переключений. Reduced motion
отключает autoplay и dissolve, сохраняя manual navigation.

Advertisement badge из Figma не входит в текущую реализацию PromoBanner:
не реализовывать `Реклама`, info interaction, ERID UI, advertising metadata,
advertising API/schema или специальную механику внешней рекламы.
Текущий PromoBanner используется для собственных материалов/товаров/
контента бренда и не предполагает стороннюю рекламную площадку.
Сторонняя реклама и соответствующие legal/ERID requirements — отдельная
Future business/legal feature с собственными требованиями.

Остальные accessibility implementation details учитывают раздел 13.

### 21.3. УТВЕРЖДЕНО: UpcomingEventPromo

Отображается 0..1 продвигаемое событие; presentation содержит минимум
image, title, address и destination отдельной публикации.
UpcomingEventPromo содержит независимые navigation zones:

- Event image → `/article/{article_id}`;
- type label (`Мероприятие` / `Новость`) → соответствующая category статей;
- Event title → `/article/{article_id}`;
- chevron → `/article/{article_id}`.

Не оборачивать весь UpcomingEventPromo в один `<a>` и не создавать nested
anchors. Address — presentation content, если отдельно не определено иное.

UpcomingEventPromo server-renderable и не требует собственного client state.
Tablet использует собственную внутреннюю responsive composition по Figma:
image, content и нижняя navigation zone расположены вертикально; это не
просто уменьшенный desktop Event. Event и DailyTop остаются соседними
tablet blocks без принудительного выравнивания intrinsic content height.
Утверждённый routing contract: `/events/` — общий каталог статей и событий;
`/events/{category-id}` — каталог публикаций категории;
`/article/{article_id}` — отдельная публикация, в том числе Event
(например `/article/31`); сохраняется текущий production routing.
Type/category navigation surface ведёт на `/events/{category-id}`.
Числовой articleId и category id/slug хранятся явно в presentation data,
без runtime transliteration. Отсутствующее событие не создаёт sidebar или placeholder.

OPEN DOMAIN QUESTION: Content Type (`article` / `event`) и Content
Category/Topic — концептуально разные dimensions. UI type label не
определяет category identity. Финальная taxonomy/CMS/backend model будет
определена при реализации Events/Articles; обязательная many-to-many
структура сейчас не утверждается.

Scheduled publication, publication lifecycle, период отображения до/после
события и manual hide управляются backend/admin.
Event может оставаться после проведения для перехода к материалу
о прошедшем мероприятии.

Если подходит несколько событий, текущая business rule — выбрать
ближайшее по дате. Frontend получает уже выбранное 0..1 UpcomingEventPromo
и не реализует собственный ranking событий.

### 21.4. УТВЕРЖДЕНО: DailyTop

DailyTop использует общий ProductCard (8.36) с разными presentation
mechanics в зависимости от layout. Frontend не вычисляет
популярность, оборот или ranking, не реализует rotation algorithm
и сохраняет backend order.
Ожидаемый нормальный список — около 4 Product, backend может вернуть больше.
Frontend safety limit — максимум 7 Product: при большем payload используются
первые 7 в backend order без дополнительной sorting. Это защита UI
от ошибочного/чрезмерного payload, не ranking mechanism.

Критический business invariant: Product со статусом Preorder запрещён
в DailyTop. Основная ответственность лежит на backend; frontend/API
integration также учитывает invariant и не считает Preorder нормальным
DailyTop case. Общий ProductCard при этом поддерживает Preorder (8.36).

При undefined/null/empty списке DailyTop отсутствует без placeholder.
Общий ProductCard используется без изменений: full на desktop и compact
на tablet/mobile. Отсутствующий responsive presentation не должен оставлять
дублирующиеся interactive controls доступными keyboard/screen reader.

#### Desktop

Одна full/desktop ProductCard за раз, user-driven slider/carousel.
При нескольких Product показываются Previous/Next и pagination; при одном отображается
одна full карточка без pagination и лишних controls.
Autoplay, таймер и автоматическая смена/ротация Product запрещены:
пользователь взаимодействует с Purchase Configuration, Favorite и Cart,
и автоматическая смена может прервать это взаимодействие.
Навигация циклическая, без cloned slides. Не переносить PromoBanner autoplay
на DailyTop. Состояние DailyTop navigation не меняет состояния соседних промо.

#### Tablet / Mobile

Начиная с tablet responsive composition DailyTop — горизонтальный список
standard compact/mobile ProductCard: horizontal CSS scroll и native touch
scrolling, с несколькими карточками, расположенными горизонтально.
Desktop slider presentation, pagination dots и autoplay не используются.
Heading на tablet/mobile имеет собственный horizontal content inset,
не меняющий геометрию horizontal scrolling track.
Не создавать DailyTopProductCard и не уменьшать full карточку вместо
standard compact presentation. CSS scroll-snap — implementation option,
не утверждённый business requirement.

Figma tablet/mobile DailyTop с desktop-like карточкой, Mood icons
и pagination — устаревшее/неисправленное состояние; не воспроизводить его.

### 21.5. Backend/admin context / Open / Future

В существующей/предполагаемой admin business logic PromoBanner может
иметь название, описание, background image, critical/main image,
destination, publication start/end. Publication lifecycle — backend/admin
concern. Этот список — контекст, не финальная API schema, TypeScript
interface, DTO или database schema.

Future analytics предусматривает два потенциально независимых concerns:
собственную статистику кликов/переходов для анализа эффективности промо
и опциональную analytics marking/integration для Яндекс.Метрики.
До соответствующего backend/API/analytics contract не имитировать отправку
events, не создавать fake endpoint, DTO, metric identifiers или временную
frontend analytics. Архитектура не должна препятствовать будущей интеграции.

Состав DailyTop в будущем может учитывать популярные и manually promoted
товары и backend ranking/rotation logic формирования списка; алгоритмы
не утверждены. Это не разрешает автоматическую смену Product в UI (21.4).
Event Map — Future direction Events domain вне текущего PromoSection scope.
PromoBanner/DailyTop API DTO, analytics event schema, Яндекс.Метрика
identifiers, slider library, конкретная carousel implementation,
CSS scroll-snap, окончательные responsive breakpoints и backend validation/error contracts
остаются Open/Future до соответствующих этапов.

Не фиксировать Swiper как обязательную dependency из-за его использования
на legacy/current site. Production site — behavior reference, не technology
source of truth. Mobile purchase/cart panel architecture и Notification
architecture также остаются Open/Future (8.36).

Legacy сайт допускается как behavior/UX reference, включая сложную
layering семантику ProductCard, в рамках раздела 2. При конфликте между
утверждённым business rule, Figma и legacy behavior, не разрешённом
утверждёнными уточнениями 21.6, остановись и зафиксируй конфликт вместо
самостоятельного выбора трактовки. Это не отменяет
приоритет Figma над legacy CSS для визуальных деталей из разделов 2 и 14.

### 21.6. УТВЕРЖДЕНО: приоритет решений после Figma Discovery

Для PromoSection/ProductCard конкретные утверждённые правила 8.36
и 21.1–21.4 имеют приоритет над устаревшими/неисправленными Figma states.
Соответствие этим решениям не считается ошибкой реализации относительно
Figma:

- tablet/mobile DailyTop: standard compact ProductCard + horizontal CSS
  scroll вместо уменьшенной desktop-like карточки, Mood icons и pagination;
- tablet PromoSection: отдельная строка Banner, ниже Event/DailyTop рядом
  вместо вертикального sidebar с пустой областью справа;
- compact Preorder: weight сохраняется, Favorite сверху, нижняя Preorder bar;
- PromoBanner autoplay ≈ 5 секунд;
- Advertisement badge исключён из текущего scope;
- Preorder font — Cera Pro Regular 400.

Full title marquee запускается только при hover непосредственно на title
с overflow согласно 8.36, независимо от поведения Figma prototype.
Во всех остальных visual вопросах Figma остаётся visual source of truth,
если AGENTS.md не содержит более конкретного утверждённого правила.
Presentation rules не являются API schema и не создают параллельную
Product domain model.
