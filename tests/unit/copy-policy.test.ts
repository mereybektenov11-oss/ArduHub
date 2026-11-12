import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
describe("UI copy policy", () => {
  it.each([
    "Гостевой баланс",
    "ДЕМО",
    "Демонстрационный",
    "Скоро",
    "В разработке",
    "Заглушка",
    "Учебная модель",
    "Работает в симуляции",
    "Из кэша",
    "Импорт JSON",
  ])("rejects prohibited interface copy: %s", (phrase) => {
    expect(
      spawnSync(process.execPath, [
        "scripts/lint-copy.mjs",
        "--check-text",
        phrase,
      ]).status,
    ).toBe(1);
  });
  it.each([
    "Скорость мигания",
    "Пока без запуска",
    "Не получилось запустить, попробуй ещё раз через минуту",
    "Начать без аккаунта",
  ])("allows ordinary vocabulary: %s", (phrase) => {
    expect(
      spawnSync(process.execPath, [
        "scripts/lint-copy.mjs",
        "--check-text",
        phrase,
      ]).status,
    ).toBe(0);
  });
});
