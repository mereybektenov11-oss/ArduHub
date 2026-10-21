import { lessonFlowRu as c } from "@/content/ru";
export default function TopProgressLine({
  loading = false,
  value = 0,
}: {
  loading?: boolean;
  value?: number;
}) {
  return (
    <div className="flow-progress-track">
      <div
        className={`flow-opening-progress ${loading ? "is-loading" : "is-ready"}`}
        aria-hidden="true"
      >
        <span />
      </div>
      <div
        className={`flow-progress ${loading ? "is-loading" : ""}`}
        role="progressbar"
        aria-label={loading ? c.loading : c.lessonProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={loading ? undefined : value}
      >
        <span
          style={loading ? undefined : { transform: `scaleX(${value / 100})` }}
        />
      </div>
    </div>
  );
}
