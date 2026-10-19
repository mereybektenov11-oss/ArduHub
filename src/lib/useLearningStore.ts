"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { scopedStorage } from "@/domain/progress/supabaseStore";
import { browserSupabase } from "@/lib/supabase/client";
import { loadLearning, saveLearning } from "@/lib/supabase/learningSync";
import { LearningStore } from "@/domain/projects/storage";
export function useLearningStore() {
  const store = useRef<LearningStore | null>(null),
    [value, setValue] = useState<LearningStore | null>(null),
    [, render] = useState(0);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      let storage: Storage | null = null;
      try {
        storage = window.localStorage;
      } catch {}
      let userId: string | undefined;
      try {
        userId = storage?.getItem("arduhub.active-user") ?? undefined;
      } catch {}
      const next = new LearningStore(
        storage && userId ? scopedStorage(storage, userId) : storage,
      );
      next.load();
      store.current = next;
      const client = browserSupabase();
      if (client && userId) {
        void loadLearning(client, userId, next)
          .then(() => {
            setValue(next);
            render((n) => n + 1);
          })
          .catch(() => {
            next.unavailable = true;
            setValue(next);
          });
      } else setValue(next);
    });
    const importGuest = () => {
      store.current?.load();
      render((n) => n + 1);
    };
    const retryLearning = () => {
      try {
        const userId = localStorage.getItem("arduhub.active-user"),
          client = browserSupabase();
        if (
          client &&
          userId &&
          store.current &&
          localStorage.getItem("arduhub.pending-learning:" + userId)
        )
          void saveLearning(client, userId, store.current)
            .then(() => {
              if (store.current) store.current.unavailable = false;
              render((n) => n + 1);
            })
            .catch(() => {});
      } catch {}
    };
    window.addEventListener("online", retryLearning);
    window.addEventListener("arduhub:import", importGuest);
    return () => {
      cancelAnimationFrame(frame);
      try {
        if (syncTimer.current) {
          clearTimeout(syncTimer.current);
          const client = browserSupabase(),
            userId = localStorage.getItem("arduhub.active-user");
          if (client && userId && store.current)
            void saveLearning(client, userId, store.current).catch(() => {});
        }
      } catch {}
      window.removeEventListener("online", retryLearning);
      window.removeEventListener("arduhub:import", importGuest);
    };
  }, []);
  const mutate = useCallback((fn: (s: LearningStore) => void) => {
    if (store.current) {
      const before = store.current.projects.map((p) => p.id);
      fn(store.current);
      const removed = before.filter(
        (id) => !store.current!.projects.some((p) => p.id === id),
      );
      render((n) => n + 1);
      clearTimeout(syncTimer.current);
      try {
        const userId = localStorage.getItem("arduhub.active-user"),
          client = browserSupabase();
        if (client && userId) {
          localStorage.setItem(
            "arduhub.pending-learning:" + userId,
            crypto.randomUUID(),
          );
          if (removed.length) {
            const old = JSON.parse(
              localStorage.getItem("arduhub.deleted-projects:" + userId) ||
                "[]",
            );
            localStorage.setItem(
              "arduhub.deleted-projects:" + userId,
              JSON.stringify([...new Set([...old, ...removed])]),
            );
          }
          syncTimer.current = setTimeout(
            () =>
              void saveLearning(client, userId, store.current!).catch(() => {
                if (store.current) store.current.unavailable = true;
              }),
            1500,
          );
        }
      } catch {
        store.current.unavailable = true;
        render((n) => n + 1);
      }
    }
  }, []);
  return { store: value, mutate };
}
