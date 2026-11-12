import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { overlayRegistry } from "../../src/components/overlay/registry";
function tags(path: string) {
  const root = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      found.push(node.tagName.getText(root));
    ts.forEachChild(node, visit);
  }
  visit(root);
  return found;
}
describe("H declared popup registry source wiring", () => {
  it("covers every required presentation entry exactly once", () => {
    expect(overlayRegistry.map((item) => item.id).sort()).toEqual(
      [
        "completion",
        "level",
        "purchase",
        "chest",
        "sticker",
        "streak",
        "freeze",
        "save",
        "name",
        "mentor",
        "reward",
      ].sort(),
    );
  });
  it.each(overlayRegistry)(
    "$id connects to the common $kind layer",
    (entry) => {
      const found = tags(entry.source);
      expect(
        found.some((tag) =>
          entry.kind === "status"
            ? ["RewardPopup", "TransientNotice"].includes(tag)
            : ["Overlay", "Modal"].includes(tag),
        ),
      ).toBe(true);
    },
  );
  it("the retained Modal API delegates to Overlay", () => {
    expect(tags("src/components/cabinet/ui/index.tsx")).toContain("Overlay");
  });
});
