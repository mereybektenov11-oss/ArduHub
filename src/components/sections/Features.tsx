import { ru } from "@/content/ru";
import { SectionShell } from "../ui/primitives";
import AnimatedSectionTitle from "../ui/AnimatedSectionTitle";
import MiniInterface from "../ui/MiniInterface";
import { Stagger, StaggerItem } from "../ui/Stagger";
import CircuitIcon from "../ui/CircuitIcon";
export default function Features() {
  return (
    <SectionShell id="features">
      <AnimatedSectionTitle
        title={ru.section.features}
        sub={ru.section.featuresSub}
      />
      <Stagger className="features-grid">
        {ru.features.map((f, i) => (
          <StaggerItem key={f.id} className="feature-slot">
            <article className={`feature feature-${i}`}>
              <div className="feature-copy">
                <span className="feature-icon" aria-hidden="true">
                  {i === 0 ? <CircuitIcon /> : ["⌘", "✳", "▷", "↻"][i]}
                </span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
              <MiniInterface kind={[2, 3, 1, 4][i]} animated />
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </SectionShell>
  );
}
