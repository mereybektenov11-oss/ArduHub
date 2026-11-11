# TextureButton: кнопки по важности

Источник: запрос пользователя 10.11.2026 (компонент `texture-button.tsx` + «кнопки везде одинаковые, сделай под важность и тематику: выйти — красная, начать бесплатно — стеклянная»).
Уточнения пользователя: цвета переводятся на токены Cobalt Mono; охват — лендинг, вход/регистрация, личный профиль (старый учебный кабинет не трогаем); «Выйти» — мягкий красный; «Начать бесплатно» — новое стекло на основе текстуры (не текущее радужное).

---

## SECTION 1: SPEC

**One-line purpose**
Кнопки лендинга, входа/регистрации и личного профиля визуально различаются по важности и смыслу действия, сохраняя стиль Cobalt Mono.

**Users and use cases**
- As a посетитель лендинга, I want главное действие «Начать бесплатно» сразу выделялось so that я понимаю, куда нажать.
- As a ученик в профиле, I want «Выйти» был заметно отличим от обычных действий so that я не нажму его случайно и легко найду.
- As a пользователь формы входа/регистрации, I want основная кнопка отправки отличалась от второстепенных ссылок so that понятен следующий шаг.
- As a разработчик, I want один компонент кнопки с набором вариантов so that новые экраны используют те же уровни важности.

**Requirements**
1. Есть единый компонент кнопки с вариантами: `primary` (главное действие формы/экрана), `glass` (главный маркетинговый призыв), `secondary` (обычное действие), `accent` (выделенное второе действие), `danger-soft` (выход и обратимые «уходящие» действия), `destructive` (необратимое удаление), `minimal` (текстовые второстепенные действия), `icon` (кнопки-иконки).
2. Размеры: `sm`, `default`, `lg`, `icon`.
3. Все цвета, тени и градиенты берутся из CSS-переменных (токенов); ни одного цвета стандартной палитры Tailwind или hex прямо в разметке компонента.
4. Компонент может рендериться как `<button>` или как ссылка (сохраняя навигацию, `href`, `aria-*`), без вложенных интерактивных элементов и без блочных элементов внутри `<button>`.
5. Видимый фокус с клавиатуры у всех вариантов; заметное состояние `disabled` (не реагирует на hover/active, курсор not-allowed).
6. Работает в светлой и тёмной теме экрана входа (`.auth-dark`); лендинг и профиль — светлая тема.
7. При `prefers-reduced-motion: reduce` переходы кнопок отключены.
8. Сопоставление на экранах — см. таблицу в TASKS 2–4; тексты, маршруты, обработчики и `aria`-атрибуты существующих кнопок не меняются.
9. Тексты не меняются; новые строки (если понадобятся) — только в `src/content/ru.ts` и проходят `lint:copy`.

**Edge cases**
- Длинный текст на 360px: кнопка переносит строку или сжимается без горизонтальной прокрутки страницы.
- Отключённая кнопка-ссылка (Pro, «Для школ», скачивание приложения): не навигирует, имеет `aria-disabled`, отображается как disabled.
- Кнопка в состоянии загрузки (`busy`) — текст «Сохраняем…» и т.п. остаётся, ширина не прыгает заметно. [ASSUMPTION: фиксированная ширина не требуется]
- Тёмная тема входа переключается на лету — кнопки меняются без перезагрузки.
- Высокий контраст / forced-colors: кнопка остаётся различимой (рамка видна). [ASSUMPTION: достаточно `border` в forced-colors]

**Acceptance criteria**
```
Given лендинг на 1440px
When страница загружена
Then «Начать бесплатно» в hero и в финальном блоке отрисованы вариантом glass, а «Войти/аккаунт» в шапке — secondary

Given профиль /app/profile
When страница загружена
Then «Выйти» отрисована вариантом danger-soft (красный текст/обод на светлом фоне), а «Редактировать профиль» — secondary

Given экран входа в тёмной теме
When пользователь смотрит на кнопку отправки
Then используется primary с тёмными значениями токенов и контраст текста ≥ 4.5:1

Given любая мигрированная кнопка
When пользователь переходит на неё клавишей Tab
Then виден индикатор фокуса

Given отключённая кнопка Pro на /app/pricing
When пользователь кликает по ней
Then ничего не происходит, у элемента disabled или aria-disabled="true"

Given ширина 360px
When открыты лендинг, вход, регистрация, профиль, настройки, тарифы
Then нет горизонтального переполнения и Axe не находит serious/critical
```

---

## SECTION 2: PLAN

**Stack and architecture**
Next.js App Router, React, TypeScript, Tailwind CSS 4.3 (подключён через `@config` в `src/app/globals.css`), pnpm. shadcn CLI не инициализирован (нет `components.json`), но папка `src/components/ui` уже существует и используется — компонент кладётся туда (`@/components/ui/texture-button`). `components.json` не создаём: CLI не используется, файл копируется вручную. [ASSUMPTION: shadcn CLI не нужен]

**Data model changes**
Нет.

**API contracts**
```
TextureButton(props: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "glass" | "secondary" | "accent" | "danger-soft" | "destructive" | "minimal" | "icon"  // default "primary"
  size?: "sm" | "default" | "lg" | "icon"  // default "default"
  asChild?: boolean  // рендерить единственный дочерний элемент (например next/link) с классами кнопки
})
```
- forwardRef на корневой элемент.
- Внутренний слой — `<span>` (не `<div>`: блочный элемент внутри `<button>` невалиден).
- Исправление исходного компонента: в оригинале при `asChild` `Slot` получает `<div>` как ребёнка, поэтому классы попадают на div, а не на ссылку. Надо при `asChild` клонировать дочерний элемент и оборачивать его `children` во внутренний `<span>` (или использовать `Slottable`).
- `cn` = `twMerge(clsx(...))` в `src/lib/utils.ts`.

**Tokens**
Новый файл `src/app/texture-button.css` (импорт в `src/app/layout.tsx` или `globals.css`), переменные `--tb-*` на `:root` в значениях Cobalt Mono (`#1460ff`, `#104ed1`, `#101114`, `#e1e2ee`, `#fcfcff`, `#edeaff`, `#bb2635` — из `profile.css`/`auth.css`), переопределения внутри `.auth-page.auth-dark` (значения из тёмного блока `auth.css`). Классы компонента используют только `bg-[var(--tb-…)]`, `from-[var(--tb-…)]` и т.п. Вариант `glass`: полупрозрачный внутренний градиент токенов + `backdrop-blur`, светлый обод.

**Patterns to follow**
- Тексты — `src/content/ru.ts`; цвета — токены; стили профиля ограничены `.profile-shell`, входа — `.auth-page`.
- `src/app/glass-buttons.css` принудительно (`!important`) перекрашивает кнопки в `.landing-video :is(.hero, .header)` — для мигрированных кнопок эти правила нужно снять (исключить селектором или удалить), иначе вариант не будет виден. [ASSUMPTION: радужное стекло больше не нужно на мигрированных кнопках; файл и прочие его применения сохраняются]
- Существующий `Button` из `primitives.tsx` используется и в других местах — не удалять; на лендинге заменить на TextureButton в местах из TASK 2.

**Testing strategy**
- Unit (vitest, `renderToStaticMarkup`): каждый вариант даёт свой класс-маркер; `asChild` переносит классы на ссылку и сохраняет `href`; внутри `<button>` нет `<div>`; в исходнике компонента нет классов палитры Tailwind (`indigo|red|neutral|stone|black|white` в utility-классах цвета).
- E2E (Playwright, существующие spec-файлы): обновить селекторы, если они опирались на старые классы; добавить проверки `data-variant` для ключевых кнопок; 360/768/1440 без переполнения, Axe без serious/critical.
- Скриншоты в `outputs/texture-buttons/`.

**Security and performance constraints**
Нет новых сетевых запросов. Новые зависимости только `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`. `lucide-react` не ставим: демо обходится без иконок библиотеки. [ASSUMPTION: демо-страница не нужна в продакшене — кладём в `/dev/texture-buttons`, как другие dev-страницы]

---

## SECTION 3: TASKS

Общие требования к каждой задаче: `pnpm build` (или `node_modules/.bin/next build --webpack`), `pnpm lint`, `node scripts/lint-copy.mjs`, `pnpm test`, Prettier изменённых файлов, затронутые E2E на свежей сборке (порт 3100, Playwright переиспользует сервер — перед прогоном убедиться, что запущен сервер именно от новой сборки). Запись в `docs/progress.md`. Без коммитов.

## Task 1: Компонент TextureButton на токенах

**What to build:** Установить `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`. Создать `src/lib/utils.ts` (`cn`). Создать `src/components/ui/texture-button.tsx` по присланному компоненту с изменениями из PLAN: варианты `primary, glass, secondary, accent, danger-soft, destructive, minimal, icon`; размеры `sm, default, lg, icon`; только токены `--tb-*`; внутренний `<span>`; рабочий `asChild`; `focus-visible` кольцо; `disabled`/`aria-disabled` стили; `motion-reduce:transition-none`; атрибут `data-variant={variant}` на корне. Создать `src/app/texture-button.css` с токенами (светлые на `:root`, тёмные в `.auth-page.auth-dark`) и подключить глобально. Демо `src/app/dev/texture-buttons/page.tsx` со всеми вариантами × размерами, включая disabled.
**Files likely affected:** `package.json`, `pnpm-lock.yaml`, `src/lib/utils.ts`, `src/components/ui/texture-button.tsx`, `src/app/texture-button.css`, `src/app/layout.tsx` или `src/app/globals.css`, `src/app/dev/texture-buttons/page.tsx`, `tests/unit/texture-button.test.tsx`
**Acceptance criteria:**
1. Unit-тест: все 8 вариантов рендерятся с `data-variant`; `asChild` с `<a href="/x">` даёт один `<a>` с классами кнопки и внутренним `<span>`; в `<button>` нет `<div>`.
2. Unit-тест: исходник компонента не содержит цветовых utility-классов палитры Tailwind (`(bg|from|to|via|text|border)-(indigo|red|neutral|stone|black|white|gray)`).
3. Сборка, lint, lint:copy, unit зелёные; `/dev/texture-buttons` открывается.
**Dependencies:** none

## Task 2: Лендинг

**What to build:** Перевести кнопки лендинга на TextureButton:
| Кнопка | Файл | Вариант |
|---|---|---|
| «Начать бесплатно» в hero | `src/components/landing/VideoLanding.tsx` (~стр. 84) | `glass`, `lg` |
| «Начать бесплатно» в финальном блоке | `VideoLanding.tsx` `VideoFinalCta` | `glass`, `lg` |
| Аккаунт/«Войти» в шапке | `src/components/Header.tsx` | `secondary` |
| Переключатель мобильного меню | `Header.tsx` | `icon`, `icon` |
| Кнопка в `BenefitCards.tsx` (~стр. 203) | `src/components/landing/BenefitCards.tsx` | `icon` или `minimal` по смыслу [ASSUMPTION: управляющая кнопка карточек — minimal] |
Ссылки остаются ссылками (`asChild`), стрелка `↗` сохраняется. Снять для мигрированных кнопок принудительные правила `src/app/glass-buttons.css`. Не менять фон, видео и логотип.
**Files likely affected:** `VideoLanding.tsx`, `Header.tsx`, `BenefitCards.tsx`, `src/app/glass-buttons.css`, `src/app/landing-video.css`, `tests/e2e/landing-video.spec.ts`
**Acceptance criteria:**
1. E2E: hero и финальный CTA имеют `data-variant="glass"`, шапка — `secondary`; ведут на прежние адреса.
2. `landing-video.spec.ts` проходит полностью; 360/768/1440 без переполнения, Axe без serious/critical.
3. Скриншоты hero на 360/1440 в `outputs/texture-buttons/`.
**Dependencies:** Task 1

## Task 3: Вход и регистрация

**What to build:** В `src/components/auth/AuthCard.tsx` и `src/components/ui/sign-up.tsx`:
| Кнопка | Вариант |
|---|---|
| Отправка входа/регистрации (`auth-primary`, `signup-submit`) | `primary` |
| Стрелка «далее» (`signup-next`) | `primary`, `icon` |
| Показать/скрыть пароль, переключатель темы | `icon`, `icon` |
| «Отправить письмо ещё раз» (resend) | `secondary`, `sm` |
| «Войти без аккаунта» (`auth-guest`, onGuest) | `secondary` |
| Текстовые ссылки (`auth-link`: забыли пароль, переключение режима) | `minimal`, `sm` |
Сохранить все обработчики, `disabled`, `aria-label`, `type`, cooldown. Проверить обе темы (`.auth-dark`).
**Files likely affected:** `AuthCard.tsx`, `sign-up.tsx`, `src/app/sign-in/auth.css`, `tests/e2e/auth-*.spec.ts`
**Acceptance criteria:**
1. Все `tests/e2e/auth-*.spec.ts` (кроме live) проходят; добавлена проверка `data-variant` для отправки и гостевого входа.
2. В обеих темах контраст текста кнопок ≥ 4.5:1 (Axe без serious/critical), 360x480/862x327/1440x900 без переполнения, scrollY=0 как в существующих регрессиях.
**Dependencies:** Task 1

## Task 4: Личный профиль

**What to build:** В оболочке `/app/profile*`, `/app/pricing`, `/app/docs*`:
| Кнопка | Файл | Вариант |
|---|---|---|
| «Выйти» | `src/components/profile/ProfileShell.tsx` | `danger-soft` |
| «Профиль» в навбаре | `ProfileShell.tsx` | `secondary` |
| «Редактировать профиль» | `src/components/profile/ProfilePage.tsx` | `secondary` |
| «Сохранить прогресс» (гость) | `ProfilePage.tsx` | `accent` |
| «Сохранить» в настройках | `src/components/profile/ProfileSettings.tsx` | `primary` |
| Бесплатный тариф «Начать бесплатно» | `src/components/ui/pricing.tsx` | `primary` (изменено пользователем 10.11.2026: glass на белой карточке слабый) |
| Pro (отключено) | `pricing.tsx` | `secondary`, disabled |
| «Для школ» (отключено) | `pricing.tsx` | `secondary`, disabled |
| Ссылка на урок в документации | `src/components/profile/DocumentationView.tsx` | `primary` |
| «Скачать приложение» (отключено) | `src/app/app/profile/desktop/page.tsx` | `secondary`, disabled |
| Ссылка на странице прогресса | `src/app/app/profile/progress/page.tsx` | `secondary` |
Убрать класс `profile-glass` у мигрированных элементов и неиспользуемые его правила в `src/app/app/profile.css` (оставить, если ещё где-то используется). `Stickers.tsx` не трогать (старый интерфейс).
**Files likely affected:** перечисленные файлы, `src/app/app/profile.css`, `tests/e2e/profile-cobalt.spec.ts`, `tests/e2e/account-navigation.spec.ts`, `tests/e2e/copy-crawl.spec.ts`
**Acceptance criteria:**
1. E2E: «Выйти» — `data-variant="danger-soft"`, выход работает; гостевое «Сохранить прогресс» ведёт на `/register`; кнопки Pro/школ отключены.
2. `profile-cobalt`, `account-navigation`, `copy-crawl` проходят; 360/768/1440 без переполнения, Axe без serious/critical.
3. Скриншоты профиля, настроек и тарифов на 360/1440 в `outputs/texture-buttons/`.
**Dependencies:** Task 1

**Review checkpoint:** Перед раздачей задач проверить таблицы вариантов в Task 2–4: именно там решается, какая кнопка какой важности.

---

## Assumptions to review

1. Радужное стекло из `glass-buttons.css` снимается с мигрированных кнопок лендинга (в т.ч. шапки) — Impact: HIGH
   Correct this if: хотите сохранить радужный материал на «Войти» в шапке.
2. Сопоставление «Сохранить прогресс» → `accent`, «Профиль» в навбаре → `secondary`, Pro отключённый → `primary` — Impact: MEDIUM
   Correct this if: видите иную иерархию важности.
3. Полный красный (`destructive`) пока нигде не применяется в охвате — нет необратимых действий на этих экранах — Impact: MEDIUM
   Correct this if: есть кнопка удаления, которую нужно сделать красной.
4. Демо `/dev/texture-buttons` вместо присланного demo.tsx, без `lucide-react` — Impact: LOW
   Correct this if: нужны иконки lucide.
5. shadcn CLI и `components.json` не настраиваются — Impact: LOW
   Correct this if: планируете ставить другие компоненты через `npx shadcn add`.
6. Кнопка в `BenefitCards` → `minimal` — Impact: LOW
