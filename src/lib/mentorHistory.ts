export type MentorMessage = { role: "user" | "assistant"; text: string };

/** Remove whole balanced JSON objects, including streamed/incomplete scene data. */
export function cleanMentorText(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    if (
      !/^\{\s*"/.test(text.slice(i)) &&
      !/^\[\s*(?:\{|"|\])/.test(text.slice(i))
    ) {
      result += text[i];
      continue;
    }
    let depth = 0,
      quoted = false,
      escaped = false,
      end = i;
    for (; end < text.length; end++) {
      const char = text[end];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\" && quoted) {
        escaped = true;
        continue;
      }
      if (char === '"') quoted = !quoted;
      if (!quoted && (char === "{" || char === "[")) depth++;
      if (!quoted && (char === "}" || char === "]") && --depth === 0) {
        end++;
        break;
      }
    }
    i = end - 1;
  }
  return result
    .replace(/^.*(?:Наставник видит:|\[context\]|\[system\]).*$/gim, "")
    .split(/(```[\s\S]*?(?:```|$))/g)
    .map((block) =>
      block.startsWith("```") ? block : block.replace(/<[^>]*>/g, ""),
    )
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function migrateMentorHistory(value: unknown): {
  version: 2;
  messages: MentorMessage[];
} {
  const source = Array.isArray(value)
    ? value
    : value && typeof value === "object" && "messages" in value
      ? value.messages
      : [];
  const messages: MentorMessage[] = [];
  if (Array.isArray(source))
    for (const item of source) {
      if (
        !item ||
        !["user", "assistant"].includes(item.role) ||
        typeof item.text !== "string"
      )
        continue;
      const text = cleanMentorText(item.text);
      if (text) messages.push({ role: item.role, text });
    }
  return { version: 2, messages };
}
