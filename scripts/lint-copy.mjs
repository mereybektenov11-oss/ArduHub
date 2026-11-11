import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// Inspect text nodes and string values rather than identifiers (JSON.parse,
// guest routes and source filenames are implementation details).
const forbidden =
  /гост[а-яё]*|демо[а-яё-]*|демонстрац[а-яё]*|скоро(?![а-яё])|в\s+разработке|ранн[а-яё]*\s+доступ[а-яё]*|заглушк[а-яё]*|учебная\s+модель|симуляци[а-яё]*|кэш[а-яё]*|\bJSON\b/iu;
if (process.argv[2] === "--check-text") {
  process.exitCode = forbidden.test(process.argv.slice(3).join(" ")) ? 1 : 0;
} else {
  const failures = [];
  function inspect(file) {
    const source = fs.readFileSync(file, "utf8");
    const tree = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    function walk(node) {
      const literal =
        ts.isStringLiteralLike(node) ||
        ts.isJsxText(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node);
      if (literal) {
        const text = node.text;
        const isImport =
          node.parent &&
          (ts.isImportDeclaration(node.parent) ||
            ts.isExportDeclaration(node.parent));
        const uiText =
          ts.isJsxText(node) ||
          file.includes(`${path.sep}content${path.sep}`) ||
          /[а-яё]/iu.test(text);
        if (!isImport && uiText && forbidden.test(text)) {
          const { line } = tree.getLineAndCharacterOfPosition(
            node.getStart(tree),
          );
          failures.push(`${file}:${line + 1}: ${text.trim()}`);
        }
      }
      ts.forEachChild(node, walk);
    }
    walk(tree);
  }
  for (const root of ["src/content", "src/components", "src/app", "packages/curriculum/src"]) {
    for (const entry of fs.readdirSync(root, {
      recursive: true,
      withFileTypes: true,
    })) {
      if (entry.isFile() && /\.tsx?$/.test(entry.name))
        inspect(path.join(entry.parentPath, entry.name));
    }
  }
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  } else console.log("UI copy: no forbidden phrases.");
}
