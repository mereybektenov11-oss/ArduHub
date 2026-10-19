import { afterEach, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LearningStore } from "@/domain/projects/storage";
import { loadLearning, saveLearning } from "@/lib/supabase/learningSync";
import { emptyScene } from "@/domain/scene/scene";
afterEach(() => vi.unstubAllGlobals());
function storage() {
  const map = new Map<string, string>();
  const result = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
  vi.stubGlobal("localStorage", result);
  return result;
}
function fakeClient(
  remoteDrafts: unknown[] = [],
  remoteProjects: unknown[] = [],
) {
  const writes: { table: string; rows: unknown }[] = [];
  const deletes: unknown[] = [];
  const client = {
    from(table: string) {
      return {
        select() {
          return {
            eq: async () => ({
              data: table === "drafts" ? remoteDrafts : remoteProjects,
              error: null,
            }),
          };
        },
        upsert: async (rows: unknown) => {
          writes.push({ table, rows });
          return { error: null };
        },
        delete() {
          return {
            eq() {
              return {
                in: async (_key: string, ids: unknown) => {
                  deletes.push(ids);
                  return { error: null };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { writes, deletes, client };
}
it("keeps a newer pending draft and retries its upload", async () => {
  const cache = storage();
  cache.setItem("arduhub.pending-learning:account", "revision");
  const store = new LearningStore(cache);
  store.drafts = {
    "lesson-1": {
      scene: emptyScene(),
      code: "new",
      step: 0,
      steps: {
        video: false,
        theory: false,
        circuit: false,
        code: false,
        run: false,
      },
      updatedAt: "2026-10-17T12:00:00Z",
    },
  };
  const fake = fakeClient([
    {
      lesson_id: "lesson-1",
      scene: emptyScene(),
      code: "old",
      data: { step: 0, steps: {} },
      updated_at: "2026-10-16T12:00:00Z",
    },
  ]);
  await loadLearning(fake.client, "account", store);
  expect(store.drafts["lesson-1"].code).toBe("new");
  expect(fake.writes.some((w) => w.table === "drafts")).toBe(true);
  expect(cache.getItem("arduhub.pending-learning:account")).toBeNull();
});
it("sends queued project deletions under the account owner", async () => {
  const cache = storage();
  cache.setItem(
    "arduhub.deleted-projects:account",
    JSON.stringify(["project"]),
  );
  cache.setItem("arduhub.pending-learning:account", "revision");
  const fake = fakeClient();
  await saveLearning(fake.client, "account", new LearningStore(cache));
  expect(fake.deletes).toEqual([["project"]]);
  expect(cache.getItem("arduhub.deleted-projects:account")).toBeNull();
});
it("preserves the outbox when a request fails", async () => {
  const cache = storage();
  cache.setItem("arduhub.pending-learning:account", "revision");
  const store = new LearningStore(cache);
  store.drafts = {
    "lesson-1": {
      scene: emptyScene(),
      code: "new",
      step: 0,
      steps: {
        video: false,
        theory: false,
        circuit: false,
        code: false,
        run: false,
      },
    },
  };
  const client = {
    from: () => ({ upsert: async () => ({ error: Error("offline") }) }),
  } as unknown as SupabaseClient;
  await expect(saveLearning(client, "account", store)).rejects.toThrow(
    "offline",
  );
  expect(cache.getItem("arduhub.pending-learning:account")).toBe("revision");
});
