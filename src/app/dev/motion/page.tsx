import type { Metadata } from "next";
import Reveal from "@/components/ui/Reveal";
import { Stagger, StaggerItem } from "@/components/ui/Stagger";
import { ru } from "@/content/ru";

export const metadata: Metadata = {
  title: ru.section.features,
  robots: { index: false, follow: false },
};

// An isolated gallery lets timing checks avoid unrelated hero animations.
export default function MotionGallery() {
  return (
    <main className="shell section">
      <h1>{ru.section.features}</h1>
      <div style={{ height: "100vh" }} aria-hidden="true" />
      <Reveal>
        <h2>{ru.section.features}</h2>
      </Reveal>
      <div style={{ height: "100vh" }} aria-hidden="true" />
      <Stagger className="features-grid">
        {ru.features.map((feature) => (
          <StaggerItem key={feature.id} className="feature">
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </StaggerItem>
        ))}
      </Stagger>
      <div style={{ height: "100vh" }} aria-hidden="true" />
    </main>
  );
}
