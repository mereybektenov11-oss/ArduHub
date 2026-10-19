"use client";
import { levels } from "@/domain/seed";
import { useProgress } from "@/lib/useProgress";
import { Modal, Action, Pill } from "./ui";
import { rewardCopy as c } from "@/content/cabinet.ru";
export default function LevelUp() {
  const { levelUp, dismissLevelUp } = useProgress();
  if (levelUp === null) return null;
  return (
    <Modal title={c.title} onClose={dismissLevelUp}>
      <div className="cab-level-up">
        <span aria-hidden="true">↯</span>
        <Pill>
          {c.level} {levelUp}
        </Pill>
        <h2>{levels[levelUp].name}</h2>
        <p>{c.note}</p>
        <Action onClick={dismissLevelUp}>{c.go}</Action>
      </div>
    </Modal>
  );
}
