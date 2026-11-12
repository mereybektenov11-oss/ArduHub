import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
const examples = JSON.parse(
  await readFile("packages/curriculum/src/hardware-examples.json", "utf8"),
);
for (const example of examples) {
  const result = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "-i",
      "--network=none",
      "--read-only",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--cpus=1",
      "--memory=256m",
      "--pids-limit=64",
      "--tmpfs=/tmp:rw,noexec,nosuid,size=100663296",
      "arduhub-compiler-test",
    ],
    {
      input: example.code,
      encoding: "utf8",
      timeout: 30000,
    },
  );
  const data = JSON.parse(result.stdout || "{}");
  if (result.status !== 0 || typeof data.hex !== "string")
    throw Error(
      `Не скомпилирован доверенный пример ${example.id}: ${data.error ?? "container_failed"}`,
    );
  console.log(`${example.id}: OK`);
}
