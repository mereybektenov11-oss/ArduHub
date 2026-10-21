export type AwardEvent = {
  source: "lesson" | "lesson_quiz" | "game";
  refId: string;
  amount: number;
};
type Store = Pick<Storage, "getItem" | "setItem">;
const key = (id: string) => "arduhub.pending-awards:" + id;
const read = (storage: Store, id: string): AwardEvent[] => {
  try {
    return JSON.parse(storage.getItem(key(id)) || "[]");
  } catch {
    return [];
  }
};
export function queueAwards(storage: Store, id: string, events: AwardEvent[]) {
  const pending = read(storage, id);
  for (const event of events)
    if (
      !pending.some((e) => e.source === event.source && e.refId === event.refId)
    )
      pending.push(event);
  storage.setItem(key(id), JSON.stringify(pending));
}
export async function flushAwards(
  storage: Store,
  id: string,
  currentUser: () => string | undefined,
  flushProgress: () => Promise<void>,
  fetcher: typeof fetch = fetch,
) {
  if (currentUser() !== id) return;
  await flushProgress();
  for (const event of read(storage, id)) {
    if (currentUser() !== id) return;
    const response = await fetcher("/api/award", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!response.ok && response.status !== 409)
      throw Error(response.status === 429 ? "daily_cap" : "offline");
    storage.setItem(
      key(id),
      JSON.stringify(
        read(storage, id).filter(
          (e) => e.source !== event.source || e.refId !== event.refId,
        ),
      ),
    );
  }
}
