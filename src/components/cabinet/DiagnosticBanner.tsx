"use client";
import { interfaceCopy as uiCopy } from "@/content/cabinet.ru";
import { useProgress } from "@/lib/useProgress";
import CabinetArt from "./CabinetArt";
import { Action } from "./ui";
export default function DiagnosticBanner() {
  const { progress: p } = useProgress();
  if (p.diagnostic.status === "done") return null;
  return (
    <section className="cab-diagnostic-banner" data-tour="diagnosis">
      <div>
        <span className="cab-pill">{uiCopy.text011}</span>
        <h2>{uiCopy.text012}</h2>
        <p>{uiCopy.text013}</p>
        <Action href="/app/test">
          {p.diagnostic.answers.length
            ? uiCopy.text014(p.diagnostic.answers.length + 1)
            : uiCopy.text015}{" "}
          →
        </Action>
      </div>
      <CabinetArt
        name="volt"
        alt={uiCopy.text016}
        size={170}
        className="cab-banner-mascot"
      />
    </section>
  );
}
