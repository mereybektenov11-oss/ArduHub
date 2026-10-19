import { ru } from "@/content/ru";
import Accordion from "../ui/Accordion";
import { SectionShell } from "../ui/primitives";
import AnimatedSectionTitle from "../ui/AnimatedSectionTitle";
export default function Faq() {
  return (
    <SectionShell id="faq" className="faq-section">
      <div className="faq-layout">
        <AnimatedSectionTitle title={ru.section.faq} />
        <Accordion items={ru.faq} />
      </div>
    </SectionShell>
  );
}
