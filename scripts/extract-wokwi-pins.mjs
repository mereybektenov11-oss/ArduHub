import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const tags = [
  "arduino-uno",
  "led",
  "rgb-led",
  "resistor",
  "pushbutton",
  "slide-switch",
  "potentiometer",
  "photoresistor-sensor",
  "buzzer",
  "servo",
  "lcd1602",
  "7segment",
  "hc-sr04",
  "dht22",
];
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage();
  await page.addScriptTag({
    content: await readFile(
      "node_modules/@wokwi/elements/dist/wokwi-elements.bundle.js",
      "utf8",
    ),
  });
  const data = await page.evaluate(async (tags) => {
    const result = {};
    for (const tag of tags) {
      const el = document.createElement(`wokwi-${tag}`);
      el.style.display = "inline-block";
      document.body.append(el);
      await el.updateComplete;
      await new Promise(requestAnimationFrame);
      const svg = [...el.shadowRoot.querySelectorAll("svg")].sort((a, b) => {
        const x = a.getBoundingClientRect(),
          y = b.getBoundingClientRect();
        return y.width * y.height - x.width * x.height;
      })[0];
      const box = svg.getBoundingClientRect();
      result[tag] = {
        width: box.width,
        height: box.height,
        pins: el.pinInfo.map(({ name, x, y }) => ({ name, x, y })),
      };
      el.remove();
    }
    return result;
  }, tags);
  await mkdir("src/domain/parts", { recursive: true });
  await writeFile(
    "src/domain/parts/wokwi-pins.json",
    JSON.stringify(data, null, 2) + "\n",
  );
  console.log(
    Object.fromEntries(
      Object.entries(data).map(([tag, d]) => [
        tag,
        { width: d.width, height: d.height, pins: d.pins.map((p) => p.name) },
      ]),
    ),
  );
} finally {
  await browser.close();
}
