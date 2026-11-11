import { learningRu as c } from "@arduhub/curriculum/learning.ru";
export function codeIssue(code: string) {
  if (new TextEncoder().encode(code).length > 16384) return c.size;
  if (code.includes("___")) return c.unresolved;
  return null;
}
