import { readFile, writeFile } from "node:fs/promises";
import { createVideoResolver } from "../src/services/video/resolve.mjs";
const queries = JSON.parse(
  await readFile("content/lesson-video-queries.json", "utf8"),
);
const data = JSON.parse(await readFile("content/lesson-videos.json", "utf8"));
const resolver = createVideoResolver({
  key: process.env.YOUTUBE_API_KEY,
  initial: data,
});
let missing = 0;
for (const [id, config] of Object.entries(queries)) {
  try {
    data[id] = await resolver.resolve(id, config);
    console.log(`${id}: найдено, альтернатив: ${data[id].alternatives.length}`);
  } catch (error) {
    missing++;
    console.log(
      `${id}: ${error.message === "quota_guard" ? "суточный лимит" : "не подобрано (проверьте серверный ключ)"}`,
    );
  }
}
await writeFile(
  "content/lesson-videos.json",
  JSON.stringify(data, null, 2) + "\n",
);
console.log(
  `Сохранено: ${Object.keys(data).length}; не подобрано: ${missing}.`,
);
