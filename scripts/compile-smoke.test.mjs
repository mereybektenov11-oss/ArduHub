import { test } from "node:test";
import assert from "node:assert/strict";
import { smoke, compileEndpoint } from "./compile-smoke.mjs";

test("smoke checks remote health, HEX, exact syntax line, invalid secret and cache", async () => {
  const calls = [];
  const responses = [
    Response.json({ ok: true }),
    Response.json({ hex: ":00000001FF" }),
    Response.json(
      { error: "compile_error", diagnostics: [{ line: 3 }] },
      { status: 400 },
    ),
    Response.json({ error: "unauthorized" }, { status: 401 }),
    Response.json({ hex: ":00000001FF" }),
  ];
  const result = await smoke(
    "http://127.0.0.1:8081",
    "private",
    async (...args) => {
      calls.push(args);
      return responses.shift();
    },
  );
  assert.equal(result.checks.length, 5);
  assert.equal(calls[0][0].pathname, "/health");
  assert.equal(calls[3][1].headers.Authorization, "Bearer private-incorrect");
});
test("rejects wrong syntax line and does not mistake any 400 for a compiler result", async () => {
  const responses = [
    Response.json({ ok: true }),
    Response.json({ hex: ":00000001FF" }),
    Response.json(
      { error: "compile_error", diagnostics: [{ line: 1 }] },
      { status: 400 },
    ),
  ];
  await assert.rejects(
    smoke("http://localhost:8081/compile", "private", async () =>
      responses.shift(),
    ),
    /expected line 3/,
  );
});
test("accepts service and compile URL but rejects credential-bearing URL", () => {
  assert.equal(compileEndpoint("https://host/compile").pathname, "/compile");
  assert.equal(compileEndpoint("https://host/compile/").pathname, "/compile");
  assert.throws(() => compileEndpoint("https://user:secret@host"));
});
