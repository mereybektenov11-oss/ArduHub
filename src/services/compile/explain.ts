import { learningRu as c } from "@arduhub/curriculum/learning.ru";
export type Diagnostic = { line: number; col: number; message: string };
export function explain(message: string) {
  const d = c.compileExplanations;
  if (/digitalwrite/.test(message)) return d.typo;
  if (/expected.*[;]|missing.*semicolon/i.test(message)) return d.semicolon;
  if (/not declared|undeclared|does not name a type/i.test(message))
    return d.undeclared;
  if (/expected.*[}]|end of input/i.test(message)) return d.brace;
  if (/expected.*[()]|initializer before/i.test(message)) return d.paren;
  if (/header|include/i.test(message)) return d.includes;
  return d.other;
}
