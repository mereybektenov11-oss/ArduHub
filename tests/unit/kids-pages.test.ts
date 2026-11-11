import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createProgress } from "../../src/domain/seed";
import { LearningStore } from "../../src/domain/projects/storage";
const state = vi.hoisted(() => ({
  progress: null as unknown,
  store: null as unknown,
}));
vi.mock("@/lib/useProgress", () => ({
  useProgress: () => ({
    progress: state.progress,
    update: vi.fn(),
    notify: vi.fn(),
    refreshAccount: vi.fn(),
  }),
}));
vi.mock("@/lib/useLearningStore", () => ({
  useLearningStore: () => ({ store: state.store, mutate: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
import PracticePage from "../../src/app/app/practice/page";
import PracticeView from "../../src/components/cabinet/PracticeView";
import ProjectsView from "../../src/components/projects/ProjectsView";
import ProfilePage from "../../src/components/profile/ProfilePage";
import ProfileSettings from "../../src/components/profile/ProfileSettings";
import ShopPage from "../../src/components/shop/ShopPage";
import Leaderboard from "../../src/components/home/Leaderboard";
describe("G6 pupil pages", () => {
  it("keeps only training and glossary navigation even for the old homework query", async () => {
    state.progress = createProgress();
    const page = await PracticePage({
      searchParams: Promise.resolve({ tab: "homework" }),
    });
    const html = renderToStaticMarkup(page);
    expect(html).not.toContain("Домашка");
    expect(html).not.toContain("?tab=homework");
    expect(html).toContain("?tab=training");
    expect(html).toContain("?tab=glossary");
    expect(html).toContain("kids-games");
  });

  it("has exactly three training game links and no review for fresh progress", () => {
    state.progress = createProgress();
    const html = renderToStaticMarkup(createElement(PracticeView));
    for (const id of ["blitz", "findbug", "match"])
      expect(html).toContain(`href="/app/practice/${id}"`);
    expect(html).not.toContain("Повторить ошибки");
    expect(html).not.toContain("cab-topic-picks");
    expect(html).not.toContain("cab-tabs");
  });
  it("shows review only with pending mistakes and offers the real review action", () => {
    const p = createProgress();
    p.reviewQueue.push({
      termOrLessonId: "lesson-1",
      errorCode: "led_reversed",
      addedAt: "2026-10-25",
    });
    state.progress = p;
    const html = renderToStaticMarkup(createElement(PracticeView));
    expect(html).toContain("Повторить ошибки (1)");
    expect(html).toContain("/app/practice?review=1");
  });
  it("keeps a fresh project store empty and offers creation with no visible file field", () => {
    const storage = new Map<string, string>();
    const store = new LearningStore({
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value);
      },
      removeItem: (key) => {
        storage.delete(key);
      },
    });
    store.load();
    state.store = store;
    expect(store.projects).toEqual([]);
    const html = renderToStaticMarkup(createElement(ProjectsView));
    expect(store.projects).toEqual([]);
    expect(html).toContain("Твоя мастерская ждёт первую идею");
    expect(html).toContain("Создать проект");
    expect(html).not.toContain("Мой проект");
    expect(html).toMatch(/<input[^>]*hidden=""[^>]*type="file"/);
  });
  it("renders the account page without the removed legacy profile blocks", () => {
    state.progress = createProgress();
    const html = renderToStaticMarkup(createElement(ProfilePage));
    expect(html).toContain("Детали аккаунта");
    expect(html).toContain("Профиль без аккаунта");
    expect(html).toContain('href="/app/profile/settings"');
    expect(html).not.toContain("kids-mentor-picker");
    expect(html).not.toContain("Сменить наставника");
    expect(html).not.toMatch(/role="switch"/);
  });
  it("renders the separate settings form with sounds and leaderboard privacy", () => {
    state.progress = createProgress();
    const html = renderToStaticMarkup(createElement(ProfileSettings));
    expect(html).toContain("Звуки интерфейса");
    expect(html).toContain("Скрыть меня из таблицы лидеров");
    expect(html.match(/role="switch"/g)).toHaveLength(1);
    expect(html).toMatch(/<select/);
  });
  it("renders three shop tabs and a truthful empty ranking without invented rank", () => {
    state.progress = createProgress();
    const shop = renderToStaticMarkup(createElement(ShopPage));
    for (const title of ["Наставники", "Бусты", "Рамки"])
      expect(shop).toContain(title);
    expect(shop).toContain("kids-sparks");
    const leaderboard = renderToStaticMarkup(createElement(Leaderboard));
    expect(leaderboard).toContain("Стань первым!");
    expect(leaderboard).not.toContain("Твоё место:");
    expect(leaderboard.match(/kids-podium-step/g)).toHaveLength(3);
  });
});
