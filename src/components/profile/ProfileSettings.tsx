"use client";
import { useState, type FormEvent } from "react";
import { profileRu as c } from "@/content/ru";
import { useProgress } from "@/lib/useProgress";
import { browserSupabase } from "@/lib/supabase/client";
import { TextureButton } from "@/components/ui/texture-button";

export default function ProfileSettings() {
  const { progress: p, update, refreshAccount } = useProgress();
  const [timezone, setTimezone] = useState(
    p.account?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [hide, setHide] = useState(p.account?.hideFromLeaderboard ?? false);
  const [sounds, setSounds] = useState(p.settings?.sounds !== false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      new Intl.DateTimeFormat("ru", { timeZone: timezone });
      if (p.account?.userId) {
        const client = browserSupabase();
        if (!client) throw Error();
        const { error } = await client
          .from("profiles")
          .update({ timezone, hide_from_leaderboard: hide })
          .eq("id", p.account.userId);
        if (error) throw error;
        await refreshAccount();
      }
      update((prev) => ({
        ...prev,
        account: {
          ...prev.account,
          role: prev.account?.role ?? "student",
          timezone,
          hideFromLeaderboard: hide,
        },
        settings: {
          ...prev.settings,
          textScale: prev.settings?.textScale ?? 1,
          sounds,
        },
      }));
      setMessage(c.saved);
    } catch {
      setMessage(c.saveError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="profile-content">
      <div className="profile-account">
        <p className="profile-eyebrow">{c.workspace}</p>
        <h1>{c.settings}</h1>
        <p className="profile-subtitle">{c.settingsHint}</p>
      </div>
      <form className="profile-settings-form" onSubmit={save}>
        <label className="profile-field">
          {c.name}
          <input
            value={p.profile.name}
            readOnly
            autoComplete="nickname"
            aria-label={c.name}
            aria-describedby="profile-name-note"
          />
          <small id="profile-name-note">{c.settingsNote}</small>
        </label>
        <label className="profile-field">
          {c.timezone}
          <select
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
          >
            {[
              ...new Set([
                timezone,
                "Asia/Qyzylorda",
                "Asia/Almaty",
                "Europe/Moscow",
                "Europe/London",
                "America/New_York",
                "UTC",
              ]),
            ].map((zone) => (
              <option key={zone}>{zone}</option>
            ))}
          </select>
        </label>
        <label className="profile-toggle">
          <span>{c.sounds}</span>
          <input
            type="checkbox"
            role="switch"
            checked={sounds}
            onChange={(event) => setSounds(event.target.checked)}
          />
        </label>
        <label className="profile-toggle">
          <span>{c.hide}</span>
          <input
            type="checkbox"
            checked={hide}
            onChange={(event) => setHide(event.target.checked)}
          />
        </label>
        <div>
          <TextureButton variant="primary" type="submit" disabled={busy}>
            {busy ? c.saving : c.save}
          </TextureButton>
        </div>
        {message && (
          <p role="status" className="profile-subtitle">
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
