import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const base = process.env.PROFILE_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    resources = new Map(),
    pending = [];
  page.on("response", (res) => {
    if (!/\.js(?:\?|$)/.test(res.url())) return;
    pending.push(
      res
        .body()
        .then((body) => resources.set(res.url(), gzipSync(body).length))
        .catch(() => {}),
    );
  });
  const sketches = JSON.parse(
    await readFile("src/content/sketches.json", "utf8"),
  );
  await page.addInitScript((code) => {
    const now = new Date().toISOString();
    if (!localStorage.getItem("arduhub.projects.v1"))
      localStorage.setItem(
        "arduhub.projects.v1",
        JSON.stringify({
          version: 1,
          projects: [
            {
              id: "bundle",
              title: "Редактор",
              idea: "",
              createdAt: now,
              updatedAt: now,
              scene: {
                version: 1,
                board: "uno",
                components: [
                  {
                    id: "uno",
                    type: "uno",
                    x: 30,
                    y: 90,
                    rotation: 0,
                    attrs: {},
                  },
                ],
                wires: [],
              },
              code,
              thumbnailSvg: "",
            },
          ],
        }),
      );
  }, sketches[0].code);
  await page.goto(`${base}/app/projects/bundle`);
  await page.locator(".l2-palette wokwi-arduino-uno").waitFor();
  await page.getByRole("tab", { name: "Код", exact: true }).click();
  await page.locator(".cm-editor").waitFor();
  await page.waitForTimeout(1000);
  await Promise.all(pending);
  const bundle = {
    gzipBytes: [...resources.values()].reduce((a, b) => a + b, 0),
    limitBytes: 400 * 1024,
    files: Object.fromEntries(
      [...resources].map(([url, size]) => [new URL(url).pathname, size]),
    ),
  };
  await page.evaluate(
    ({ code }) => {
      const components = [
        { id: "uno", type: "uno", x: 30, y: 90, rotation: 0, attrs: {} },
        ...Array.from({ length: 59 }, (_, i) => ({
          id: `r${i}`,
          type: "resistor",
          x: 330 + (i % 4) * 65,
          y: 45 + Math.floor(i / 4) * 24,
          rotation: 0,
          attrs: { value: 220 },
        })),
      ];
      const scene = {
        version: 1,
        board: "uno",
        components,
        wires: Array.from({ length: 120 }, (_, i) => ({
          id: `w${i}`,
          from: { componentId: `r${i % 59}`, pin: "1" },
          to: { componentId: `r${(i + 1) % 59}`, pin: "2" },
          color: "#c58320",
          bends: [],
        })),
      };
      const now = new Date().toISOString();
      localStorage.setItem(
        "arduhub.projects.v1",
        JSON.stringify({
          version: 1,
          projects: [
            {
              id: "performance",
              title: "Нагрузочная сцена",
              idea: "Тест 60 деталей и 120 проводов",
              createdAt: now,
              updatedAt: now,
              scene,
              code,
              thumbnailSvg: "",
            },
          ],
        }),
      );
    },
    { code: sketches[0].code },
  );
  await page.goto(`${base}/app/projects/performance`);
  await page.locator('[data-component="r58"]').waitFor();
  await page.getByRole("button", { name: /^Запустить/ }).click();
  await page.getByText("Симуляция идёт", { exact: false }).waitFor();
  const perf = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const frames = [];
        let previous = performance.now(),
          start = previous;
        function frame(now) {
          frames.push(now - previous);
          previous = now;
          if (now - start < 3000) requestAnimationFrame(frame);
          else {
            const sorted = [...frames].sort((a, b) => a - b);
            resolve({
              durationMs: now - start,
              frames: frames.length,
              fps: (frames.length * 1000) / (now - start),
              p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
              maxFrameMs: Math.max(...frames),
              components: document.querySelectorAll("[data-component]").length,
              wires: document.querySelectorAll(".l2-wires>g").length,
              running: document.querySelector(".l2-run-status").textContent,
            });
          }
        }
        requestAnimationFrame(frame);
      }),
  );
  await page.getByRole("button", { name: /^Стоп/ }).click();
  await Promise.all(pending);
  bundle.workerIncludedGzipBytes = [...resources.values()].reduce(
    (a, b) => a + b,
    0,
  );
  await mkdir("reports/learning-tasks", { recursive: true });
  await writeFile(
    "reports/learning-tasks/performance.json",
    JSON.stringify({ bundle, perf }, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      bundleGzipBytes: bundle.gzipBytes,
      workerIncludedGzipBytes: bundle.workerIncludedGzipBytes,
      ...perf,
    }),
  );
  if (bundle.workerIncludedGzipBytes > bundle.limitBytes || perf.fps < 55)
    process.exitCode = 1;
} finally {
  await browser.close();
}
