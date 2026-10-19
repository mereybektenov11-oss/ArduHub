import type { Homework, Progress } from "./types";
import { localDate } from "./progress/streak";
export function homeworkStatus(
  hw: Homework,
  p: Progress,
  today = localDate(),
): "done" | "inprogress" | "overdue" {
  if (hw.lessonIds.every((id) => p.lessons[id]?.status === "done"))
    return "done";
  return hw.dueDate < today ? "overdue" : "inprogress";
}
