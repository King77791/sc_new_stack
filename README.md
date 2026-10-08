# Минимальный SSR-стек

Frontend уже оформлен как Next.js-приложение. `backend/` оставлен заглушкой до начала PHP-разработки:

- `frontend/` — Next.js App Router. Страницы по умолчанию рендерятся на сервере (React Server Components).
- `backend/` — место для будущего PHP API; сейчас серверной реализации нет.

## Запуск

Требуется Node.js 20.9+. Из корня проекта выполните:

```sh
npm run setup
npm run dev
```

`npm run setup` установит зависимости frontend в `frontend/`. Откройте `http://localhost:3000`.

В `next.config.ts` заранее предусмотрено проксирование `/api/*` к PHP. Когда backend появится, адрес можно задать переменной `BACKEND_URL` (по умолчанию `http://127.0.0.1:8000`).

## Структура

```text
backend/
  README.md              # Заглушка до начала backend-разработки
frontend/
  app/                   # SSR страницы и стили
  next.config.ts         # Прокси API в PHP
```

Это стартовый каркас без базы данных, авторизации и доменных модулей; их стоит добавлять по требованиям продукта.
