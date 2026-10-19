import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compileJob } from "./compile-job.mjs";
import { validateCode } from "./policy.mjs";

// Explicit local-development mode. This is not a replacement for a sandbox on a public service.
export function validateLocalCode(code) {
  const normalized =
    typeof code === "string" ? code.replace(/\r\n?/g, "\n") : code;
  const error = validateCode(normalized);
  if (error) return error;
  const source = normalized
    .replace(/\\\r?\n/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\r\n]*/g, "");
  // No alternate spellings of preprocessor tokens or escaped identifiers.
  if (/\?\?|%:|\\[uU][0-9a-fA-F]/.test(source)) return "forbidden_header";
  for (const line of source.split(/\r\n?|\n/)) {
    if (!/^\s*#/.test(line)) continue;
    if (/^\s*#\s*include\s*[<"][^>"]+[>"]\s*$/.test(line)) continue; // Header allow-list was checked above.
    if (
      /^\s*#\s*define\s+(?!__)[A-Z][A-Z0-9_]*\s+(?:0x[0-9a-fA-F]+|\d+)\s*$/.test(
        line,
      )
    )
      continue;
    return "forbidden_header";
  }
  return null;
}
export async function compileLocal(code) {
  const error = validateLocalCode(code);
  if (error) return { error, diagnostics: [] };
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(([name]) =>
      /^(PATH|PATHEXT|SystemRoot|WINDIR|TEMP|TMP|ComSpec|ProgramData|LOCALAPPDATA|APPDATA|USERPROFILE|NUMBER_OF_PROCESSORS)$/i.test(
        name,
      ),
    ),
  );
  return compileJob(
    code,
    resolve(root, "tools/arduino/arduino-cli.exe"),
    [
      "--config-file",
      resolve(root, "tools/arduino/arduino-cli.yaml"),
      "--jobs",
      "1",
      "--build-property",
      "compiler.cpp.extra_flags=-ftemplate-depth=64 -fconstexpr-depth=64",
    ],
    environment,
  );
}
