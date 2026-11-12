import { dailyFacts } from "@/content/dashboard.ru";
import { onboardingRu } from "@/content/ru";
import { lessonFlowRu as c } from "@/content/ru";
export function Skeleton({
  shape = "text",
}: {
  shape?: "video" | "text" | "test" | "practice";
}) {
  return (
    <div
      aria-hidden="true"
      className={`flow-skeleton flow-skeleton-${shape}`}
    />
  );
}
export default function LessonSkeleton() {
  return (
    <div className="flow-skeleton-layout" role="status" aria-label={c.loading}>
      <span className="sr-only">{c.loading}</span>
      <p>
        {onboardingRu.didYouKnow} {dailyFacts[0]}
      </p>
      <Skeleton shape="text" />
      <Skeleton shape="video" />
      <div className="flow-skeleton-notes">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    </div>
  );
}
