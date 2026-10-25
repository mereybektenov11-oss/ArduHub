"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createMentorNudge, type NudgeOptions } from "@/domain/mentor/nudge";

// Keep a dismissed stage quiet when the pupil revisits it during this session.
const shownStages = new Set<string>();

export function useMentorNudge({ stageKey, active, enabled }: NudgeOptions) {
  const [controller] = useState(() => createMentorNudge(shownStages));
  const visible = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    () => false,
  );
  useEffect(() => {
    controller.configure({ stageKey, active, enabled });
    return controller.dispose;
  }, [controller, stageKey, active, enabled]);
  return {
    visible: active && enabled && visible,
    recordCheck: controller.recordCheck,
    recordActivity: controller.recordActivity,
    dismiss: controller.dismiss,
  };
}
