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
  flushAwards,
  type AwardEvent,
} from "@/domain/progress/awardQueue";
import { xpLevel, syncLessonStates } from "@/domain/progress/xp";
import { mergeProgress } from "@/domain/progress/merge";
import { dashboardRu as d } from "@/content/dashboard.ru";
import { Modal } from "@/components/cabinet/ui";
import { freezeStreak } from "@/domain/progress/streak";
import { recordDaily } from "@/domain/missions";
import { lessons } from "@/domain/seed";
import { usePathname } from "next/navigation";
import LessonShell from "@/components/lesson/LessonShell";
import LessonSkeleton from "@/components/lesson/LessonSkeleton";
import { lessonFlowRu } from "@/content/ru";
import { motionTokens } from "@/lib/motion";
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
};
const ProgressContext = createContext<Context | null>(null);
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(createProgress);
  const [ready, setReady] = useState(false);
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
  const refreshAccount = useCallback(async () => {
    if (store.current instanceof SupabaseProgressStore) {
      const loaded = await store.current.hydrate();
      const next = {
        ...current.current,
        sparks: loaded.sparks,
        xp: loaded.xp,
        mentor: loaded.mentor,
        inventory: loaded.inventory,
        boosts: loaded.boosts,
        account: loaded.account,
        profile: {
          ...current.current.profile,
          name: loaded.profile.name,
          level: Math.max(current.current.profile.level, loaded.profile.level),
        },
      };
      current.current = next;
      store.current.save(next);
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
      let loaded = freezeStreak(guest);
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
            loaded = await remote.hydrate();
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
      store.current = selected;
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
    let next = recordDaily(current.current, fn(current.current));
    const before = current.current;
    if (before.account?.userId) {
      const completed = lessons.filter(
        (l) =>
          before.lessons[l.id]?.status !== "done" &&
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
            source: "lesson" as const,
            refId: l.id,
            amount: l.xp,
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
    if (!before.account?.userId && next.xp > before.xp)
      next = syncLessonStates({
        ...next,
        profile: {
          ...next.profile,
          level: Math.max(next.profile.level, xpLevel(next.xp)),
        },
      });
    if (
      next.profile.level > current.current.profile.level &&
      next.xp > current.current.xp
    )
      setLevelUp(next.profile.level);
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
                  queueAwards(
                    localStorage,
                    accountId,
                    lessons.flatMap((lesson) =>
                      (next.lessons[lesson.id]?.quiz?.awarded ?? []).map(
                        (question) => ({
                          source: "lesson_quiz" as const,
                          refId: `${lesson.id}:${question}`,
                          amount: 1,
                        }),
                      ),
                    ),
                  );
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
