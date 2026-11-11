// The companion's memory, kept per account on this computer (localStorage).
// It remembers mistakes (to escalate hints and recall them later) and the
// last chat messages. Nothing here is sent anywhere except the chat history
// that goes with a chat question.
export type ChatLine = { role: "user" | "mentor"; text: string };
export type PetMemory = {
  v: 1;
  mistakes: Record<string, { count: number; last: string; lessonId?: string }>;
  chat: ChatLine[];
};

const KEY = "arduhub.pet.v1.";
const CHAT_LIMIT = 30;

export const emptyMemory = (): PetMemory => ({ v: 1, mistakes: {}, chat: [] });

export function parseMemory(raw: string | null): PetMemory {
  try {
    const m = JSON.parse(raw ?? "") as Partial<PetMemory>;
    if (m?.v !== 1) return emptyMemory();
    const mistakes: PetMemory["mistakes"] = {};
    for (const [code, value] of Object.entries(m.mistakes ?? {}))
      if (
        /^[a-z_]{1,40}$/.test(code) &&
        Number.isInteger(value?.count) &&
        value.count > 0
      )
        mistakes[code] = {
          count: Math.min(value.count, 999),
          last: String(value.last ?? ""),
          lessonId:
            typeof value.lessonId === "string" ? value.lessonId : undefined,
        };
    const chat = (Array.isArray(m.chat) ? m.chat : [])
      .filter(
        (l): l is ChatLine =>
          (l?.role === "user" || l?.role === "mentor") &&
          typeof l.text === "string",
      )
      .map((l) => ({ role: l.role, text: l.text.slice(0, 2000) }))
      .slice(-CHAT_LIMIT);
    return { v: 1, mistakes, chat };
  } catch {
    return emptyMemory();
  }
}

export function loadMemory(userId: string): PetMemory {
  try {
    return parseMemory(localStorage.getItem(KEY + userId));
  } catch {
    return emptyMemory();
  }
}

export function saveMemory(userId: string, memory: PetMemory) {
  try {
    localStorage.setItem(KEY + userId, JSON.stringify(memory));
  } catch {
    /* storage unavailable: memory lasts for this run only */
  }
}

/** Counts one more occurrence of a mistake; returns the new count. */
export function recordMistake(
  memory: PetMemory,
  code: string,
  lessonId: string | undefined,
  now = new Date(),
): [PetMemory, number] {
  const count = (memory.mistakes[code]?.count ?? 0) + 1;
  return [
    {
      ...memory,
      mistakes: {
        ...memory.mistakes,
        [code]: { count, last: now.toISOString(), lessonId },
      },
    },
    count,
  ];
}

export function addChat(memory: PetMemory, line: ChatLine): PetMemory {
  return { ...memory, chat: [...memory.chat, line].slice(-CHAT_LIMIT) };
}

/** The mistake made most often, if it happened at least twice. */
export function frequentMistake(memory: PetMemory) {
  const [code, value] =
    Object.entries(memory.mistakes).sort(
      (a, b) => b[1].count - a[1].count,
    )[0] ?? [];
  return code && value.count >= 2 ? { code, count: value.count } : null;
}
