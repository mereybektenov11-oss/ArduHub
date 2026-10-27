"use client";
import { levelFromXp } from "@/domain/progress/levels";
import { onboardingRu } from "@/content/ru";
import RewardIcon from "@/components/icons/RewardIcon";
import PartView from "@/components/workspace/PartView";
import { catalog } from "@/domain/parts/catalog";
import type { PartType } from "@/domain/parts/catalog";
import LevelBadge from "@/components/icons/LevelBadge";
import StreakCalendar from "@/components/icons/StreakCalendar";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { kidsPagesRu as k } from "@/content/kids-pages.ru";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { topics } from "@/domain/types";
import { mentors } from "@/domain/seed";
import { mentorCopy } from "@/content/cabinet.ru";
import CabinetArt, { type ArtName } from "@/components/cabinet/CabinetArt";
import { topicNames } from "@/domain/seed";
import { useProgress } from "@/lib/useProgress";
import { browserSupabase } from "@/lib/supabase/client";
import { Card, Action, SkillBar } from "@/components/cabinet/ui";
import { activeStreak } from "@/domain/progress/streak";
import { useSound } from "@/lib/useSound";
import { motionSoundRu } from "@/content/motion-sound.ru";
import Icon from "@/components/icons/Icon";
import { streakVisualState } from "@/lib/streakState";
import Stickers from "./Stickers";
const topicParts: Record<(typeof topics)[number], PartType> = {
  leds: "led",
  buttons: "button",
  sensors: "pot",
  motors: "servo",
  display: "lcd",
  projects: "uno",
};
export default function ProfilePage() {
  const sound = useSound();
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
    <div className="cab-stack kids-profile">
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
          <Icon
            name="streak"
            state={streakVisualState(p, new Date())}
            value={p.streak.count}
          />{" "}
          {activeStreak(p.streak)} {c.streak.toLowerCase()}
        </p>
        <p>
          <RewardIcon kind="spark" /> {p.sparks} {c.sparkUnits} ·{" "}
          <RewardIcon kind="token" /> {p.mentor.tokens} {c.tokenUnits}
        </p>
        <StreakCalendar />
      </Card>
      <Card>
        <form
          id="profile-settings"
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
          <h2>{k.settings}</h2>
          <label>
            {motionSoundRu.volume}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sound.volume}
              onChange={(e) => sound.setVolume(Number(e.target.value))}
            />
            <output>{Math.round(sound.volume * 100)}%</output>
          </label>
          <label className="kids-setting-switch">
            {k.sounds}
            <input
              type="checkbox"
              role="switch"
              checked={sound.enabled}
              onChange={sound.toggle}
            />
          </label>
          <label className="kids-setting-switch">
            {k.mentorHints}
            <input
              type="checkbox"
              role="switch"
              checked={p.settings?.mentorHints !== false}
              onChange={(e) =>
                update((x) => ({
                  ...x,
                  settings: {
                    ...x.settings,
                    textScale: x.settings?.textScale ?? 1,
                    mentorHints: e.target.checked,
                  },
                }))
              }
            />
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
                    ...x.settings,
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
          <details className="kids-mentor-picker">
            <summary className="cab-btn cab-btn-secondary">
              {k.changeMentor}
            </summary>
            <div className="kids-mentor-choices">
              {mentors.map((mentor) => (
                <div key={mentor.id}>
                  <CabinetArt name={mentor.id as ArtName} alt="" size={72} />
                  <strong>{mentor.name}</strong>
                  {p.mentor.unlockedIds.includes(mentor.id) ? (
                    <Action
                      type="button"
                      secondary
                      disabled={p.mentor.selectedId === mentor.id}
                      onClick={() =>
                        update((prev) => ({
                          ...prev,
                          mentor: { ...prev.mentor, selectedId: mentor.id },
                        }))
                      }
                    >
                      {p.mentor.selectedId === mentor.id
                        ? mentorCopy.selected
                        : mentorCopy.select}
                    </Action>
                  ) : (
                    <Link
                      className="cab-btn cab-btn-secondary"
                      href="/app/shop"
                    >
                      {mentorCopy.unlock}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </details>
          <Action disabled={busy} type="submit">
            {c.save}
          </Action>
        </form>
      </Card>
      <Card>
        {p.diagnostic.status !== "done" &&
        !topics.some((t) => p.diagnostic.skillScores[t] > 0) ? (
          <p>{k.noTopics}</p>
        ) : (
          <div className="kids-topic-groups">
            {[true, false].map((strong) => (
              <div key={String(strong)}>
                <h2>{strong ? k.strengths : k.weaknesses}</h2>
                <div className="cab-skills">
                  {topics
                    .filter((t) =>
                      strong
                        ? p.diagnostic.skillScores[t] >= 70
                        : p.diagnostic.skillScores[t] < 70,
                    )
                    .map((t) => (
                      <div className="kids-topic-score" key={t}>
                        <PartView
                          type={topicParts[t]}
                          scale={Math.min(
                            32 / catalog[topicParts[t]].width,
                            32 / catalog[topicParts[t]].height,
                          )}
                        />
                        <SkillBar
                          title={topicNames[t]}
                          value={p.diagnostic.skillScores[t]}
                        />
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Stickers />
      {p.account?.userId ? (
        <Action disabled={busy} onClick={save}>
          {onboardingRu.saveProgress}
        </Action>
      ) : (
        <Action href="/register">{onboardingRu.saveProgress}</Action>
      )}
      <Action secondary onClick={logout}>
        {c.logout}
      </Action>
    </div>
  );
}
