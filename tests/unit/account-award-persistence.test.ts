import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseProgressStore } from "@/domain/progress/supabaseStore";
import { flushAwards, queueAwards } from "@/domain/progress/awardQueue";

afterEach(() => vi.unstubAllGlobals());

describe("account award persistence ordering", () => {
  it("keeps pending receipt and never posts award until the real store persists evidence, then retries once", async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    vi.stubGlobal("localStorage", storage);
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ error: new Error("save failed") })
      .mockResolvedValue({ error: null });
    const connection = vi.fn();
    const store = new SupabaseProgressStore(
      { rpc } as unknown as SupabaseClient,
      "A",
      connection,
    );
    const event = {
      source: "lesson_fallback" as const,
      refId: "lesson-1",
      amount: 15,
    };
    queueAwards(storage, "A", [event]);
    const network = vi.fn<typeof fetch>(
      async () => new Response(null, { status: 200 }),
    );
    try {
      await expect(
        flushAwards(
          storage,
          "A",
          () => "A",
          () => store.flush(),
          network,
        ),
      ).rejects.toThrow("save failed");
      expect(network).not.toHaveBeenCalled();
      expect(store.offline).toBe(true);
      expect(JSON.parse(storage.getItem("arduhub.pending-awards:A")!)).toEqual([
        event,
      ]);
      await flushAwards(
        storage,
        "A",
        () => "A",
        () => store.flush(),
        network,
      );
      expect(store.offline).toBe(false);
      expect(network).toHaveBeenCalledTimes(1);
      expect(JSON.parse(network.mock.calls[0][1]?.body as string)).toEqual(
        event,
      );
      expect(rpc).toHaveBeenCalledTimes(2);
      expect(JSON.parse(storage.getItem("arduhub.pending-awards:A")!)).toEqual(
        [],
      );
    } finally {
      store.dispose();
    }
  });
});
