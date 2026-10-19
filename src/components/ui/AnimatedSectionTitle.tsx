import Reveal from "./Reveal";
import { motionTokens } from "@/lib/motion";
export default function AnimatedSectionTitle({
  title,
  sub,
}: {
  title: string;
  sub?: string;
}) {
  return (
    <div className="section-heading">
      <Reveal>
        <h2>{title}</h2>
      </Reveal>
      {sub && (
        <Reveal delay={motionTokens.duration.textDelay}>
          <p>{sub}</p>
        </Reveal>
      )}
    </div>
  );
}
