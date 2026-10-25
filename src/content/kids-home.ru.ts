export const kidsHomeRu = {
  greeting: (name: string) => `Привет, ${name}!`,
  continueLesson: (number: number, title: string) =>
    `Продолжи: Урок ${number}, ${title}`,
  chapterProgress: (done: number, total: number) => `${done} из ${total}`,
  finished: "Все уроки пройдены!",
  diagnosticTitle: "Не знаешь, с чего начать?",
  diagnosticText: "Пройди короткий тест",
  diagnosticStart: "Начать тест",
  close: "Закрыть",
  missions: "Миссии на сегодня",
  streak: "Серия",
  weekdays: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  activeDay: "занимался",
  emptyDay: "нет отметки",
  xp: (xp: number, next?: number) =>
    next === undefined ? `${xp} XP` : `${xp} из ${next} XP`,
  skip: "Перейти к содержимому",
} as const;
