export const learningT = {
  back: "В меню",
  eyebrow: "Обучение · Arduino Uno",
  title: "Карта уроков",
  lesson: "Урок",
  progress: (done: number, total: number) => `Пройдено ${done} из ${total}`,
  status: { done: "Пройден", current: "Сейчас", locked: "Закрыт" },
  preparing: "Готовится",
  premium: "Премиум: ESP32 и новые уроки",
  premiumHint: "Планируется. Состав и сроки пока не определены.",
} as const;
