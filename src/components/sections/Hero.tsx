import type { ReactNode } from "react";
import { ru } from "@/content/ru";
import { TextureButton } from "../ui/texture-button";

export default function Hero({ background }: { background: ReactNode }) {
  return (
    <section className="hero">
      {background}
      <div className="hero-content">
        <p className="hero-eyebrow">
          <span aria-hidden="true" />
          {ru.hero.eyebrow}
        </p>
        <h1>
          {ru.hero.title}
          <br />
          <em>{ru.hero.question}</em>
        </h1>
        <p className="hero-description">{ru.hero.description}</p>
        <div className="hero-buttons">
          <TextureButton asChild variant="glass" size="lg">
            <a href="/app/profile">
              {ru.hero.primary}
              <span aria-hidden="true">↗</span>
            </a>
          </TextureButton>
        </div>
        <p className="hero-footnote">{ru.hero.footnote}</p>
      </div>
    </section>
  );
}
