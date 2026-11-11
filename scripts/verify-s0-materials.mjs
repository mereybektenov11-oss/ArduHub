import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const hash = (data) => createHash("sha256").update(data).digest("hex");
const moves = JSON.parse(
  readFileSync("docs/coordination/s0-moves.json", "utf8"),
);
let count = 0;
for (const move of moves.filter((item) => /\.(json|hex)$/.test(item.from))) {
  const original = execFileSync(
    "git",
    ["show", `learning-web-final:${move.from}`],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  const current = readFileSync(move.to);
  // Git stores LF; this Windows checkout may contain CRLF. The copy itself
  // must be byte-identical to the pre-move checkout, including line endings.
  const canonical = (data) =>
    hash(data.toString("utf8").replaceAll("\r\n", "\n"));
  if (
    canonical(original) !== canonical(current) ||
    hash(current) !== move.sha256
  )
    throw new Error(`Material changed: ${move.from} -> ${move.to}`);
  if (
    move.from.startsWith("public/hex/") &&
    hash(readFileSync(move.from)) !== move.sha256
  )
    throw new Error(`HTTP firmware differs: ${move.from}`);
  count++;
}
console.log(
  `${count} JSON/HEX assets match pre-move SHA256 byte for byte and learning-web-final after LF normalization; HTTP HEX copies match.`,
);
