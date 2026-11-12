import { it, expect, vi, afterEach } from "vitest";
import {
  queueGameAttempt,
  flushGameAttempts,
} from "@/services/achievements/gameQueue";
afterEach(() => vi.unstubAllGlobals());
it("retries the same evidence ID after a failure and keeps account ownership", async () => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
  });
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetcher);
  queueGameAttempt("learner", {
    attemptId: "stable-id",
    gameId: "blitz",
    questionIndex: 0,
    pair: ["13", "R1"],
  });
  await flushGameAttempts("learner");
  expect(fetcher).toHaveBeenCalledTimes(2);
  const [, first] = fetcher.mock.calls[0],
    [, retry] = fetcher.mock.calls[1];
  expect(retry.body).toBe(first.body);
  expect(retry.headers["X-ArduHub-User"]).toBe("learner");
  expect(data.get("arduhub.achievement-attempts.learner")).toBe("[]");
});
