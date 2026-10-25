import { describe, it, expect } from "vitest";
import {
  createProgress,
  lessons,
  levels,
  terms,
  homework,
} from "@/domain/seed";
import {
  localDate,
  recordActivity,
  activeStreak,
} from "@/domain/progress/streak";
import {
  awardLesson,
  lessonOpen,
  syncLessonStates,
  unlockMentor,
  xpLevel,
} from "@/domain/progress/xp";
import {
  BrowserProgressStore,
  STORAGE_KEY,
  isProgress,
} from "@/domain/progress/storage";
import { answerDiagnostic } from "@/domain/diagnostic";
import { homeworkStatus } from "@/domain/homework";
import { forgottenTerms } from "@/domain/review";
import { diagnosticDeck } from "@/content/cabinet.ru";
import { progressEvidence } from "../helpers/progressEvidence";
describe("curriculum and progress", () => {
  it("has consistent references and three valid first schematics", () => {
    expect(lessons.length).toBeGreaterThanOrEqual(12);
    expect(terms).toHaveLength(40);
    expect(homework).toHaveLength(6);
    expect(levels).toHaveLength(5);
    for (const l of lessons)
      expect(
        levels.flatMap((v) => v.units).find((u) => u.id === l.unitId)
          ?.lessonIds,
      ).toContain(l.id);
    for (const h of homework)
      for (const id of h.lessonIds)
        expect(lessons.some((l) => l.id === id)).toBe(true);
  });
  it("tracks local calendar days across midnight and gaps", () => {
    const a = { count: 1, lastActiveDate: "2026-10-15" };
    expect(recordActivity(a, "2026-10-16").count).toBe(2);
    expect(recordActivity(a, "2026-10-17").count).toBe(1);
    expect(recordActivity(a, "2026-10-15")).toBe(a);
    expect(
      recordActivity({ count: 0, lastActiveDate: null }, "2026-10-15").count,
    ).toBe(1);
    expect(recordActivity(a, "2026-10-14").count).toBe(1);
    expect(activeStreak(a, "2026-10-16")).toBe(1);
    expect(activeStreak(a, "2026-10-17")).toBe(0);
    expect(activeStreak({ count: 0, lastActiveDate: null }, "2026-10-16")).toBe(
      0,
    );
    expect(localDate(new Date(2026, 9, 16, 0, 0))).toBe("2026-10-16");
    expect(localDate(new Date(2026, 9, 15, 23, 59))).toBe("2026-10-15");
    expect(localDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(recordActivity(a).count).toBeGreaterThan(0);
    expect(activeStreak(a)).toBeGreaterThanOrEqual(0);
  });
  it("awards only once, opens next lessons, respects locks and caps levels", () => {
    let p = createProgress();
    expect(lessonOpen(p, "missing")).toBe(false);
    expect(lessonOpen(p, "lesson-2")).toBe(false);
    expect(lessonOpen(p, "lesson-4")).toBe(false);
    expect(awardLesson(p, "missing")).toBe(p);
    expect(awardLesson(p, "lesson-4")).toBe(p);
    expect(awardLesson(p, "lesson-1")).toBe(p);
    p.lessons["lesson-1"] = {
      ...p.lessons["lesson-1"],
      ...progressEvidence("lesson-1"),
    };
    p = awardLesson(p, "lesson-1");
    expect(p.xp).toBe(30);
    expect(p.sparks).toBe(10);
    expect(p.diagnostic.skillScores.leds).toBe(15);
    expect(awardLesson(p, "lesson-1")).toBe(p);
    expect(p.lessons["lesson-2"].status).toBe("current");
    for (const l of lessons) {
      p.lessons[l.id] = { ...p.lessons[l.id], ...progressEvidence(l.id) };
      p = awardLesson(p, l.id);
    }
    expect(p.profile.level).toBe(3);
    expect(p.lessons["lesson-12"].status).toBe("done");
    expect(xpLevel(1400)).toBe(6);
    expect(xpLevel(149)).toBe(2);
    expect(xpLevel(55)).toBe(1);
    expect(xpLevel(700)).toBe(5);
    const synced = syncLessonStates(p);
    expect(synced.lessons["lesson-1"].status).toBe("done");
    expect(syncLessonStates(createProgress()).lessons["lesson-2"].status).toBe(
      "locked",
    );
  });
  it("unlocks mentors with exact price, no double charges", () => {
    const p = createProgress();
    expect(unlockMentor(p, "missing")).toBe(p);
    expect(unlockMentor(p, "volt")).toBe(p);
    expect(unlockMentor(p, "oma")).toBe(p);
    p.sparks = 80;
    const next = unlockMentor(p, "oma");
    expect(next.sparks).toBe(20);
    expect(next.mentor.selectedId).toBe("oma");
    expect(unlockMentor(next, "oma")).toBe(next);
  });
  it("resumes diagnosis and updates all topics only at finish", () => {
    let p = createProgress();
    for (let i = 0; i < 3; i++)
      p = answerDiagnostic(p, diagnosticDeck[i].correct);
    expect(p.diagnostic.status).toBe("inprogress");
    expect(p.diagnostic.answers).toHaveLength(3);
    for (let i = 3; i < 8; i++)
      p = answerDiagnostic(p, diagnosticDeck[i].correct);
    expect(p.profile.level).toBe(1);
    expect(lessonOpen(p, "lesson-2")).toBe(false);
    expect(Object.values(p.diagnostic.skillScores)).toEqual([
      100, 100, 100, 100, 100, 100,
    ]);
    expect(answerDiagnostic(p, 0)).toBe(p);
    p.diagnostic.status = "inprogress";
    expect(answerDiagnostic(p, 0)).toBe(p);
    let wrong = createProgress();
    for (let i = 0; i < 8; i++)
      wrong = answerDiagnostic(wrong, (diagnosticDeck[i].correct + 1) % 4);
    expect(wrong.profile.level).toBe(1);
  });
  it("keeps overdue homework accessible and derives forgotten terms", () => {
    const p = createProgress(),
      hw = homework[0];
    expect(homeworkStatus(hw, p, "2026-10-16")).toBe("overdue");
    expect(homeworkStatus(hw, p, "2026-10-15")).toBe("inprogress");
    for (const id of hw.lessonIds) p.lessons[id].status = "done";
    expect(homeworkStatus(hw, p, "2026-10-16")).toBe("done");
    expect(forgottenTerms(p)).toEqual([]);
    p.reviewQueue = [
      {
        termOrLessonId: "lesson-1",
        errorCode: "missing_resistor",
        addedAt: "",
      },
      { termOrLessonId: "term-4", errorCode: "wrong_pin", addedAt: "" },
      { termOrLessonId: "bad", errorCode: "bad", addedAt: "" },
    ];
    expect(forgottenTerms(p)[0].term.title).toBe("Резистор");
    expect(forgottenTerms(p)[0].count).toBe(2);
  });
});
describe("browser store", () => {
  const memory = () => {
    const data = new Map<string, string>();
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => {
        data.set(k, v);
      },
      removeItem: (k: string) => {
        data.delete(k);
      },
    };
  };
  it("persists and resets progress", () => {
    const s = memory(),
      store = new BrowserProgressStore(s);
    expect(store.load().xp).toBe(0);
    const p = createProgress();
    p.sparks = 20;
    store.save(p);
    expect(new BrowserProgressStore(s).load().sparks).toBe(20);
    expect(store.reset().sparks).toBe(0);
  });
  it("handles unavailable reads and writes using memory", () => {
    const absent = new BrowserProgressStore(null);
    absent.load();
    absent.save(createProgress());
    expect(absent.unavailable).toBe(true);
    const failing = new BrowserProgressStore({
      getItem: () => {
        throw Error();
      },
      setItem: () => {
        throw Error();
      },
      removeItem: () => {},
    });
    expect(failing.load().version).toBe(1);
    expect(failing.unavailable).toBe(true);
    const s = memory(),
      p = createProgress();
    const writeFail = new BrowserProgressStore({
      ...s,
      setItem: () => {
        throw Error();
      },
    });
    writeFail.save(p);
    expect(writeFail.unavailable).toBe(true);
    expect(writeFail.memory).toBe(p);
  });
  it("flags corrupt JSON and unsupported versions and migrates optional v1 fields", () => {
    const s = memory();
    s.setItem(STORAGE_KEY, "{bad");
    const broken = new BrowserProgressStore(s);
    expect(broken.load().version).toBe(1);
    expect(broken.corrupt).toBe(true);
    s.setItem(STORAGE_KEY, JSON.stringify({ ...createProgress(), version: 2 }));
    expect(new BrowserProgressStore(s).load().xp).toBe(0);
    const old: Record<string, unknown> = { ...createProgress() };
    delete old.collection;
    delete old.circuits;
    delete old.gameRuns;
    s.setItem(STORAGE_KEY, JSON.stringify(old));
    const migrated = new BrowserProgressStore(s).load();
    expect(migrated.collection).toEqual([]);
    expect(migrated.circuits).toEqual({});
    expect(migrated.gameRuns).toBe(0);
    expect(isProgress(null)).toBe(false);
    expect(isProgress("bad")).toBe(false);
  });
  it("rejects corrupted domain fields", () => {
    for (const mutate of [
      (p: Record<string, unknown>) => {
        p.xp = -1;
      },
      (p: Record<string, unknown>) => {
        p.profile = null;
      },
      (p: Record<string, unknown>) => {
        p.diagnostic = null;
      },
      (p: Record<string, unknown>) => {
        p.lessons = null;
      },
      (p: Record<string, unknown>) => {
        p.reviewQueue = [null];
      },
      (p: Record<string, unknown>) => {
        p.mentor = null;
      },
      (p: Record<string, unknown>) => {
        p.homework = null;
      },
    ]) {
      const p: Record<string, unknown> = { ...createProgress() };
      mutate(p);
      expect(isProgress(p)).toBe(false);
    }
  });
});

it("validates saved attempts, review, calendar and incomplete records", () => {
  const p = createProgress();
  p.reviewQueue = [
    { termOrLessonId: "lesson-1", errorCode: "wrong_pin", addedAt: "" },
  ];
  p.streak = { count: 1, lastActiveDate: "2026-10-16" };
  const storage = {
    getItem: () => JSON.stringify(p),
    setItem: () => {},
    removeItem: () => {},
  };
  expect(new BrowserProgressStore(storage).load().reviewQueue).toHaveLength(1);
  expect(isProgress({ ...p, lessons: {} })).toBe(false);
  expect(
    isProgress({ ...p, mentor: { ...p.mentor, selectedId: "missing" } }),
  ).toBe(false);
  expect(isProgress({ ...p, mentor: { ...p.mentor, selectedId: "oma" } })).toBe(
    false,
  );
  expect(
    isProgress({ ...p, diagnostic: { ...p.diagnostic, skillScores: {} } }),
  ).toBe(false);
  expect(isProgress({ ...p, circuits: null })).toBe(false);
  expect(isProgress({ ...p, circuits: { bad: {} } })).toBe(false);
  expect(
    isProgress({ ...p, circuits: { good: lessons[0].referenceNetlist } }),
  ).toBe(true);
  const corrupt = new BrowserProgressStore({
    getItem: () => "{bad",
    setItem: () => {
      throw Error("must not overwrite");
    },
    removeItem: () => {},
  });
  corrupt.load();
  corrupt.save(p);
  expect(corrupt.corrupt).toBe(true);
  let reads = 0;
  new BrowserProgressStore({
    getItem: () => (++reads === 1 ? "{bad" : null),
    setItem: () => {},
    removeItem: () => {},
  }).load();
});

it("validates persisted diagnostic answers", () => {
  for (const answer of [0, -1, 4, 1.5]) {
    const p = createProgress();
    p.diagnostic.answers = [answer];
    expect(isProgress(p)).toBe(answer === 0);
  }
});

it("rejects inconsistent diagnostic completion", () => {
  const p = createProgress();
  expect(
    isProgress({ ...p, diagnostic: { ...p.diagnostic, status: "done" } }),
  ).toBe(false);
  expect(
    isProgress({
      ...p,
      diagnostic: { ...p.diagnostic, answers: [0, 0, 0, 0, 0, 0, 0, 0] },
    }),
  ).toBe(false);
  expect(
    isProgress({
      ...p,
      diagnostic: {
        ...p.diagnostic,
        status: "done",
        answers: [0, 0, 0, 0, 0, 0, 0, 0],
      },
    }),
  ).toBe(true);
});
