export const kidsMentorRu = {
  ask: "Спросить наставника",
  explain: "Объясни",
  review: "Разбор проекта",
  reviewErrors: "Разбор ошибок",
  nudge: "Нужна подсказка? Давай разберёмся вместе!",
  dismissNudge: "Закрыть подсказку",
  explainQuestion: (question: string, answer: string) =>
    `Объясни вопрос: ${question}\nМой ответ: ${answer}`,
  explainGame: (title: string) =>
    `Помоги разобраться с ошибками в игре «${title}».`,
} as const;
