import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MentorMessage from "@/components/mentor/MentorMessage";
import { cleanMentorText, migrateMentorHistory } from "@/lib/mentorHistory";

describe("H-2 mentor history", () => {
  it("migrates legacy arrays and preserves real questions around nested scene JSON", () => {
    const old = [
      { role: "context", text: "secret" },
      {
        role: "user",
        text: 'Почему не горит?\nНаставник видит: урок 1\n{"version":1,"components":[{"id":"led","x":"}"}],"wires":[]}\nПомоги.',
      },
    ];
    const result = migrateMentorHistory(old);
    expect(result.version).toBe(2);
    expect(result.messages).toEqual([
      { role: "user", text: "Почему не горит?\n\nПомоги." },
    ]);
    expect(migrateMentorHistory(result)).toEqual(result);
  });
  it("hides incomplete streamed JSON too", () => {
    expect(cleanMentorText('Ответ\n{"version":1,"components":[')).toBe("Ответ");
  });
});
describe("H-2 safe mentor rendering", () => {
  it("preserves Arduino includes and loop comparisons in copied code", () => {
    const code =
      "#include <Arduino.h>\nvoid loop() {\n  for (int i = 0; i < 10; i++) {\n    if (i > 2) digitalWrite(13, HIGH);\n  }\n}";
    const text = `\x60\x60\x60cpp\n${code}\n\x60\x60\x60`;
    expect(cleanMentorText(text)).toBe(text);
    const html = renderToStaticMarkup(createElement(MentorMessage, { text }));
    expect(html).toContain("&lt;Arduino.h&gt;");
    expect(html).toContain("&lt;");
    expect(html).toContain("&gt;");
    expect(html).toContain("digitalWrite");
  });
  it("renders supported formatting and copyable code without raw markup", () => {
    const html = renderToStaticMarkup(
      createElement(MentorMessage, {
        text: '# Подсказка\n**Проверь** *контакт* `HIGH`\n- Питание\n- Земля\n```cpp\nint led = 13;\n```\n{"version":1,"wires":[]}',
      }),
    );
    expect(html).toContain("<strong>Проверь</strong>");
    expect(html).toContain("<em>контакт</em>");
    expect(html).toContain("<ul>");
    expect(html).toContain("Копировать");
    expect(html).not.toMatch(/\*\*|```|# Подсказка|&quot;version&quot;/);
  });
  it("never renders model HTML or table delimiters", () => {
    const html = renderToStaticMarkup(
      createElement(MentorMessage, {
        text: "<img src=x onerror=alert(1)>\n| Контакт | Пин |\n| --- | --- |\n| Земля | GND |",
      }),
    );
    expect(html).not.toMatch(/<img|onerror|\|/);
    expect(html).toContain("GND");
  });
});
