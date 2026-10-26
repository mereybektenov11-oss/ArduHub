"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cabinetRu as c } from "@/content/cabinet.ru";
import { mapRu as m } from "@/content/map.ru";
import { useProgress } from "@/lib/useProgress";
import { playSfx } from "@/lib/sfx";
import { computeMapState } from "./mapState";
import MapArtwork from "./MapArtwork";
export default function IslandMap() {
  const { progress, ready } = useProgress();
  const states = computeMapState(progress);
  const signature = states.map((state) => state.status).join(",");
  const previous = useRef<string[] | null>(null);
  const [unlock, setUnlock] = useState<number | null>(null);
  useEffect(() => {
    if (!ready) return;
    const current = signature.split(",");
    let unlocked = previous.current
      ? current.findIndex(
          (status, index) =>
            status !== "locked" && previous.current![index] === "locked",
        )
      : -1;
    previous.current = current;
    try {
      const pending = sessionStorage.getItem("arduhub.map.unlock");
      sessionStorage.removeItem("arduhub.map.unlock");
      if (pending !== null && /^\d+$/.test(pending)) {
        const id = Number(pending);
        if (id > 0 && current[id] && current[id] !== "locked") unlocked = id;
      }
    } catch {}
    if (unlocked < 0) return;
    playSfx("unlock");
    const frame = requestAnimationFrame(() => setUnlock(unlocked));
    const timer = setTimeout(() => setUnlock(null), 1200);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [ready, signature]);
  return (
    <div className="cab-stack island-map-page">
      <div>
        <h1>{c.mapTitle}</h1>
        <p className="cab-lead">{c.mapIntro}</p>
      </div>
      <MapArtwork states={states} unlock={unlock} />
      <p className="cab-muted">{m.caption}</p>
      <section aria-label={m.list}>
        <h2>{m.list}</h2>
        <ol className="island-level-list">
          {states.map((state) => (
            <li key={state.id}>
              <strong>
                {state.status === "locked" ? (
                  state.zoneName
                ) : (
                  <Link href={`/app/map/${state.id}`}>{state.zoneName}</Link>
                )}
              </strong>
              <span>
                {m[state.status]} · {m.progress(state.done, state.total)}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
