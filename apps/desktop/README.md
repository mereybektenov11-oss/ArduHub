# ArduHub для ПК (Windows)

Приложение Electron + Vite + React. Светлая тема в стиле «Ночная лаборатория» (`docs/specs/app-design-concepts.md`); тёмная тема удалена 11.11.2026. Сейчас готовы:

- вход тем же аккаунтом Supabase, что и на сайте;
- главное меню;
- настройки.

«Обучение» (2D, D2) работает: карта уроков и уроки сайта, запущенные в приложении. «Практика» (3D) — этап D3, пока «в разработке». Подробности — в `docs/coordination/agent-notebook.md`.

## Как устроено обучение

- Компоненты уроков берутся из `src/` сайта через алиас `@/`. Подмены `next/*` лежат в `src/renderer/shims/`, внутренний роутер — `src/renderer/router.ts`.
- Страница открывается по `app://arduhub/` (`src/main/appProtocol.ts`). При сборке туда копируются `/hex` (из `packages/curriculum/hex`), `/icons` и `/cabinet` (из `public/` сайта).
- `/api/lessons/*` и `/api/lesson-video` отдаются локально (`src/renderer/localApi.ts`). Остальные `/api/*` пока отвечают 503.
- Тема: `src/renderer/learning/learning.css`. После изменения стилей уроков сайта перегенерируйте правила текста на голубых кнопках командой `node apps/desktop/scripts/gen-neon-overrides.mjs`.
- **Важно для сокращения сайта (S1):** компоненты обучения нельзя удалять из `src/` — сначала их нужно перенести в общий пакет.

## Установка зависимостей

Приложение устанавливается **отдельным pnpm-проектом**: у него свой `pnpm-workspace.yaml` и `pnpm-lock.yaml`. Причина в том, что `node_modules` сайта на этой машине лежит на диске D через связь каталогов, и pnpm не находит через неё workspace-пакеты.

```powershell
cd apps/desktop
corepack.cmd pnpm install --store-dir D:/CodexWorkspaces/ArduHub_Software/store
```

`node_modules` приложения (около 300 МБ вместе с Electron) лежит на C.

Пакеты `@arduhub/curriculum` и `@arduhub/arduino-core` подключаются алиасами Vite из `../../packages/*/src`, а не через зависимости.

## Команды

```powershell
corepack.cmd pnpm run dev        # Vite + Electron с горячей перезагрузкой
corepack.cmd pnpm run build      # dist/main (tsc) и dist/renderer (vite)
corepack.cmd pnpm run start      # запуск собранного приложения
corepack.cmd pnpm run typecheck
```

Тесты:

- unit-тесты (`tests/`) запускает корневой `pnpm test`;
- E2E запускает настоящее собранное приложение Electron, а Supabase в них подменён ответами теста:

```powershell
node ../../node_modules/@playwright/test/cli.js test -c playwright.config.mts
```

Снимки экранов сохраняются в `outputs/desktop-d1/`.

## Настройки аккаунтов

При сборке Vite читает из корневого `.env.local` только `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY` — это публичные значения, те же, что уже есть в браузерной части сайта. Серверные ключи в приложение не попадают. Без этих значений экран входа сообщает, что вход недоступен.

## Безопасность

- Окно работает с `contextIsolation`, `sandbox` и без `nodeIntegration`. Действует CSP: скрипты только из приложения, сеть — только к Supabase.
- Новые окна и переходы с локальной страницы запрещены, все запросы разрешений отклоняются.
- Внешние ссылки открываются только из белого списка страниц сайта (`src/main/external.ts`).
- Сессия хранится в `%APPDATA%/ArduHub/session.json` в зашифрованном виде через `safeStorage`, на Windows это DPAPI. Файл защищён от других пользователей Windows, но не от других программ того же пользователя. Если шифрование недоступно, вход хранится только в памяти до закрытия приложения.

## Ещё не сделано

- Установщик и подпись кода (D5).
- Проверка входа с настоящим аккаунтом: автотесты используют подменённый Supabase. Реальный вход владелец проверяет вручную.
- Тариф показывается как «Free» для всех: таблица `entitlements` появится в D4.
