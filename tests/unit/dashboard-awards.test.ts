import { it, expect, vi } from "vitest";
import { queueAwards, flushAwards } from "@/domain/progress/awardQueue";
const event = { source: "lesson" as const, refId: "lesson-1", amount: 30 };
function storage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}
it("keeps offline awards and retries them without duplicates", async () => {
  const s = storage();
  queueAwards(s, "A", [event, event]);
  await expect(
    flushAwards(
      s,
      "A",
      () => "A",
      async () => {},
      vi.fn(async () => {
        throw Error("offline");
      }),
    ),
  ).rejects.toThrow();
  expect(JSON.parse(s.getItem("arduhub.pending-awards:A")!)).toHaveLength(1);
  const send = vi.fn(async () => new Response(null, { status: 409 }));
  await flushAwards(
    s,
    "A",
    () => "A",
    async () => {},
    send,
  );
  expect(send).toHaveBeenCalledTimes(1);
  expect(JSON.parse(s.getItem("arduhub.pending-awards:A")!)).toEqual([]);
});
it("never sends an old account award under another account session", async () => {
  const s = storage();
  queueAwards(s, "A", [event]);
  const send = vi.fn();
  await flushAwards(
    s,
    "A",
    () => "B",
    async () => {},
    send,
  );
  expect(send).not.toHaveBeenCalled();
  expect(JSON.parse(s.getItem("arduhub.pending-awards:A")!)).toHaveLength(1);
});
it("preserves a capped award for retry and flushes progress before awarding", async () => {
  const s = storage();
  queueAwards(s, "A", [event]);
  const order: string[] = [];
  await expect(
    flushAwards(
      s,
      "A",
      () => "A",
      async () => {
        order.push("progress");
      },
      async () => {
        order.push("award");
        return new Response(null, { status: 429 });
      },
    ),
  ).rejects.toThrow("daily_cap");
  expect(order).toEqual(["progress", "award"]);
  expect(JSON.parse(s.getItem("arduhub.pending-awards:A")!)).toHaveLength(1);
});
