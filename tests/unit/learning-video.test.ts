import { describe, expect, it, vi } from "vitest";
import {
  createVideoResolver,
  durationSeconds,
  scoreVideo,
} from "@/services/video/resolve.mjs";
const candidate = (id = "abcdefghijk", duration = "PT5M") => ({
  id,
  snippet: {
    title: "Arduino светодиод резистор",
    description: "урок",
    channelTitle: "Учебный канал",
    channelId: "channel",
  },
  contentDetails: { duration },
  status: { embeddable: true, privacyStatus: "public" },
  statistics: { viewCount: "1000" },
});
describe("video selection", () => {
  it("ranks topics, filters duration and reuses the selection", async () => {
    const fetcher = vi.fn(async (url: URL) =>
      Response.json({
        items: url.pathname.endsWith("/search")
          ? [
              { id: { videoId: "abcdefghijk" } },
              { id: { videoId: "12345678901" } },
            ]
          : [
              candidate(),
              candidate("12345678901"),
              candidate("short", "PT20S"),
            ],
      }),
    );
    const resolver = createVideoResolver({
      key: "test",
      fetcher: fetcher as unknown as typeof fetch,
    });
    const result = await resolver.resolve("lesson-1", {
      query: "Arduino светодиод",
    });
    expect(result.alternatives).toHaveLength(1);
    await resolver.resolve("lesson-1", { query: "Arduino светодиод" });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(durationSeconds("PT1H2M3S")).toBe(3723);
    expect(scoreVideo(candidate("short", "PT20S"), { query: "Arduino" })).toBe(
      -Infinity,
    );
  });
  it("returns pinned video without a key and blocks quota until tomorrow", async () => {
    await expect(
      createVideoResolver().resolve("missing", { query: "Arduino" }),
    ).rejects.toThrow("not_found");
    expect(
      (
        await createVideoResolver().resolve("pinned", {
          query: "Arduino",
          pinnedVideoId: "abcdefghijk",
        })
      ).videoId,
    ).toBe("abcdefghijk");
    let date = new Date("2026-10-17");
    const fetcher = vi.fn(async () => new Response("", { status: 403 }));
    const resolver = createVideoResolver({
      key: "test",
      fetcher,
      now: () => date,
    });
    await expect(resolver.resolve("a", { query: "Arduino" })).rejects.toThrow(
      "quota_guard",
    );
    await expect(resolver.resolve("b", { query: "Arduino" })).rejects.toThrow(
      "quota_guard",
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    date = new Date("2026-10-18");
    await expect(resolver.resolve("b", { query: "Arduino" })).rejects.toThrow(
      "quota_guard",
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
