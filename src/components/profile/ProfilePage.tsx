"use client";
import { levelFromXp } from "@/domain/progress/levels";
import { onboardingRu } from "@/content/ru";
import RewardIcon from "@/components/icons/RewardIcon";
import LevelBadge from "@/components/icons/LevelBadge";
import StreakCalendar from "@/components/icons/StreakCalendar";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { topics } from "@/domain/types";
import { topicNames } from "@/domain/seed";
import { useProgress } from "@/lib/useProgress";
import { browserSupabase } from "@/lib/supabase/client";
import { Card, Action, SkillBar } from "@/components/cabinet/ui";
import { activeStreak } from "@/domain/progress/streak";
export default function ProfilePage() {
  const { progress: p, update, notify, refreshAccount } = useProgress();
  const router = useRouter();
  const [name, setName] = useState(p.profile.name),
    [timezone, setTimezone] = useState(p.account?.timezone ?? "Asia/Almaty"),
    [hide, setHide] = useState(p.account?.hideFromLeaderboard ?? false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setName(p.profile.name);
      setTimezone(
        p.account?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
      setHide(p.account?.hideFromLeaderboard ?? false);
    });
    return () => cancelAnimationFrame(frame);
  }, [p.profile.name, p.account?.timezone, p.account?.hideFromLeaderboard]);
  async function save() {
    if (!name.trim() || name.trim().length > 20) return;
    setBusy(true);
    try {
      new Intl.DateTimeFormat("ru", { timeZone: timezone });
      if (p.account?.userId) {
        const client = browserSupabase();
        if (!client) throw Error();
        const { error } = await client
          .from("profiles")
          .update({
            display_name: name.trim(),
            timezone,
            hide_from_leaderboard: hide,
          })
          .eq("id", p.account.userId);
        if (error) throw error;
        await refreshAccount();
      } else
        update((x) => ({
          ...x,
          profile: { ...x.profile, name: name.trim() },
          account: {
            ...x.account,
            role: "student",
            timezone,
            hideFromLeaderboard: hide,
          },
        }));
      notify(c.saved);
    } catch {
      notify(c.offline);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await browserSupabase()?.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("arduhub.active-user");
    router.push("/sign-in");
    router.refresh();
  }
  return (
    <div className="cab-stack">
      <h1>{c.profile}</h1>
      <Card>
        <div className="cab-row">
          <span
            className={`cab-avatar frame-${p.account?.avatarFrame ?? "none"}`}
          >
            {p.profile.avatar || p.profile.name.slice(0, 1)}
          </span>
          <div>
            <h2>{p.profile.name}</h2>
            <p>{p.account?.role === "teacher" ? c.teacher : c.student}</p>
          </div>
        </div>
        <p>
          <LevelBadge value={levelFromXp(p.xp)} />
          {c.level} {levelFromXp(p.xp)} · <RewardIcon kind="xp" /> {p.xp} XP ·{" "}
          <RewardIcon kind="flame" /> {activeStreak(p.streak)}{" "}
          {c.streak.toLowerCase()}
        </p>
        <p>
          <RewardIcon kind="spark" /> {p.sparks} {c.sparkUnits} ·{" "}
          <RewardIcon kind="token" /> {p.mentor.tokens} {c.tokenUnits}
        </p>
        <StreakCalendar />
        {!p.account?.userId && (
          <p>
            <Link className="cab-btn" href="/register">
              {onboardingRu.saveProgress}
            </Link>
          </p>
        )}
      </Card>
      <Card>
        <form
          className="dash-profile-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label>
            {c.nickname}
            <input
              value={name}
              required
              maxLength={20}
              autoComplete="nickname"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            {c.timezone}
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {[
                ...new Set([
                  timezone,
                  "Asia/Almaty",
                  "Asia/Qyzylorda",
                  "Europe/Moscow",
                  "Europe/London",
                  "America/New_York",
                  "Pacific/Auckland",
                  "UTC",
                ]),
              ].map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
          </label>
          <label className="dash-checkbox">
            <input
              type="checkbox"
              checked={hide}
              onChange={(e) => setHide(e.target.checked)}
            />
            {c.hide}
          </label>
          <label>
            {c.textSize}
            <select
              aria-label={c.textSize}
              value={p.settings?.textScale ?? 1}
              onChange={(e) =>
                update((x) => ({
                  ...x,
                  settings: {
                    textScale: Number(e.target.value) as 1 | 1.15 | 1.3,
                  },
                }))
              }
            >
              {[1, 1.15, 1.3].map((v) => (
                <option value={v} key={v}>
                  {Math.round(v * 100)}%
                </option>
              ))}
            </select>
          </label>
          <Action disabled={busy} type="submit">
            {c.save}
          </Action>
        </form>
      </Card>
      <Card>
        <h2>{c.strengths}</h2>
        <div className="cab-skills">
          {topics.map((t) => (
            <SkillBar
              key={t}
              title={topicNames[t]}
              value={p.diagnostic.skillScores[t]}
            />
          ))}
        </div>
      </Card>
      <Action secondary onClick={logout}>
        {c.logout}
      </Action>
    </div>
  );
}
