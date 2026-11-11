// Russian copy of the desktop app. Unavailable features are labelled as in
// development; nothing here claims a feature works before it does.
export const site = "https://arduhub.vercel.app";
/** Site server the app calls (AI mentor). Overridable at build time for
 *  local testing: ARDUHUB_SITE_API=http://127.0.0.1:3001 */
export const siteApi = __SITE_API__ || site;

export const t = {
  brand: "ArduHub",
  loading: "Загружаем…",
  login: {
    eyebrow: "Ночная лаборатория",
    title: "Вход в ArduHub",
    subtitle: "Используй тот же аккаунт, что и на сайте.",
    email: "Почта",
    password: "Пароль",
    show: "Показать пароль",
    hide: "Скрыть пароль",
    submit: "Войти",
    busy: "Входим…",
    register: "Создать аккаунт на сайте",
    forgot: "Забыли пароль?",
    empty: "Введи почту и пароль.",
    invalid: "Неверная почта или пароль.",
    rate: "Слишком много попыток. Подожди немного и попробуй снова.",
    network: "Нет связи с сервером. Проверь интернет и попробуй снова.",
    unconfirmed: "Почта ещё не подтверждена.",
    config: "Приложение собрано без настроек аккаунтов. Вход недоступен.",
  },
  menu: {
    greeting: (name: string) => `Привет, ${name}!`,
    fallbackName: "изобретатель",
    question: "Что соберём сегодня?",
    intro:
      "Учись по урокам, а потом проверяй знания в 3D-лаборатории: бери детали, соединяй провода и запускай свою программу.",
    soon: "В разработке",
    learning: "Обучение",
    learningHint: "Уроки: видео, теория, тест, схема и код",
    practice: "Практика",
    practiceHint: "3D-лаборатория: собери схему руками и запусти",
    profile: "Профиль",
    profileHint: "Прогресс, тариф и аккаунт — откроется сайт",
    progress: (done: number, total: number) => `Пройдено ${done} из ${total}`,
    progressUnknown: "Прогресс пока не загружен",
    settings: "Настройки",
    plan: "Free",
  },
  settings: {
    title: "Настройки",
    back: "В меню",
    text: "Размер текста",
    textSizes: [
      ["1", "Обычный"],
      ["1.15", "Крупный"],
      ["1.3", "Очень крупный"],
    ] as const,
    motion: "Меньше анимации",
    sounds: "Звуковые эффекты",
    voice: "Наставник говорит вслух",
    volume: "Громкость",
    testSound: "Проверить звук",
    account: "Аккаунт",
    email: "Почта",
    session: "Хранение входа",
    sessionSafe: "Зашифровано средствами Windows на этом компьютере",
    sessionMemory: "Только до закрытия приложения: шифрование недоступно",
    signOut: "Выйти из аккаунта",
    version: "Версия приложения",
    privacy: "Политика конфиденциальности",
  },
  mock: "ArduHub для ПК · ранняя версия в разработке",
} as const;
