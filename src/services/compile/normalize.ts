// Token-based normalization: preserve literals, directive boundaries and operator semantics.
export function normalizeCode(input: string): string {
  const source = input.replace(/\r\n?/g, "\n").replace(/\\\n/g, "");
  const tokens: string[] = [];
  let i = 0,
    directive = false;
  while (i < source.length) {
    const rest = source.slice(i);
    if (rest[0] === "\n") {
      if (directive) tokens.push("\n");
      directive = false;
      i++;
      continue;
    }
    const space = rest.match(/^[\t\v\f ]+/);
    if (space) {
      i += space[0].length;
      continue;
    }
    if (rest.startsWith("//")) {
      const end = source.indexOf("\n", i);
      i = end < 0 ? source.length : end;
      continue;
    }
    if (rest.startsWith("/*")) {
      const end = source.indexOf("*/", i + 2);
      if (end < 0) {
        tokens.push(rest);
        break;
      }
      if (directive && source.slice(i, end).includes("\n")) {
        tokens.push("\n");
        directive = false;
      }
      i = end + 2;
      continue;
    }
    const raw = rest.match(/^(?:u8|u|U|L)?R"([^\s()\\]{0,16})\(/);
    if (raw) {
      const end = source.indexOf(")" + raw[1] + '"', i + raw[0].length);
      const count = end < 0 ? source.length - i : end + raw[1].length + 2 - i;
      tokens.push(source.slice(i, i + count));
      i += count;
      continue;
    }
    const quote = rest.match(/^(?:u8|u|U|L)?(["'])/);
    if (quote) {
      let end = i + quote[0].length;
      while (end < source.length) {
        if (source[end] === "\\") {
          end += 2;
          continue;
        }
        if (source[end++] === quote[1]) break;
      }
      tokens.push(source.slice(i, end));
      i = end;
      continue;
    }
    const token = rest.match(
      /^(?:[A-Za-z_$\u0080-\uffff][\w$\u0080-\uffff]*|(?:\d|\.\d)(?:[A-Za-z0-9_.]|(?<=[eEpP])[+-])*|>>=|<<=|->\*|\.\.\.|::|\+\+|--|->|\.\*|<<|>>|<=|>=|==|!=|&&|\|\||\+=|-=|\*=|\/=|%=|&=|\|=|\^=|##|.)/,
    )![0];
    if (token === "#") directive = true;
    tokens.push(token);
    i += token.length;
  }
  return JSON.stringify(tokens);
}
