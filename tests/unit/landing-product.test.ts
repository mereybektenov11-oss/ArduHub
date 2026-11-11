import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { spawnSync } from "node:child_process";
import { ru } from "@/content/ru";
import Pricing from "@/components/sections/Pricing";
import Hero from "@/components/sections/Hero";

describe("landing reflects the available product", () => {
  it("takes the main hero action directly to the cabinet", () => {
    const html = renderToStaticMarkup(
      createElement(Hero, { background: null }),
    );
    const cta = html.match(/<a [^>]*>/g) ?? [];
    expect(cta).toHaveLength(1);
    expect(cta[0]).toContain('href="/app/profile"');
    expect(cta[0]).toContain('data-slot="texture-button"');
    expect(cta[0]).toContain('data-variant="glass"');
    expect(cta[0]).toContain('data-size="lg"');
    expect(ru.header.account.href).toBe("/sign-in");
  });

  it("offers only the working free access and links it to the cabinet", () => {
    expect(ru.plans.map((plan) => plan.id)).toEqual(["free"]);
    const html = renderToStaticMarkup(createElement(Pricing));
    expect(html).toContain('href="/app/profile"');
    expect(html).not.toContain('href="#access"');
    expect(html).not.toMatch(/\bPro\b|Индивидуально|токен/iu);
  });

  it("collects interest in new lessons without promising an email was sent", () => {
    expect(ru.section.final).toMatch(/урок/iu);
    expect(ru.ui.success).not.toMatch(/письмо|отправлен/iu);
    expect(ru.ui.success).toBe("Адрес сохранён");
    expect(ru.ui.submit).toBe("Подписаться");
  });

  it.each(["Записаться на ранний доступ", "Раннего доступа"])(
    "existing copy checker rejects obsolete landing language: %s",
    (phrase) => {
      expect(
        spawnSync(process.execPath, [
          "scripts/lint-copy.mjs",
          "--check-text",
          phrase,
        ]).status,
      ).toBe(1);
    },
  );
});
