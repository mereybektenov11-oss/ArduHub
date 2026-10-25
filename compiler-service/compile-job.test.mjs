import { test } from "node:test";
import assert from "node:assert/strict";
import { compileJob } from "./compile-job.mjs";

test("missing Arduino executable is unavailable rather than timeout or student syntax error", async () => {
  assert.deepEqual(
    await compileJob(
      "void setup(){} void loop(){}",
      "arduhub-nonexistent-cli-g3",
    ),
    { error: "compiler_unavailable" },
  );
});
