"use client";
import { useProgress } from "@/lib/useProgress";
import { errorCopy } from "@arduhub/arduino-core/checker/errors.ru";
import type { ErrorCode } from "@arduhub/arduino-core/types";
import { practiceCopy as c } from "@/content/cabinet.ru";
import { kidsPagesRu as k } from "@/content/kids-pages.ru";
import { Action, Card, GradientCard } from "./ui";
import RewardIcon from "@/components/icons/RewardIcon";
export default function PracticeView({ review = false }: { review?: boolean }) {
  const { progress: p, update } = useProgress();
  return (
    <div className="cab-stack kids-practice">
      <h1>{k.practice}</h1>
      <div className="cab-grid-3 kids-games" data-tour="games">
        {(["blitz", "findbug", "match"] as const).map((kind, index) => (
          <GradientCard
            key={kind}
            tone={(["forest", "amber", "sea"] as const)[index]}
          >
            <span className="kids-game-icon" aria-hidden="true">
              <RewardIcon
                kind={index === 0 ? "spark" : index === 1 ? "mission" : "token"}
              />
            </span>
            <h2>{k.gameTitles[kind]}</h2>
            <p>{k.gameNotes[kind]}</p>
            <Action href={`/app/practice/${kind}`}>{k.play} →</Action>
          </GradientCard>
        ))}
      </div>
      {p.reviewQueue.length > 0 && (
        <Card className="kids-review-card">
          <h2>{k.review(p.reviewQueue.length)}</h2>
          {!review && (
            <Action secondary href="/app/practice?review=1">
              {c.reviewTitle} →
            </Action>
          )}
          {review && (
            <div className="cab-stack">
              {p.reviewQueue.map((entry, index) => (
                <div
                  className="cab-forgotten"
                  key={`${entry.addedAt}-${index}`}
                >
                  <h3>
                    {Object.hasOwn(errorCopy, entry.errorCode)
                      ? errorCopy[entry.errorCode as ErrorCode][0]
                      : c.reviewTitle}
                  </h3>
                  <p>
                    {Object.hasOwn(errorCopy, entry.errorCode)
                      ? errorCopy[entry.errorCode as ErrorCode][2]
                      : c.reviewMatch}
                  </p>
                  <Action
                    secondary
                    onClick={() =>
                      update((prev) => ({
                        ...prev,
                        reviewQueue: prev.reviewQueue.filter(
                          (_, n) => n !== index,
                        ),
                      }))
                    }
                  >
                    {c.reviewDone}
                  </Action>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
