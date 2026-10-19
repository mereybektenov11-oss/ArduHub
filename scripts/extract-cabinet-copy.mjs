// One-time source normalization: keep remaining interface strings in the content deck.
import ts from "typescript";
import { readdir, readFile, writeFile } from "node:fs/promises";
const roots = [
  "src/components/cabinet",
  "src/components/editor",
  "src/components/games",
  "src/components/map",
  "src/components/tour",
];
async function files(root) {
  return (
    await Promise.all(
      (await readdir(root, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? files(`${root}/${e.name}`) : [`${root}/${e.name}`],
      ),
    )
  ).flat();
}
const entries = [],
  cache = new Map();
function textEntry(text) {
  if (cache.has(text)) return cache.get(text);
  const key = `text${String(entries.length + 1).padStart(3, "0")}`;
  cache.set(text, key);
  entries.push(`${key}: ${JSON.stringify(text)}`);
  return key;
}
for (const file of (await Promise.all(roots.map(files)))
  .flat()
  .filter((f) => f.endsWith(".tsx"))) {
  let source = await readFile(file, "utf8");
  const sf = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ),
    edits = [];
  function visit(node) {
    if (
      ts.isTemplateExpression(node) &&
      /[А-Яа-яЁё]/.test(
        [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(
          "",
        ),
      )
    ) {
      const key = `text${String(entries.length + 1).padStart(3, "0")}`;
      const chunks = [JSON.stringify(node.head.text)];
      node.templateSpans.forEach((s, i) => {
        chunks.push(`String(values[${i}])`, JSON.stringify(s.literal.text));
      });
      entries.push(`${key}: (...values: unknown[]) => ${chunks.join(" + ")}`);
      edits.push({
        start: node.getStart(sf),
        end: node.end,
        text: `uiCopy.${key}(${node.templateSpans.map((s) => s.expression.getText(sf)).join(",")})`,
      });
      return;
    }
    if (
      (ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isJsxText(node)) &&
      /[А-Яа-яЁё]/.test(node.text)
    ) {
      const text = ts.isJsxText(node)
        ? node.text.replace(/\s+/g, " ")
        : node.text;
      const key = textEntry(text);
      const jsx = ts.isJsxText(node) || ts.isJsxAttribute(node.parent);
      edits.push({
        start: node.getStart(sf),
        end: node.end,
        text: jsx ? `{uiCopy.${key}}` : `uiCopy.${key}`,
      });
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  if (!edits.length) continue;
  for (const e of edits.sort((a, b) => b.start - a.start))
    source = source.slice(0, e.start) + e.text + source.slice(e.end);
  const directive = source.indexOf(";") + 1;
  source =
    source.slice(0, directive) +
    `\nimport {interfaceCopy as uiCopy} from '@/content/cabinet.ru';` +
    source.slice(directive);
  await writeFile(file, source);
}
await writeFile(
  "src/content/cabinet.ru.ts",
  (await readFile("src/content/cabinet.ru.ts", "utf8")) +
    `\n// Shared labels from the cabinet interface.\nexport const interfaceCopy={\n${entries.join(",\n")}\n};\n`,
);
console.log(`Moved ${entries.length} shared strings to cabinet.ru.ts`);
