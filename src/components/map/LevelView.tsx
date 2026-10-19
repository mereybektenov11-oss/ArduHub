"use client";
import { interfaceCopy as uiCopy } from "@/content/cabinet.ru";
import { useRouter } from "next/navigation";
import { levels, lessons } from "@/domain/seed";
import { useProgress } from "@/lib/useProgress";
import { lessonOpen } from "@/domain/progress/xp";
import { Card, Action, Pill, ProgressBar } from "@/components/cabinet/ui";
import CabinetArt from "@/components/cabinet/CabinetArt";
import Reveal from "@/components/ui/Reveal";
export default function LevelView({ id }: { id: number }) {
  const { progress: p, notify } = useProgress(),
    router = useRouter();
  const level = levels[id];
  if (!level) return <h1>{uiCopy.text079}</h1>;
  if (id > p.profile.level)
    return (
      <Card>
        <h1>{uiCopy.text072}</h1>
        <Action href="/app/map">{uiCopy.text080}</Action>
      </Card>
    );
  const list = lessons.filter((l) => l.levelId === id),
    done = list.filter((l) => p.lessons[l.id].status === "done").length;
  return (
    <div className="cab-stack">
      <Action href="/app/map" secondary>
        {uiCopy.text081}
      </Action>
      <section className="cab-level-banner" data-tour="level">
        <CabinetArt
          name="banner"
          alt={uiCopy.text082}
          className="cab-level-banner-image"
        />
        <div className="cab-stack">
          <Pill>
            {uiCopy.text083}
            {id} · {level.name}
          </Pill>
          <h1>{level.zoneName}</h1>
          <p>
            {uiCopy.text084}
            {done} {uiCopy.text085}
            {list.length}
          </p>
          <ProgressBar
            value={(done / list.length) * 100}
            label={uiCopy.text086}
          />
        </div>
      </section>
      {level.units.map((unit, i) => (
        <Reveal key={unit.id}>
          <details className="cab-card cab-unit" open>
            <summary>
              <span className="cab-unit-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2>{unit.title}</h2>
              <span>⌄</span>
            </summary>
            <div className="cab-lesson-path">
              {unit.lessonIds.map((lessonId, n) => {
                const lesson = lessons.find((l) => l.id === lessonId)!,
                  done = p.lessons[lessonId].status === "done",
                  open = lessonOpen(p, lessonId);
                return (
                  <div
                    key={lessonId}
                    className={`cab-path-step ${done ? "done" : open ? "current" : "locked"}`}
                  >
                    <button
                      aria-label={`${lesson.title}${!open ? uiCopy.text087 : ""}`}
                      onClick={() =>
                        open
                          ? router.push(`/app/lesson/${lessonId}`)
                          : notify(uiCopy.text088)
                      }
                    >
                      <span aria-hidden="true">
                        {done ? "✓" : open ? n + 1 : "⌑"}
                      </span>
                    </button>
                    <div>
                      <strong>{lesson.title}</strong>
                      <small>
                        {done
                          ? uiCopy.text051
                          : open
                            ? uiCopy.text089
                            : uiCopy.text090}{" "}
                        · +{lesson.xp} XP
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        </Reveal>
      ))}
    </div>
  );
}
