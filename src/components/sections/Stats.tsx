"use client";
import { ru } from "@/content/ru";
import { useInViewOnce } from "@/lib/useInViewOnce";
import { motionTokens } from "@/lib/motion";
import AnimatedNumber from "../ui/AnimatedNumber";
export default function Stats() {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  return (
    <div className="stats-section">
      <div className="shell">
        <div className="stats" ref={ref}>
          {ru.stats.map((s) => (
            <div className="stat" key={s.value}>
              <strong aria-label={String(s.value)}>
                <AnimatedNumber
                  value={s.value}
                  from={0}
                  active={inView}
                  duration={motionTokens.duration.counter}
                />
                <span aria-hidden="true">+</span>
              </strong>
              <p>{s.label}</p>
            </div>
          ))}
        </div>
        <p className="stats-note">{ru.statsNote}</p>
      </div>
    </div>
  );
}
