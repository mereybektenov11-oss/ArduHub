// Used both by the build-time resolver and the server route. Never imported by the browser.
export const durationSeconds = (value) => {
  const m = String(value).match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  return m
    ? Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)
    : 0;
};
export function scoreVideo(video, config) {
  const duration = durationSeconds(video.contentDetails?.duration);
  if (
    !video.status?.embeddable ||
    video.status?.privacyStatus !== "public" ||
    duration < (config.minDurationSec ?? 240) ||
    duration > (config.maxDurationSec ?? 1200)
  )
    return -Infinity;
  const text =
    `${video.snippet?.title} ${video.snippet?.description}`.toLowerCase();
  const words = config.query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return (
    words.filter((w) => text.includes(w)).length * 5 +
    Math.log10(1 + Number(video.statistics?.viewCount || 0)) +
    (config.preferredChannelIds?.includes(video.snippet?.channelId) ? 8 : 0) -
    (/shorts|реакци|обзор/i.test(text) ? 15 : 0)
  );
}
export function createVideoResolver({
  key = "",
  fetcher = fetch,
  now = () => new Date(),
  initial = {},
} = {}) {
  const cache = new Map(Object.entries(initial));
  const pending = new Map();
  let day = "",
    count = 0,
    blocked = false;
  async function api(path, params) {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
    for (const [k, v] of Object.entries({ ...params, key }))
      url.searchParams.set(k, String(v));
    const response = await fetcher(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) blocked = true;
      throw Error(blocked ? "quota_guard" : "not_found");
    }
    return response.json();
  }
  async function resolve(id, config) {
    const today = now().toISOString().slice(0, 10);
    if (day !== today) {
      day = today;
      count = 0;
      blocked = false;
    }
    const saved = cache.get(id);
    if (
      saved &&
      (!config.pinnedVideoId || saved.videoId === config.pinnedVideoId)
    )
      return saved;
    if (!key) {
      if (config.pinnedVideoId)
        return {
          videoId: config.pinnedVideoId,
          title: config.pinnedTitle || config.query,
          channel: config.pinnedChannel || "YouTube",
          durationSec: 0,
          resolvedAt: now().toISOString(),
          alternatives: [],
        };
      throw Error("not_found");
    }
    if (blocked || count >= 20) throw Error("quota_guard");
    count++;
    let ids = [];
    if (config.pinnedVideoId) ids = [config.pinnedVideoId];
    else {
      for (const query of [config.query, ...(config.altQueries || [])].slice(
        0,
        3,
      )) {
        const search = await api("search", {
          part: "snippet",
          q: query,
          type: "video",
          relevanceLanguage: "ru",
          videoEmbeddable: "true",
          safeSearch: "strict",
          videoDuration: "medium",
          maxResults: 15,
        });
        ids.push(
          ...(search.items || []).map((v) => v.id?.videoId).filter(Boolean),
        );
        if (ids.length >= 10) break;
      }
    }
    if (!ids.length) throw Error("not_found");
    const details = await api("videos", {
      part: "snippet,contentDetails,status,statistics",
      id: [...new Set(ids)].slice(0, 50).join(","),
    });
    const candidates = (details.items || [])
      .filter((v) => Number.isFinite(scoreVideo(v, config)))
      .sort((a, b) => scoreVideo(b, config) - scoreVideo(a, config))
      .map((v) => ({
        videoId: v.id,
        title: v.snippet.title,
        channel: v.snippet.channelTitle,
        durationSec: durationSeconds(v.contentDetails.duration),
      }));
    if (!candidates.length) throw Error("not_found");
    const result = {
      ...candidates[0],
      resolvedAt: now().toISOString(),
      alternatives: candidates.slice(1, 6),
    };
    cache.set(id, result);
    return result;
  }
  return {
    resolve(id, config) {
      if (!pending.has(id))
        pending.set(
          id,
          resolve(id, config).finally(() => pending.delete(id)),
        );
      return pending.get(id);
    },
  };
}
