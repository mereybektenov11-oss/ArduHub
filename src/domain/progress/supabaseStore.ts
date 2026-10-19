import type { SupabaseClient } from "@supabase/supabase-js";
import type { Progress } from "@/domain/types";
import { BrowserProgressStore, isProgress } from "./storage";
import { createProgress } from "@/domain/seed";
import { mergeProgress } from "./merge";
import { xpLevel } from "./xp";
export function scopedStorage(storage: Storage, userId?: string) {
  return {
    getItem: (key: string) =>
      storage.getItem(userId ? `${userId}:${key}` : key),
    setItem: (key: string, value: string) =>
      storage.setItem(userId ? `${userId}:${key}` : key, value),
    removeItem: (key: string) =>
      storage.removeItem(userId ? `${userId}:${key}` : key),
  };
}
export class SupabaseProgressStore extends BrowserProgressStore {
  private timer: ReturnType<typeof setTimeout> | undefined;
  offline = false;
  constructor(
    private client: SupabaseClient,
    private userId: string,
    private onConnection: (offline: boolean) => void,
  ) {
    super(scopedStorage(localStorage, userId));
  }
  async hydrate(): Promise<Progress> {
    const local = this.load();
    await this.client.rpc("consume_boost", { kind: "freeze" });
    const [stored, profile, events] = await Promise.all([
      this.client
        .from("progress")
        .select("data")
        .eq("user_id", this.userId)
        .maybeSingle(),
      this.client.from("profiles").select("*").eq("id", this.userId).single(),
      this.client.from("xp_events").select("amount").eq("user_id", this.userId),
    ]);
    if (stored.error || profile.error || events.error) {
      this.offline = true;
      this.onConnection(true);
      return local;
    }
    const cloud = isProgress(stored.data?.data) ? stored.data.data : local;
    const p = localStorage.getItem("arduhub.pending-progress:" + this.userId)
      ? mergeProgress(local, cloud)
      : cloud;
    const row = profile.data;
    const xp =
      events.data?.reduce((sum, event) => sum + Number(event.amount), 0) ?? 0;
    const next = {
      ...p,
      xp,
      profile: {
        ...p.profile,
        name: row.display_name,
        level: Math.max(p.profile.level, xpLevel(xp)),
      },
      sparks: row.sparks,
      mentor: {
        ...p.mentor,
        tokens: row.mentor_tokens,
        unlockedIds: [
          "volt",
          ...(row.inventory ?? []).filter((id: string) =>
            ["oma", "rezik", "shina"].includes(id),
          ),
        ],
      },
      account: {
        userId: this.userId,
        role: row.role,
        timezone: row.timezone,
        avatarFrame: row.avatar_frame,
        hideFromLeaderboard: row.hide_from_leaderboard,
      },
      inventory: row.inventory ?? [],
      boosts: { freeze: row.freeze_count ?? 0, hints: row.hint_count ?? 0 },
    } as Progress;
    super.save(next);
    this.offline = false;
    this.onConnection(false);
    return next;
  }
  override save(p: Progress) {
    super.save(p);
    localStorage.setItem(
      "arduhub.pending-progress:" + this.userId,
      crypto.randomUUID(),
    );
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 1500);
  }
  async flush() {
    clearTimeout(this.timer);
    try {
      const revision = localStorage.getItem(
        "arduhub.pending-progress:" + this.userId,
      );
      const { error } = await this.client.rpc("save_progress", {
        data: this.memory,
      });
      if (error) throw error;
      if (
        localStorage.getItem("arduhub.pending-progress:" + this.userId) ===
        revision
      )
        localStorage.removeItem("arduhub.pending-progress:" + this.userId);
      this.offline = false;
      this.onConnection(false);
    } catch {
      this.offline = true;
      this.onConnection(true);
    }
  }
  override reset() {
    const p = createProgress();
    this.save(p);
    return p;
  }
  dispose() {
    clearTimeout(this.timer);
  }
}
