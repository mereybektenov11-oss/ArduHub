import { expect, it, vi } from "vitest";
import { prefetchLesson } from "@/lib/useLessonData";
it("deduplicates parallel and subsequent lesson requests", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(Response.json({ id: "lesson-prefetch" }));
  vi.stubGlobal("fetch", fetcher);
  try {
    const first = prefetchLesson("lesson-prefetch");
    expect(prefetchLesson("lesson-prefetch")).toBe(first);
    await first;
    await prefetchLesson("lesson-prefetch");
    expect(fetcher).toHaveBeenCalledTimes(1);
  } finally {
    vi.unstubAllGlobals();
  }
});
