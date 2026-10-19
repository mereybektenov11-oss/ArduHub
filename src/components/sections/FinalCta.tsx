import { ru } from "@/content/ru";
import { databaseConfigured } from "@/lib/db";
import WaitlistForm from "../WaitlistForm";
import { SectionShell } from "../ui/primitives";
export default function FinalCta() {
  return (
    <SectionShell id="access" tone="dark" className="final-section">
      <div className="final-content">
        <p className="final-eyebrow">{ru.hero.eyebrow}</p>
        <h2>{ru.section.final}</h2>
        <p>{ru.section.finalSub}</p>
        <WaitlistForm configured={databaseConfigured()} />
      </div>
      <div className="plus-pattern" aria-hidden="true">
        {Array.from({ length: 49 }, (_, i) => (
          <span key={i} style={{ "--plus-index": i } as React.CSSProperties}>
            +
          </span>
        ))}
      </div>
    </SectionShell>
  );
}
