import type { ReactNode } from "react";
import { ru } from "@/content/ru";
import { Button } from "../ui/primitives";

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
          <Button href="/app" size="lg">
            {ru.hero.primary}
            <span aria-hidden="true">↗</span>
          </Button>
          <Button href="#product-demo" size="lg" variant="secondary">
            {ru.hero.secondary}
            <span aria-hidden="true">↓</span>
          </Button>
        </div>
        <p className="hero-footnote">{ru.hero.footnote}</p>
      </div>
      <div className="hero-bottom-note" aria-hidden="true">
        <span>{ru.landing.sceneLabel}</span>
        <span>
          {ru.landing.scroll}
          <span>↓</span>
        </span>
      </div>
    </section>
  );
}
