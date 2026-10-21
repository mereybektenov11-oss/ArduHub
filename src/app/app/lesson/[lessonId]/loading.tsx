import LessonShell from "@/components/lesson/LessonShell";
import LessonSkeleton from "@/components/lesson/LessonSkeleton";
export default function Loading() {
  return (
    <LessonShell loading>
      <LessonSkeleton />
    </LessonShell>
  );
}
