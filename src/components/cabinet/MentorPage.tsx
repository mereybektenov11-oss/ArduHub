"use client";
import { interfaceCopy as uiCopy } from "@/content/cabinet.ru";
import { mentors } from "@/domain/seed";
import { useProgress } from "@/lib/useProgress";
import { useRouter } from "next/navigation";
import { mentorCopy as c } from "@/content/cabinet.ru";
import { Card, Action, Pill } from "./ui";
import CabinetArt, { type ArtName } from "./CabinetArt";
import MentorChat from "./MentorChat";
export default function MentorPage({
  lessonId,
  errorCode,
}: {
  lessonId?: string;
  errorCode?: string;
}) {
  const { progress: p, update, notify } = useProgress();
  const router = useRouter();
  return (
    <div className="cab-stack">
      <div>
        <p className="cab-eyebrow">{uiCopy.text037}</p>
        <h1>{c.title}</h1>
        <p className="cab-lead">{c.intro}</p>
      </div>
      <div className="cab-mentors">
        {mentors.map((m) => {
          const unlocked = p.mentor.unlockedIds.includes(m.id);
          return (
            <Card
              key={m.id}
              className={
                p.mentor.selectedId === m.id ? "cab-mentor-selected" : ""
              }
            >
              <div className="cab-mentor-portrait">
                <CabinetArt name={m.id as ArtName} alt={m.name} size={160} />
              </div>
              <h2>{m.name}</h2>
              <p className="cab-small cab-muted">{m.character}</p>
              <p className="cab-small">{m.tone}</p>
              <Action
                secondary
                disabled={false}
                onClick={() => {
                  if (!unlocked) {
                    router.push("/app/shop");
                    return;
                  }
                  update((prev) =>
                    unlocked
                      ? {
                          ...prev,
                          mentor: { ...prev.mentor, selectedId: m.id },
                        }
                      : prev,
                  );
                  notify(
                    unlocked
                      ? `${c.selected}: ${m.name}`
                      : `${m.name} ${c.unlocked}`,
                  );
                }}
              >
                {unlocked
                  ? p.mentor.selectedId === m.id
                    ? c.selected
                    : c.select
                  : uiCopy.text038(c.unlock, m.unlockCost)}
              </Action>
            </Card>
          );
        })}
      </div>
      <Pill>
        {p.sparks} {c.sparks}
      </Pill>
      <MentorChat lessonId={lessonId} errorCode={errorCode} />
    </div>
  );
}
