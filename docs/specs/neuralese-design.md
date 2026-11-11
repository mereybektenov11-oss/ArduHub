# Дизайн Neuralese для лендинга, входа/регистрации и профиля

Источник дизайна: `C:\Users\User\Downloads\neuralese.asia-design.md` (ниже продублированы все нужные токены — субагентам файл читать не обязательно).

## SECTION 1: SPEC

**Цель.** Лендинг, страницы входа/регистрации и страница профиля выглядят по дизайн-системе Neuralese; анимации, структура, тексты и поведение не меняются.

**Сценарии**
- Как посетитель лендинга, я вижу светлый, «воздушный» интерфейс с редакционными serif-заголовками и одним синим акцентом.
- Как пользователь, переходя с лендинга на вход/регистрацию и в профиль, я вижу ту же визуальную систему.

**Требования**
1. Палитра: primary `#1A66F0`, hover `#3F7CF2` (primary-70), pressed `#2A6CF1` (primary-80), deep `#1F5AE0` (primary-90), light `#5A8FF5` (primary-60); secondary `#FAFAFA`; surface `#F3F5FB`; текст `#000000`; белый `#FFFFFF`; error `#D92D20`; border `#FFFFFFB8` (стеклянная рамка).
2. Типографика: крупные заголовки (h1 героя, h1 страниц) — EB Garamond 500, letter-spacing отрицательный (display 80/96 −1px; lg 64/76 −0.9px). Остальное — Geist: headline-md 57/68 −1.2px, headline-sm 40/40 −0.9px, title-lg 28/34, title-md 24/32, body-lg 20/32, body-md 16/26, body-sm 14/22, label-lg 14/20 500, label-md 12/16 500, label-sm 11/14 500, nav/button 14/20 500. Без uppercase. На мобильных размеры масштабируются через clamp, пропорции сохраняются.
3. Радиусы: sm 4, md 8, lg 12, xl 28, full 9999. Кнопки, чипы, инпуты — pill (full). Карточки — 28px.
4. Отступы: xs 8, sm 20, md 56, lg 96, xl 128; md/lg — между секциями.
5. Кнопки: primary — фон primary, белый текст, pill, padding 13px 20px, высота 40px, hover → primary-70. Secondary — прозрачный фон, чёрный текст, чёрная рамка 1px, pill. Link — без фона, подчёркнут, body-sm.
6. Карточки: фон secondary `#FAFAFA` (или белый с прозрачностью для стекла), рамка `#FFFFFFB8`, радиус 28px, padding 24px, мягкая тень (никаких тяжёлых теней), лёгкий внутренний highlight (`inset 0 1px 0 #fff`).
7. Инпуты: белый фон, чёрный текст, pill, padding 13px 20px, focus — обводка primary.
8. Чипы: фон secondary, чёрный текст, label-md, pill, padding 6px 12px.
9. Тёмные поверхности — только внутри видео/плеера/«продуктового» вьюпорта. Не больше одного акцентного цвета на UI-элементах (декоративные цветные видео/иллюстрации не трогаем).
10. **Анимации не меняются**: никакие keyframes, transition, GSAP/motion-код, JS-компоненты анимаций, тайминги, reduced-motion логика не правятся и не удаляются. Меняются только цвета, шрифты, радиусы, отступы, тени, рамки.
11. Тексты (`src/content/ru.ts`) и DOM-структура не меняются, кроме подключения классов шрифтов.

**Крайние случаи**
- Кириллица: EB Garamond — уже есть `src/fonts/EBGaramond-Cyrillic.woff2`. Geist — если в пакете `geist` нет кириллицы, стек шрифтов должен падать на Inter (`var(--font-geist-sans), var(--font-inter), sans-serif`), а не на системный шрифт. [ASSUMPTION: кириллица в Geist есть не во всех версиях — проверить фактически]
- Контраст: белый текст на `#1A66F0` и чёрный на `#FAFAFA`/`#F3F5FB` проходят WCAG AA.
- Ширина 320–1440px без горизонтального скролла.

**Критерии приёмки**
```
Given главная страница / при 1440 и 390 px
When страница загружена
Then h1 героя набран EB Garamond, body/nav/кнопки — Geist (или Inter-фолбэк на кириллице), primary-кнопка #1A66F0 pill высотой ≥40px

Given /sign-in и /register
When страница загружена
Then карточка формы имеет радиус 28px, инпуты и кнопки pill, акцент #1A66F0, ошибки #D92D20

Given /app/profile
When страница загружена
Then заголовок EB Garamond, карточки 28px со стеклянной рамкой, акцент #1A66F0, фон светлый (#FAFAFA/#F3F5FB)

Given любая из страниц
When сравниваем diff
Then нет изменений в keyframes/transition/animation/GSAP/motion-коде и в ru.ts

Given проект
When npm/pnpm build и lint
Then оба проходят без ошибок; существующие unit/e2e тесты по затронутым страницам проходят (или падения объяснены и не вызваны изменением)
```

## SECTION 2: PLAN

**Стек.** Next.js App Router (версия с breaking changes — см. `node_modules/next/dist/docs/`), React, TypeScript, Tailwind, CSS-файлы со скоупленными токенами, pnpm.

**Архитектура стилей (проверено в коде):**
- Лендинг: `src/app/page.tsx` подключает `landing-video.css` и `glass-buttons.css`; токены `--lv-*` в `.landing-video` (`src/app/landing-video.css`). Шрифты лендинга — `localFont` в `page.tsx` (Spectral, VT323, Monocraft) + Inter/Manrope из `src/app/layout.tsx`.
- Вход/регистрация: `src/app/sign-in/auth.css` (также импортируется `register/page.tsx`, `auth/reset/page.tsx`), компоненты `src/components/auth/*`. Используют глобальные токены (`--amber-500`, `--cream-50`, ...).
- Профиль: `src/app/app/profile.css`, токены `--profile-*` в `.profile-shell`, компоненты `src/components/profile/*`. Профиль рендерится внутри `CabinetShell` — шелл кабинета НЕ трогаем.

**Контракт шрифтов (общий для всех задач):**
- `--font-geist-sans` — Geist (из `geist/font/sans`, `GeistSans.variable`), подключается на `<body>` в `src/app/layout.tsx`.
- `--font-eb-garamond` — EB Garamond 500 через `next/font/local` из `src/fonts/EBGaramond-Cyrillic.woff2`, подключается на `<body>` в `src/app/layout.tsx`.
- Стеки: sans = `var(--font-geist-sans), var(--font-inter), sans-serif`; serif = `var(--font-eb-garamond), Georgia, serif`.

**Данные / API.** Не меняются.

**Тестирование.** `pnpm build`, `pnpm lint`, unit-тесты (vitest) и e2e (Playwright) по лендингу/auth/профилю. Скриншоты 1440 и 390 для визуальной проверки.

**Безопасность/производительность.** Шрифты локальные, без запросов к внешним CDN. `preload` только для шрифтов первого экрана.

## SECTION 3: TASKS

## Task 1 (frontend): Шрифты + лендинг
**Что сделать:** установить `geist` (pnpm), подключить `--font-geist-sans` и `--font-eb-garamond` в `src/app/layout.tsx` по контракту. Перевести токены `.landing-video` и связанные стили лендинга (header, hero, кнопки, карточки фич/бенефитов, FAQ, финальный CTA, footer) на палитру/типографику/радиусы Neuralese. Не трогать анимации.
**Файлы:** `package.json`, `pnpm-lock.yaml`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/landing-video.css`, при необходимости `src/app/glass-buttons.css` (только цвета/радиусы).
**Приёмка:** h1 героя — EB Garamond; кнопки по токенам; build+lint зелёные.
**Зависимости:** нет.

## Task 2 (frontend): Вход/регистрация
**Что сделать:** перевести `auth.css` на Neuralese: карточка 28px, стеклянная рамка, pill-инпуты и кнопки, заголовки EB Garamond, текст Geist, акцент primary, ошибки error. Тёмный вариант `.auth-dark` — если используется, привести к светлой системе только если это не меняет поведение; иначе оставить.
**Файлы:** `src/app/sign-in/auth.css`, при необходимости классы в `src/components/auth/*` (без изменения логики).
**Приёмка:** /sign-in и /register соответствуют критериям; build+lint зелёные.
**Зависимости:** шрифтовые переменные из Task 1 (работать по контракту, параллельно).

## Task 3 (frontend): Профиль
**Что сделать:** перевести токены `--profile-*` и стили `profile.css` на Neuralese (заголовки EB Garamond, карточки 28px, pill-кнопки/чипы/инпуты, primary-акцент, фон secondary/surface). CabinetShell не трогать.
**Файлы:** `src/app/app/profile.css`, при необходимости `src/components/profile/stickers.css` (только цвета/радиусы).
**Приёмка:** /app/profile соответствует критериям; build+lint зелёные.
**Зависимости:** шрифтовые переменные из Task 1 (по контракту, параллельно).

**Review checkpoint:** проверить скриншоты 1440/390 всех трёх зон и diff на отсутствие изменений в анимациях.

## Assumptions to review
1. Профиль меняется только внутри `.profile-shell`; общий шелл кабинета остаётся прежним — Impact: HIGH. Исправить, если хотите сменить и боковую навигацию кабинета.
2. Декоративные цветные видео/иллюстрации на лендинге сохраняются как есть (это контент, не UI) — Impact: MEDIUM.
3. Geist может не покрывать кириллицу → фолбэк на Inter для кириллических глифов — Impact: MEDIUM.
4. Шрифты Spectral/VT323/Monocraft на лендинге заменяются EB Garamond/Geist там, где они используются для заголовков/текста; пиксельные шрифты внутри анимированных «экранов» кода остаются — Impact: MEDIUM.
