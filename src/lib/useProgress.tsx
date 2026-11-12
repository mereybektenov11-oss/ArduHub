"use client";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Progress } from "@/domain/types";
import { createProgress } from "@/domain/seed";
import { BrowserProgressStore } from "@/domain/progress/storage";
import { SupabaseProgressStore } from "@/domain/progress/supabaseStore";
import { browserSupabase } from "@/lib/supabase/client";
import {
  queueAwards,
  importAwardEvents,
  flushAwards,
  type AwardEvent,
} from "@/domain/progress/awardQueue";
import { xpLevel, syncLessonStates } from "@/domain/progress/xp";
import { mergeProgress } from "@/domain/progress/merge";
import { dashboardRu as d } from "@/content/dashboard.ru";
import { Modal } from "@/components/cabinet/ui";
import { settleStreak } from "@/domain/progress/streak";
import { motionSoundRu } from "@/content/motion-sound.ru";
import {
  recordDaily,
  dailyState,
  missionsDone,
  claimDaily,
} from "@/domain/missions";
import { lessons } from "@/domain/seed";
import { usePathname } from "next/navigation";
import LessonShell from "@/components/lesson/LessonShell";
import LessonSkeleton from "@/components/lesson/LessonSkeleton";
import { lessonFlowRu } from "@/content/ru";
import { motionTokens } from "@/lib/motion";
import { configureSfx, playSfx, unlockSfx } from "@/lib/sfx";
import { flushGameAttempts } from "@/services/achievements/gameQueue";
import {
  unlockAchievements,
  achievementState,
  claimAchievement,
  type AchievementId,
} from "@/domain/achievements";
type Context = {
  progress: Progress;
  update: (fn: (p: Progress) => Progress) => void;
  ready: boolean;
  unavailable: boolean;
  offline: boolean;
  sessionExpired: boolean;
  corrupt: boolean;
  reset: () => void;
  toast: string;
  notify: (text: string) => void;
  levelUp: number | null;
  dismissLevelUp: () => void;
  refreshAccount: () => Promise<void>;
  claimMissions: () => Promise<boolean>;
  collectSticker: (id: AchievementId) => Promise<boolean>;
};
const ProgressContext = createContext<Context | null>(null);
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(createProgress);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    configureSfx({
      enabled: progress.settings?.sounds !== false,
      volume: progress.settings?.soundVolume ?? 0.5,
    });
  }, [progress.settings?.sounds, progress.settings?.soundVolume]);
  useEffect(() => {
    const activate = (event: Event) => {
      if (event.isTrusted) unlockSfx();
    };
    const feedback = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest(
        "button,a,summary,input[type=checkbox],input[type=radio]",
      );
      if (
        control?.closest(".cabinet") &&
        !control.matches(":disabled,[aria-disabled=true]")
      )
        playSfx("tap");
    };
    document.addEventListener("pointerdown", activate, true);
    document.addEventListener("keydown", activate, true);
    document.addEventListener("click", feedback);
    return () => {
      document.removeEventListener("pointerdown", activate, true);
      document.removeEventListener("keydown", activate, true);
      document.removeEventListener("click", feedback);
    };
  }, []);
  const [loadError, setLoadError] = useState(false);
  const path = usePathname();
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(
      () => setLoadError(true),
      motionTokens.lessonFlow.timeout,
    );
    return () => clearTimeout(timer);
  }, [ready]);
  const [unavailable, setUnavailable] = useState(false);
  const [corrupt, setCorrupt] = useState(false);
  const [toast, setToast] = useState("");
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const store = useRef<BrowserProgressStore | null>(null);
  const current = useRef(progress);
  const [pendingGuest, setPendingGuest] = useState<Progress | null>(null);
  const [offline, setOffline] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const awards = useRef(Promise.resolve());
  const missionPending = useRef(false);
  const stickersPending = useRef(new Set<AchievementId>());
  async function collectSticker(id: AchievementId): Promise<boolean> {
    if (stickersPending.current.has(id)) return false;
    const before = current.current,
      state = achievementState(before);
    if (state.claimed.includes(id)) return true;
    if (!state.unlocked.includes(id)) return false;
    stickersPending.current.add(id);
    let newlyClaimed = true;
    try {
      const userId = before.account?.userId;
      if (userId) {
        const task = awards.current
          .catch(() => {})
          .then(async () => {
            if (id === "speed" || id === "explorer")
              await flushGameAttempts(userId);
            await flushAwards(
              localStorage,
              userId,
              () => current.current.account?.userId,
              async () => {
                if (store.current instanceof SupabaseProgressStore)
                  await store.current.flush();
              },
            );
            if (current.current.account?.userId !== userId) throw Error();
            const response = await fetch("/api/achievements/claim", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id }),
            });
            if (!response.ok || current.current.account?.userId !== userId)
              throw Error();
            const result = await response.json();
            newlyClaimed = result.claimed === true;
            await refreshAccount();
            update((p) => ({
              ...p,
              achievements: {
                ...achievementState(p),
                claimed: [...new Set([...achievementState(p).claimed, id])],
              },
            }));
          });
        awards.current = task;
        await task;
      } else update((p) => claimAchievement(p, id));
      if (newlyClaimed) playSfx("level_up");
      return true;
    } catch {
      return false;
    } finally {
      stickersPending.current.delete(id);
    }
  }
  async function claimMissions() {
    const before = current.current;
    if (
      missionPending.current ||
      dailyState(before).claimed ||
      !missionsDone(before)
    )
      return false;
    missionPending.current = true;
    try {
      const userId = before.account?.userId;
      if (userId) {
        const day = dailyState(before).day;
        const task = awards.current
          .catch(() => {})
          .then(async () => {
            await flushAwards(
              localStorage,
              userId,
              () => current.current.account?.userId,
              async () => {
                if (store.current instanceof SupabaseProgressStore)
                  await store.current.flush();
              },
            );
            if (current.current.account?.userId !== userId) throw Error();
            const response = await fetch("/api/award", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                source: "mission",
                refId: day,
                amount: 5,
              }),
            });
            if (!response.ok && response.status !== 409) throw Error();
            await refreshAccount();
            update((x) => ({
              ...x,
              daily: { ...dailyState(x), claimed: true },
            }));
          });
        awards.current = task;
        await task;
      } else update((x) => claimDaily(x));
      return true;
    } catch {
      setOffline(true);
      return false;
    } finally {
      missionPending.current = false;
    }
  }
  const refreshAccount = useCallback(async () => {
    if (store.current instanceof SupabaseProgressStore) {
      const selectedStore = store.current;
      const userId = current.current.account?.userId;
      const loaded = await selectedStore.hydrate();
      if (
        store.current !== selectedStore ||
        current.current.account?.userId !== userId
      )
        return;
      const previous = achievementState(current.current);
      const received = achievementState(loaded);
      const next = unlockAchievements({
        ...current.current,
        achievements: {
          unlocked: [...new Set([...previous.unlocked, ...received.unlocked])],
          notified: [...new Set([...previous.notified, ...received.notified])],
          claimed: received.claimed,
        },
        sparks: loaded.sparks,
        xp: loaded.xp,
        mentor: loaded.mentor,
        inventory: loaded.inventory,
        boosts: loaded.boosts,
        account: loaded.account,
        profile: {
          ...current.current.profile,
          name: loaded.profile.name,
          level: xpLevel(loaded.xp),
        },
      });
      current.current = next;
      selectedStore.save(next);
      setProgress(next);
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      let storage: Storage | null = null;
      try {
        storage = window.localStorage;
      } catch {}
      const local = new BrowserProgressStore(storage);
      const guest = local.load();
      let selected: BrowserProgressStore = local;
      let loaded = guest;
      try {
        const client = browserSupabase();
        if (client) {
          const { data, error } = await client.auth.getUser();
          if (error && error.name === "AuthRetryableFetchError")
            setOffline(true);
          if (data.user) {
            const remote = new SupabaseProgressStore(
              client,
              data.user.id,
              setOffline,
            );
            selected = remote;
            try {
              loaded = await remote.hydrate();
            } catch {
              setOffline(true);
            }
            // A verified account keeps its registration name even when profile
            // hydration is offline; never reopen guest name onboarding for it.
            if (loaded.account?.userId !== data.user.id) {
              const registeredName = data.user.user_metadata?.display_name;
              loaded = {
                ...loaded,
                profile: {
                  ...loaded.profile,
                  name:
                    typeof registeredName === "string" && registeredName.trim()
                      ? registeredName.trim()
                      : loaded.profile.name,
                },
                account: {
                  ...loaded.account,
                  userId: data.user.id,
                  role: loaded.account?.role ?? "student",
                  timezone:
                    loaded.account?.timezone ??
                    Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
              };
            }
            localStorage.setItem("arduhub.active-user", data.user.id);
            if (
              !sessionStorage.getItem("arduhub.import:" + data.user.id) &&
              (Object.values(guest.lessons).some((l) => l.status === "done") ||
                (storage?.getItem("arduhub.drafts.v1") ?? "").includes(
                  "lesson-",
                ) ||
                (storage?.getItem("arduhub.projects.v1") ?? "").includes(
                  "createdAt",
                ))
            )
              setPendingGuest(guest);
          } else if (error && storage?.getItem("arduhub.active-user")) {
            const id = storage.getItem("arduhub.active-user")!;
            const remote = new SupabaseProgressStore(client, id, setOffline);
            selected = remote;
            loaded = remote.load();
            setOffline(true);
          } else localStorage.removeItem("arduhub.active-user");
        } else storage?.removeItem("arduhub.active-user");
      } catch {
        setOffline(true);
      }
      if (cancelled) return;
      const settled = settleStreak(loaded);
      loaded = settled.progress;
      const streakEvent =
        settled.event ??
        (selected instanceof SupabaseProgressStore && selected.streakWasFrozen
          ? "frozen"
          : null);
      if (streakEvent) {
        setToast(
          streakEvent === "frozen"
            ? motionSoundRu.streakSaved
            : motionSoundRu.streakLost,
        );
        try {
          sessionStorage.setItem("arduhub.streak.event", streakEvent);
        } catch {}
      }
      store.current = selected;
      loaded = unlockAchievements(syncLessonStates(loaded));
      current.current = loaded;
      selected.save(loaded);
      setProgress(loaded);
      setUnavailable(selected.unavailable);
      setCorrupt(selected.corrupt);
      setReady(true);
    }
    void load();
    return () => {
      cancelled = true;
      if (store.current instanceof SupabaseProgressStore)
        store.current.dispose();
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    function retry() {
      const id = current.current.account?.userId;
      if (!id) return;
      awards.current = awards.current
        .then(async () => {
          await flushAwards(
            localStorage,
            id,
            () => current.current.account?.userId,
            async () => {
              if (store.current instanceof SupabaseProgressStore)
                await store.current.flush();
            },
          );
          await refreshAccount();
        })
        .catch(() => setOffline(true));
    }
    retry();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [ready, refreshAccount]);
  useEffect(() => {
    const client = browserSupabase();
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && current.current.account?.userId)
        setSessionExpired(true);
      if (event === "SIGNED_IN") setSessionExpired(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);
  function update(fn: (p: Progress) => Progress) {
    let next = unlockAchievements(
      recordDaily(current.current, syncLessonStates(fn(current.current))),
    );
    const before = current.current;
    if (next.streak.count > before.streak.count) {
      playSfx("streak_ignite");
      setToast(motionSoundRu.streak(next.streak.count));
    }
    if (next.xp > before.xp || next.sparks > before.sparks)
      playSfx("spark_gain");
    const openedLevel = lessons.find(
      (l) =>
        l.levelId > 0 &&
        before.lessons[l.id]?.status === "locked" &&
        next.lessons[l.id]?.status !== "locked" &&
        !lessons.some(
          (other) =>
            other.levelId === l.levelId &&
            before.lessons[other.id]?.status !== "locked",
        ),
    );
    if (openedLevel)
      try {
        sessionStorage.setItem(
          "arduhub.map.unlock",
          String(openedLevel.levelId),
        );
      } catch {}
    if (before.account?.userId) {
      const completed = lessons.filter(
        (l) =>
          !before.lessons[l.id]?.rewarded &&
          next.lessons[l.id]?.rewarded === true &&
          next.lessons[l.id]?.status === "done",
      );
      const gameDelta =
        next.gameRuns > before.gameRuns ? Math.max(0, next.xp - before.xp) : 0;
      const quizEvents: AwardEvent[] = lessons.flatMap((lesson) =>
        (next.lessons[lesson.id]?.quiz?.awarded ?? [])
          .filter(
            (question) =>
              !(before.lessons[lesson.id]?.quiz?.awarded ?? []).includes(
                question,
              ),
          )
          .map((question) => ({
            source: "lesson_quiz",
            refId: `${lesson.id}:${question}`,
            amount: 1,
          })),
      );
      next = {
        ...next,
        sparks: before.sparks,
        xp: before.xp,
        mentor: {
          ...next.mentor,
          tokens: before.mentor.tokens,
          unlockedIds: before.mentor.unlockedIds,
        },
        inventory: before.inventory,
      };
      if (completed.length || gameDelta || quizEvents.length) {
        const id = before.account.userId;
        const events: AwardEvent[] = [
          ...quizEvents,
          ...completed.map((l) => ({
            source: next.lessons[l.id]?.completionSource ?? "lesson",
            refId: l.id,
            amount:
              next.lessons[l.id]?.completionSource === "lesson_fallback"
                ? l.xp / 2
                : l.xp,
          })),
          ...(gameDelta
            ? [
                {
                  source: "game" as const,
                  refId: "run:" + next.gameRuns,
                  amount: Math.min(gameDelta, 100),
                },
              ]
            : []),
        ];
        queueAwards(localStorage, id, events);
        awards.current = awards.current
          .then(async () => {
            await flushAwards(
              localStorage,
              id,
              () => current.current.account?.userId,
              async () => {
                if (store.current instanceof SupabaseProgressStore)
                  await store.current.flush();
              },
            );
            await refreshAccount();
          })
          .catch(() => setOffline(true));
      }
    }
    next = syncLessonStates(next);
    if (
      next.profile.level > current.current.profile.level &&
      next.xp > current.current.xp
    ) {
      setLevelUp(next.profile.level);
      playSfx("level_up");
    }
    current.current = next;
    store.current?.save(next);
    setProgress(next);
    setUnavailable(Boolean(store.current?.unavailable));
  }
  return (
    <ProgressContext.Provider
      value={{
        progress,
        update,
        ready,
        unavailable,
        offline,
        sessionExpired,
        corrupt,
        reset: () => {
          const p = store.current!.reset();
          current.current = p;
          setProgress(p);
          setCorrupt(false);
        },
        toast,
        notify: (text) => setToast(text),
        levelUp,
        dismissLevelUp: () => setLevelUp(null),
        refreshAccount,
        claimMissions,
        collectSticker,
      }}
    >
      {ready ? (
        children
      ) : path.startsWith("/app/lesson/") ? (
        <div className="cabinet dash-shell dash-focus">
          <main id="cab-main">
            <LessonShell
              loading={!loadError}
              title={lessons.find((l) => path.endsWith(l.id))?.title}
            >
              {loadError ? (
                <div className="flow-load-error" role="alert">
                  <h1>{lessonFlowRu.unavailable}</h1>
                  <button className="cab-btn" onClick={() => location.reload()}>
                    {lessonFlowRu.retry}
                  </button>
                </div>
              ) : (
                <LessonSkeleton />
              )}
            </LessonShell>
          </main>
        </div>
      ) : (
        <div className="cabinet" aria-busy="true">
          ArduHub…
        </div>
      )}
      {pendingGuest && (
        <div className="cabinet">
          <Modal title={d.importTitle} onClose={() => setPendingGuest(null)}>
            <p>{d.importNote}</p>
            <button
              className="cab-btn"
              onClick={async () => {
                const next = mergeProgress(pendingGuest, current.current);
                current.current = next;
                store.current?.save(next);
                setProgress(next);
                if (next.account?.userId) {
                  const accountId = next.account.userId;
                  queueAwards(localStorage, accountId, importAwardEvents(next));
                  sessionStorage.setItem(
                    "arduhub.import:" + next.account.userId,
                    "1",
                  );
                  try {
                    const client = browserSupabase();
                    if (client) {
                      const [
                        { LearningStore },
                        { loadLearning },
                        { scopedStorage },
                      ] = await Promise.all([
                        import("@/domain/projects/storage"),
                        import("@/lib/supabase/learningSync"),
                        import("@/domain/progress/supabaseStore"),
                      ]);
                      const cache = new LearningStore(
                        scopedStorage(localStorage, next.account.userId),
                      );
                      cache.load();
                      await loadLearning(
                        client,
                        next.account.userId,
                        cache,
                        true,
                      );
                      window.dispatchEvent(new Event("arduhub:import"));
                    }
                    await flushAwards(
                      localStorage,
                      accountId,
                      () => current.current.account?.userId,
                      async () => {
                        if (store.current instanceof SupabaseProgressStore)
                          await store.current.flush();
                      },
                    );
                    await refreshAccount();
                  } catch {
                    setOffline(true);
                  }
                }
                setPendingGuest(null);
              }}
            >
              {d.importYes}
            </button>
            <button
              className="cab-btn cab-btn-secondary"
              onClick={() => {
                if (current.current.account?.userId)
                  sessionStorage.setItem(
                    "arduhub.import:" + current.current.account.userId,
                    "1",
                  );
                setPendingGuest(null);
              }}
            >
              {d.importNo}
            </button>
          </Modal>
        </div>
      )}
    </ProgressContext.Provider>
  );
}
export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw Error("Missing ProgressProvider");
  return context;
}
