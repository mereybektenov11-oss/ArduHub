"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { kidsPagesRu as k } from "@/content/kids-pages.ru";
import CabinetArt from "@/components/cabinet/CabinetArt";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { browserSupabase } from "@/lib/supabase/client";
import type { LeaderboardRow } from "@/lib/supabase/types";
import { useProgress } from "@/lib/useProgress";
import { Card } from "@/components/cabinet/ui";
import Icon from "@/components/icons/Icon";
export default function Leaderboard({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { progress: p } = useProgress();
  const [rows, setRows] = useState<LeaderboardRow[]>([]),
    [offline, setOffline] = useState(false);
  useEffect(() => {
    const client = browserSupabase();
    if (!client || !p.account?.userId) return;
    let cancelled = false;
    void client
      .rpc("get_weekly_leaderboard", { limit: compact ? 3 : 20 })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setOffline(true);
        else setRows((data ?? []) as LeaderboardRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, [p.account?.userId, p.xp, compact]);
  const visible = rows.filter((r) => r.rank <= (compact ? 3 : 20));
  const own = rows.find((r) => r.is_self);
  const content = (
    <>
      {offline && <p role="status">{c.offline}</p>}
      {visible.length ? (
        <ol className="dash-leaders">
          {visible.map((row) => (
            <li key={row.rank} className={row.is_self ? "self" : ""}>
              <strong className={`polish-medal rank-${row.rank}`}>
                {row.rank <= 3 && (
                  <Icon
                    name={
                      row.rank === 1
                        ? "gold"
                        : row.rank === 2
                          ? "silver"
                          : "bronze"
                    }
                  />
                )}
                {row.rank}
              </strong>
              <span
                className={`cab-avatar frame-${row.avatar_frame ?? "none"}`}
              >
                {row.display_name.slice(0, 1)}
              </span>
              <span>{row.display_name}</span>
              <strong>{row.xp} XP</strong>
            </li>
          ))}
        </ol>
      ) : (
        <div className="leaderboard-empty">
          <span className="leaderboard-podium" aria-hidden="true">
            {(["oma", "volt", "rezik"] as const).map((name) => (
              <span className="kids-podium-step" key={name}>
                <CabinetArt name={name} alt="" size={80} />
              </span>
            ))}
          </span>
          <p>{c.emptyLeaders}</p>
        </div>
      )}
      {!compact && own && (
        <p className="kids-own-rank">
          <Icon
            name={
              own.rank === 1 ? "gold" : own.rank === 2 ? "silver" : "bronze"
            }
          />
          {k.ownRank(own.rank)}
        </p>
      )}
      {!compact && !p.account?.userId && (
        <p className="cab-muted">{c.localLeaders}</p>
      )}
      {!compact && p.account?.hideFromLeaderboard && (
        <p>
          {p.profile.name} · {p.xp} XP
        </p>
      )}
    </>
  );
  return compact ? (
    <Card>
      <div className="cab-row">
        <h2>{c.leaderboard}</h2>
        <Link href="/app/leaderboard" aria-label={c.leaderboard}>
          ↗
        </Link>
      </div>
      {content}
    </Card>
  ) : (
    <div className="cab-stack">
      <h1>{c.leaderboard}</h1>
      <Card>{content}</Card>
    </div>
  );
}
