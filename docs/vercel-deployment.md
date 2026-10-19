# Публикация ArduHub на Vercel — 17.10.2026

Сайт: https://arduhub.vercel.app

Проект: merey4/arduhub (`prj_TRbnoexu5CiDthmEXlZUCpbnubID`). Успешный production deployment: `dpl_ArzQavknQ9MFpT3HX1KfXRroKnRP`, состояние READY. Панель: https://vercel.com/merey4/arduhub/ArzQavknQ9MFpT3HX1KfXRroKnRP.

Последнее обновление карты и регистрации: `dpl_5PfsrTEAzhjetU2K3NffsDqnE3yK`, READY, https://vercel.com/merey4/arduhub/5PfsrTEAzhjetU2K3NffsDqnE3yK. Дополнительно прошли 5 production E2E, включая новую регистрацию без письма и сохранение сессии. Подробности в `docs/progress.md`.

Текущая production-версия с отдельным `/register` и ссылкой регистрации в меню: `dpl_5wARcBtPr7GdzHVEyvgHZzBhacQn`, READY, https://vercel.com/merey4/arduhub/5wARcBtPr7GdzHVEyvgHZzBhacQn.

## Конфигурация

- Node 24.x, pnpm 11.25.0 явно закреплены. Vercel выполнил установку с frozen lockfile, Next.js production build и TypeScript.
- `.vercelignore` исключает локальные env, инструменты Arduino, отчёты, референсы и исходники отдельного compiler-service. Корневая папка `/supabase/` исключена, клиентские модули `src/lib/supabase/` включены.
- После отдельного согласия владельца ключи Groq/YouTube перенесены в sensitive production variables. Публичная конфигурация Supabase, SITE_URL/NEXT_PUBLIC_SITE_URL, AUTH_REQUIRED=true подключены. LOCAL_COMPILER=false; loopback compiler URL и его ключ не передавались.
- В Supabase Site URL установлен https://arduhub.vercel.app. Добавлены точные `/auth/callback` и `/auth/callback?next=reset`; шесть локальных адресов сохранены. Подтверждение почты оставлено в ранее согласованном режиме прототипа. SMTP не настроен.
- Публикация выполнена CLI из локальной папки. Git-репозиторий и автоматический деплой из Git не подключены.

## Проверки опубликованного сайта

- 6 браузерных сценариев прошли: тест по теме с сохранением/повторной попыткой; настоящий AVR-запуск готового примера из вкладки «Тесты»; выбор/удаление/отмена проводов; перемещение деталей и мобильные отступы; очистка всех проводов и восстановление; вход техническим аккаунтом, перенос прогресса, восстановление во втором браузере и выход.
- Реальный Groq: HTTP 200, потоковый ответ без fallback, первый фрагмент около 1,3 с. Видео урока: HTTP 200, найден сохранённый videoId. Это не отдельная проверка нового поиска через YouTube API.
- Главная, вход, robots.txt и sitemap.xml отвечают 200. Без сессии кабинет переводит на вход. Production `/api/health` закрыт (404).
- Локальный ESLint прошёл. Облачная сборка и проверка типов прошли. Локальная работающая сборка не перезаписывалась.

## Ограничения

В облаке запускаются точные готовые учебные программы из проверенного набора HEX. Для компиляции изменённого скетча нужен отдельный изолированный compiler-service. Доверенный локальный Arduino CLI gateway остаётся только на компьютере владельца и не опубликован. Не считать Docker-компилятор подключённым или проверенным.

Регистрация без подтверждения почты остаётся режимом прототипа; отправка писем восстановления пароля не проверена. Проверка входа выполнена существующим техническим аккаунтом с отдельным согласием владельца.

Первая облачная сборка завершилась ошибкой из-за слишком широкого исключения `supabase/`. После замены на `/supabase/` состав загрузки проверен, повторная сборка успешна.

Доказательства: `reports/vercel-upload.json`, `reports/vercel-e2e/`, `reports/dashboard/live-services.json`, `reports/vercel/supabase-urls.png` (локальные, исключены из публикации).
