import { describe, it, expect } from "vitest";

import { exampleScene } from "@arduhub/arduino-core/lessons/content";

import {
  LearningStore,
  importProject,
  isDraft,
  isProject,
  thumbnail,
  initialSteps,
} from "@/domain/projects/storage";
import { createCompileHandler } from "@/services/compile/handler";
import { explain } from "@/services/compile/explain";
import { codeIssue } from "@arduhub/arduino-core/lessons/codeChecks";

import sketches from "@arduhub/curriculum/sketches.json" with { type: "json" };
describe("projects and compiler", () => {
  it("saves, imports safely and enforces project count", () => {
    const store = new LearningStore(null);
    store.load();
    const now = new Date().toISOString(),
      p = {
        id: "p1",
        title: "Test",
        idea: "",
        createdAt: now,
        updatedAt: now,
        scene: exampleScene(),
        code: sketches[0].code,
        thumbnailSvg: thumbnail(exampleScene()),
      };
    expect(isProject(p)).toBe(true);
    store.projects = [];
    expect(store.add(p)).toBe(true);
    const imported = importProject(JSON.stringify({ version: 1, project: p }));
    expect(imported?.id).not.toBe(p.id);
    expect(importProject("{}")).toBeNull();
    expect(importProject("x".repeat(205000))).toBeNull();
    for (let i = 1; i < 20; i++)
      expect(store.add({ ...p, id: `p${i + 1}` })).toBe(true);
    expect(store.add({ ...p, id: "overflow" })).toBe(false);
    expect(store.replace({ ...p, title: "new" })).toBe(true);
    store.remove("p1");
    expect(store.projects.length).toBe(19);
    expect(store.unavailable).toBe(true);
  });
  it("rejects corrupt storage without overwriting it", () => {
    const values = new Map([["arduhub.projects.v1", "bad"]]);
    const store = new LearningStore({
      getItem: (k) => values.get(k) ?? null,
      setItem: (k, v) => {
        values.set(k, v);
      },
      removeItem: (k) => {
        values.delete(k);
      },
    });
    store.load();
    store.save();
    expect(store.corrupt).toBe(true);
    expect(values.get("arduhub.projects.v1")).toBe("bad");
    store.reset();
    expect(store.corrupt).toBe(false);
    expect(
      isDraft({
        scene: exampleScene(),
        code: "",
        step: 3,
        steps: initialSteps(),
      }),
    ).toBe(true);
  });
  it("returns real firmware only for exact trusted cached code, rejects oversized payload, rate limits and handles unavailable compiler", async () => {
    const handler = createCompileHandler();
    const req = (body: unknown) =>
      new Request("http://localhost/api/compile", {
        method: "POST",
        body: JSON.stringify(body),
      });
    expect(
      (await handler(req({ code: sketches[0].code, board: "uno" }))).status,
    ).toBe(200);
    expect(
      (await handler(req({ code: "void loop(){}", board: "uno" }))).status,
    ).toBe(503);
    expect(
      (await handler(req({ code: "x".repeat(16385), board: "uno" }))).status,
    ).toBe(413);
    expect((await handler(req({ code: "x", board: "mega" }))).status).toBe(400);
    for (let i = 0; i < 6; i++) await handler(req({}));
    expect((await handler(req({}))).status).toBe(429);
  });
  it("explains compiler diagnostics and checks code size/blanks", () => {
    for (const msg of [
      "expected ';'",
      "x was not declared",
      "digitalwrite was not declared",
      "expected '}' at end of input",
      "expected '(' before",
      "forbidden header",
      "other",
    ])
      expect(explain(msg).length).toBeGreaterThan(20);
    expect(codeIssue("___")).toBeTruthy();
    expect(codeIssue("x".repeat(16385))).toBeTruthy();
    expect(codeIssue("void loop(){}")).toBeNull();
  });
});
