export type GameAttempt = {
  attemptId: string;
  gameId: string;
  questionIndex: number;
  pair?: [string, string];
  option?: number;
  match?: [number, number];
};
const pending = new Map<string, Promise<void>>();
const key = (userId: string) => `arduhub.achievement-attempts.${userId}`;
function read(userId: string): GameAttempt[] {
  try {
    return JSON.parse(localStorage.getItem(key(userId)) ?? "[]");
  } catch {
    return [];
  }
}
export function queueGameAttempt(userId: string, attempt: GameAttempt) {
  localStorage.setItem(key(userId), JSON.stringify([...read(userId), attempt]));
  void flushGameAttempts(userId).catch(() => {});
}
export function flushGameAttempts(userId: string): Promise<void> {
  const task = (pending.get(userId) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      for (;;) {
        const attempt = read(userId)[0];
        if (!attempt) return;
        const response = await fetch("/api/achievements/game-attempt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ArduHub-User": userId,
          },
          body: JSON.stringify(attempt),
        });
        if (!response.ok) throw Error("Game evidence is pending");
        // Read again: new answers may have been queued while the request was running.
        localStorage.setItem(
          key(userId),
          JSON.stringify(
            read(userId).filter((item) => item.attemptId !== attempt.attemptId),
          ),
        );
      }
    });
  pending.set(userId, task);
  return task;
}
