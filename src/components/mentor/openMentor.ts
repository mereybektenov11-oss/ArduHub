"use client";
import type { MentorInput } from "@/services/mentor/client";
export type MentorRequest = Pick<MentorInput, "lessonId" | "context"> & {
  prompt?: string;
  errorCode?: string;
};
export function openMentor(request: MentorRequest = {}) {
  window.dispatchEvent(
    new CustomEvent("arduhub:mentor-open", { detail: request }),
  );
}
