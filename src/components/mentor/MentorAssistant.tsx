"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { polishRu as c } from "@/content/ru";
import MentorChat from "@/components/cabinet/MentorChat";
import { Modal } from "@/components/cabinet/ui";
import { mentorRouteAllowed } from "@/domain/mentor/entry";
import type { MentorRequest } from "./openMentor";
import { playSfx } from "@/lib/sfx";

export default function MentorAssistant() {
  const pathname = usePathname();
  const [request, setRequest] = useState<{
    path: string;
    value: MentorRequest;
  } | null>(null);
  const context = useRef<MentorRequest>({});
  useEffect(() => {
    context.current = {};
    const frame = requestAnimationFrame(() =>
      setRequest((current) => (current?.path === pathname ? current : null)),
    );
    const allowed = () =>
      mentorRouteAllowed(
        pathname,
        !!document.querySelector('[data-mentor-game-result="true"]'),
      );
    const open = (event: Event) => {
      if (!allowed()) return;
      playSfx("mentor_open");
      setRequest({
        path: pathname,
        value: {
          ...context.current,
          ...(event as CustomEvent<MentorRequest>).detail,
        },
      });
    };
    const update = (event: Event) => {
      context.current = (event as CustomEvent<MentorRequest>).detail ?? {};
    };
    window.addEventListener("arduhub:mentor-open", open);
    window.addEventListener("arduhub:mentor-context", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("arduhub:mentor-open", open);
      window.removeEventListener("arduhub:mentor-context", update);
    };
  }, [pathname]);
  if (!request || request.path !== pathname) return null;
  return (
    <Modal title={c.mentor} onClose={() => setRequest(null)}>
      <MentorChat
        compact
        {...request.value}
        initialPrompt={request.value.prompt}
        onMinimize={() => setRequest(null)}
      />
    </Modal>
  );
}
