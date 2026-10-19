import { writeFile, mkdir } from "node:fs/promises";
const url = process.env.APP_TEST_URL ?? "http://127.0.0.1:3100";
const start = performance.now();
const response = await fetch(url + "/api/mentor", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mentorId: "volt",
    lessonId: "lesson-1",
    mode: "lesson",
    message: "Почему светодиоду нужен резистор?",
    history: [],
  }),
});
let content = "",
  firstDeltaMs = null;
const reader = response.body.getReader(),
  decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });
  content += chunk;
  if (firstDeltaMs === null && content.includes("event: delta"))
    firstDeltaMs = Math.round(performance.now() - start);
}
const events = content
  .split("\n")
  .filter((l) => l.startsWith("data: "))
  .map((l) => JSON.parse(l.slice(6)));
const completion = events.find((e) => Object.hasOwn(e, "fallback"));
const videoResponse = await fetch(url + "/api/lesson-video?lessonId=lesson-1");
const video = await videoResponse.json();
const report = {
  checkedAt: new Date().toISOString(),
  groq: {
    status: response.status,
    firstDeltaMs,
    live: completion?.fallback === false,
    tokensUsed: completion?.tokensUsed,
    hasText:
      events
        .filter((e) => typeof e.text === "string")
        .map((e) => e.text)
        .join("").length > 20,
  },
  youtube: {
    status: videoResponse.status,
    cachedVideoFound: typeof video.videoId === "string",
  },
};
await mkdir("reports/dashboard", { recursive: true });
await writeFile(
  "reports/dashboard/live-services.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
if (!report.groq.live || !report.youtube.cachedVideoFound) process.exitCode = 1;
