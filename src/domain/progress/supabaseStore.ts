import type { SupabaseClient } from "@supabase/supabase-js";
import type { Progress } from "@/domain/types";
import { BrowserProgressStore, isProgress } from "./storage";
import { createProgress } from "@/domain/seed";
import { mergeProgress } from "./merge";
import { xpLevel } from "./xp";
import { normalizeProgress } from "./courseState";
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
  streakWasFrozen = false;
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
    const consumed = await this.client.rpc("consume_boost", { kind: "freeze" });
    this.streakWasFrozen = consumed.data?.used === true;
    const [stored, profile, events, receipts] = await Promise.all([
      this.client
        .from("progress")
        .select("data")
        .eq("user_id", this.userId)
        .maybeSingle(),
      this.client.from("profiles").select("*").eq("id", this.userId).single(),
      this.client.from("xp_events").select("amount").eq("user_id", this.userId),
      this.client
        .from("user_achievements")
        .select("achievement_id,awarded_at")
        .eq("user_id", this.userId),
    ]);
    if (stored.error || profile.error || events.error || receipts.error) {
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
      achievements: {
        unlocked: [
          ...new Set([
            ...(p.achievements?.unlocked ?? []),
            ...(local.achievements?.unlocked ?? []),
            ...(receipts.data ?? []).map((r) => r.achievement_id),
          ]),
        ],
        notified: [
          ...new Set([
            ...(p.achievements?.notified ?? []),
            ...(local.achievements?.notified ?? []),
          ]),
        ],
        claimed: (receipts.data ?? [])
          .filter((r) => r.awarded_at !== null)
          .map((r) => r.achievement_id),
      },
      ...(this.streakWasFrozen && p.streak.lastActiveDate
        ? {
            streak: {
              ...p.streak,
              frozenDates: [
                ...new Set([
                  ...(p.streak.frozenDates ?? []),
                  p.streak.lastActiveDate,
                ]),
              ],
            },
          }
        : {}),
      xp,
      profile: {
        ...p.profile,
        name: row.display_name,
        level: xpLevel(xp),
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
    const normalized = normalizeProgress(next);
    super.save(normalized);
    this.offline = false;
    this.onConnection(false);
    return normalized;
  }
  override save(p: Progress) {
    super.save(p);
    localStorage.setItem(
      "arduhub.pending-progress:" + this.userId,
      crypto.randomUUID(),
    );
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush().catch(() => {}), 1500);
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
    } catch (error) {
      this.offline = true;
      this.onConnection(true);
      throw error;
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
