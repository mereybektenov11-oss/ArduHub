import type { Metadata } from "next";
import Link from "next/link";
import { ru } from "@/content/ru";
import CircuitDemo from "@/components/circuit/CircuitDemo";
import {
  Board,
  Breadboard,
  Led,
  Resistor,
} from "@/components/circuit/CircuitScene";
export const metadata: Metadata = {
  title: ru.ui.devTitle,
  robots: { index: false, follow: false },
};
export default function Circuits() {
  return (
    <main className="shell section">
      <Link href="/">{ru.ui.privacyBack}</Link>
      <h1>{ru.ui.devTitle}</h1>
      <CircuitDemo />
      <h2>{ru.ui.boardGallery}</h2>
      <svg
        viewBox="0 0 500 260"
        className="circuit"
        role="img"
        aria-label={ru.ui.circuitLabel}
      >
        <Board />
        <Breadboard />
        <g style={{ color: "var(--success)" }}>
          <Led />
        </g>
        <Resistor />
      </svg>
    </main>
  );
}
