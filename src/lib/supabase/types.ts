import type { Progress } from "@/domain/types";
export type ProfileRow = {
  id: string;
  display_name: string;
  role: "student" | "teacher";
  timezone: string;
  avatar_frame: string | null;
  sparks: number;
  mentor_tokens: number;
  hide_from_leaderboard: boolean;
};
export type ProgressRow = {
  user_id: string;
  data: Progress;
  updated_at: string;
};
export type LeaderboardRow = {
  rank: number;
  display_name: string;
  avatar_frame: string | null;
  xp: number;
  is_self: boolean;
};
