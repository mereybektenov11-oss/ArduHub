"use client";
import { useEffect, useRef, useState } from "react";
import { useProgress } from "@/lib/useProgress";
import { mentors } from "@/domain/seed";
import { polishRu as c } from "@/content/ru";
import CabinetArt, { type ArtName } from "@/components/cabinet/CabinetArt";
import MentorChat from "@/components/cabinet/MentorChat";
import { Modal } from "@/components/cabinet/ui";
import { openMentor, type MentorRequest } from "./openMentor";
export default function MentorAssistant() {
  const { progress: p } = useProgress();
  const [request, setRequest] = useState<MentorRequest | null>(null),
    [seen, setSeen] = useState(false);
  const context = useRef<MentorRequest>({});
  const mentor =
    mentors.find((m) => m.id === p.mentor.selectedId) ?? mentors[0];
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setSeen(localStorage.getItem("arduhub.mentor.hintSeen.v1") === "1");
      } catch {}
    });
    const open = (e: Event) => {
      setRequest({
        ...context.current,
        ...(e as CustomEvent<MentorRequest>).detail,
      });
      setSeen(true);
      try {
        localStorage.setItem("arduhub.mentor.hintSeen.v1", "1");
      } catch {}
    };
    const update = (e: Event) => {
      context.current = (e as CustomEvent<MentorRequest>).detail ?? {};
    };
    window.addEventListener("arduhub:mentor-open", open);
    window.addEventListener("arduhub:mentor-context", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("arduhub:mentor-open", open);
      window.removeEventListener("arduhub:mentor-context", update);
    };
  }, []);
  return (
    <>
      <button
        className="polish-mentor-fab"
        data-tour="mentor"
        aria-label={c.askMentor}
        onClick={() => openMentor()}
      >
        {!seen && <span className="polish-mentor-hint">{c.askMentor}</span>}
        <CabinetArt name={mentor.id as ArtName} alt="" size={64} />
        <span>{c.mentor}</span>
      </button>
      {request && (
        <Modal title={c.mentor} onClose={() => setRequest(null)}>
          <MentorChat
            compact
            {...request}
            initialPrompt={request.prompt}
            onMinimize={() => setRequest(null)}
          />
        </Modal>
      )}
    </>
  );
}
