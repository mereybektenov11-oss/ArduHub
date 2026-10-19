import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.PROFILE_URL || "http://127.0.0.1:3000";
await mkdir("reports/performance", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
  });
  await page.goto(baseUrl);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const client = await page.context().newCDPSession(page);
  await client.send("Tracing.start", {
    categories: "devtools.timeline,blink.user_timing,v8.execute",
    transferMode: "ReturnAsStream",
  });
  const result = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = [];
        const longTasks = [];
        const renderEvents = [];
        const sections = document.querySelectorAll("main#main > .section");
        const onRenderState = (event) =>
          renderEvents.push({
            section: event.currentTarget.id,
            skipped: event.skipped,
            time: performance.now(),
            scrollY: window.scrollY,
          });
        sections.forEach((section) =>
          section.addEventListener(
            "contentvisibilityautostatechange",
            onRenderState,
          ),
        );
        const observer = new PerformanceObserver((list) => {
          for (const task of list.getEntries())
            longTasks.push({
              start: task.startTime,
              duration: task.duration,
              scrollY: window.scrollY,
              section:
                document
                  .elementFromPoint(innerWidth / 2, innerHeight / 2)
                  ?.closest("section")?.id || "hero-or-stats",
            });
        });
        observer.observe({ type: "longtask", buffered: false });
        const start = performance.now();
        // Avoid synchronously relaying out the document in the scroll driver.
        const distance = document.documentElement.scrollHeight - innerHeight;
        let previous = start;
        function tick(now) {
          times.push(now - previous);
          previous = now;
          const progress = Math.min((now - start) / 12000, 1);
          window.scrollTo({
            top: progress * distance,
            behavior: "instant",
          });
          if (progress < 1) requestAnimationFrame(tick);
          else {
            observer.disconnect();
            sections.forEach((section) =>
              section.removeEventListener(
                "contentvisibilityautostatechange",
                onRenderState,
              ),
            );
            const sorted = [...times].sort((a, b) => a - b);
            resolve({
              durationMs: now - start,
              frames: times.length,
              averageFps: (times.length * 1000) / (now - start),
              p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
              maxFrameMs: Math.max(...times),
              longTasks,
              renderEvents,
              overflow: document.documentElement.scrollWidth > innerWidth,
            });
          }
        }
        requestAnimationFrame(tick);
      }),
  );
  const traceFinished = new Promise((resolve) =>
    client.once("Tracing.tracingComplete", resolve),
  );
  await client.send("Tracing.end");
  const { stream } = await traceFinished;
  const chunks = [];
  for (;;) {
    const chunk = await client.send("IO.read", { handle: stream });
    chunks.push(
      chunk.base64Encoded
        ? Buffer.from(chunk.data, "base64")
        : Buffer.from(chunk.data),
    );
    if (chunk.eof) break;
  }
  await client.send("IO.close", { handle: stream });
  await writeFile(
    "reports/performance/scroll-trace.json",
    Buffer.concat(chunks),
  );
  const report = {
    measuredAt: new Date().toISOString(),
    browser: browser.version(),
    viewport: "1440x900",
    mode: "Local headless Chrome, default CPU, 12-second scroll; not a hardware fleet benchmark",
    ...result,
  };
  await writeFile(
    "reports/performance/scroll-summary.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (
    result.averageFps < 55 ||
    result.longTasks.some((task) => task.duration > 50) ||
    result.overflow
  )
    process.exitCode = 1;
} finally {
  await browser.close();
}
