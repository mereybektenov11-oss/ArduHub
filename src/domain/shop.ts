import type { Progress } from "./types";
import { shopDeck } from "@/content/shop.ru";
export const shopItems = shopDeck;
export function buyLocal(p: Progress, id: string): Progress {
  const item = shopItems.find((i) => i.id === id);
  if (
    !item ||
    p.sparks < item.price ||
    (item.oneTime && p.inventory?.includes(id))
  )
    return p;
  return {
    ...p,
    sparks: p.sparks - item.price,
    inventory: [...new Set([...(p.inventory ?? []), id])],
    boosts: {
      freeze: (p.boosts?.freeze ?? 0) + ("freeze" in item ? item.freeze : 0),
      hints: (p.boosts?.hints ?? 0) + ("hints" in item ? item.hints : 0),
    },
    account: {
      role: p.account?.role ?? "student",
      timezone:
        p.account?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...p.account,
      ...("frame" in item ? { avatarFrame: item.frame } : {}),
    },
    mentor: {
      ...p.mentor,
      tokens: p.mentor.tokens + ("tokens" in item ? item.tokens : 0),
      unlockedIds:
        "mentor" in item
          ? [...new Set([...p.mentor.unlockedIds, item.mentor])]
          : p.mentor.unlockedIds,
    },
  };
}
