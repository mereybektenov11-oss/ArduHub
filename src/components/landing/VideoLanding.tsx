import { ru } from "@/content/ru";
import VideoFrame from "./VideoFrame";
import Reveal from "../ui/Reveal";
import { Button } from "../ui/primitives";

export function MainVideo() {
  return (
    <section className="main-video-section" id="product-demo">
      <div className="shell">
        <Reveal>
          <VideoFrame
            id="overview-video"
            src="/videos/landing/editor.mp4"
            poster="/videos/landing/editor.webp"
            label={ru.landingVideo.overviewLabel}
            tone="rainbow"
            featured
          />
        </Reveal>
      </div>
    </section>
  );
}

export function VideoFeatures() {
  return (
    <section className="video-features section" id="features">
      <div className="shell">
        <Reveal className="video-intro">
          <h2>{ru.landingVideo.introTitle}</h2>
          <p>{ru.landingVideo.introText}</p>
        </Reveal>
        <div className="video-feature-list">
          {ru.landingVideo.features.map((feature, index) => (
            <article
              className={`video-feature video-feature-${feature.tone}`}
              key={feature.id}
            >
              <Reveal className="video-feature-copy">
                <span className="video-feature-number">0{index + 1}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </Reveal>
              <Reveal className="video-feature-media">
                <VideoFrame
                  id={`${feature.id}-video`}
                  src={`/videos/landing/${feature.video}.mp4`}
                  poster={`/videos/landing/${feature.video}.webp`}
                  label={feature.label}
                  tone={feature.tone}
                />
              </Reveal>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const cardArt = [
  <svg key="circuit" viewBox="0 0 120 100" fill="none">
    <rect
      x="22"
      y="25"
      width="76"
      height="50"
      rx="12"
      stroke="currentColor"
      strokeWidth="3"
    />
    <rect
      x="45"
      y="37"
      width="30"
      height="26"
      rx="4"
      fill="currentColor"
      opacity=".2"
    />
    <path
      d="M34 19v10m18-10v10m18-10v10m18-10v10M34 71v10m18-10v10m18-10v10m18-10v10"
      stroke="currentColor"
      strokeWidth="3"
    />
  </svg>,
  <svg key="check" viewBox="0 0 120 100" fill="none">
    <circle cx="60" cy="50" r="29" stroke="currentColor" strokeWidth="3" />
    <path
      d="m46 50 10 10 20-22"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>,
  <svg key="lesson" viewBox="0 0 120 100" fill="none">
    <rect
      x="23"
      y="24"
      width="74"
      height="52"
      rx="9"
      stroke="currentColor"
      strokeWidth="3"
    />
    <path d="m52 37 20 13-20 13V37Z" fill="currentColor" opacity=".7" />
  </svg>,
  <svg key="project" viewBox="0 0 120 100" fill="none">
    <path
      d="m42 29-20 21 20 21m36-42 20 21-20 21M67 23 53 77"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>,
];

export function LearningBenefits() {
  return (
    <section className="learning-benefits section" id="learning">
      <div className="shell">
        <Reveal className="video-intro">
          <h2>{ru.landingVideo.benefitsTitle}</h2>
          <p>{ru.landingVideo.benefitsText}</p>
        </Reveal>
        <div className="benefits-grid">
          {ru.landingVideo.benefits.map((item, index) => (
            <Reveal
              className={`benefit-card benefit-card-${index}`}
              key={item.title}
            >
              <div className="benefit-art" aria-hidden="true">
                {cardArt[index]}
              </div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function VideoFinalCta() {
  return (
    <section className="video-final section" id="access">
      <div className="shell">
        <Reveal className="video-final-copy">
          <h2>{ru.landingVideo.finalTitle}</h2>
          <p>{ru.landingVideo.finalText}</p>
          <Button href="/app" size="lg">
            {ru.hero.primary}
            <span aria-hidden="true">↗</span>
          </Button>
        </Reveal>
        <div className="final-node-art" aria-hidden="true">
          <span>{ru.landingVideo.nodeLabels[0]}</span>
          <i />
          <span>{ru.landingVideo.nodeLabels[1]}</span>
          <i />
          <span>{ru.landingVideo.nodeLabels[2]}</span>
        </div>
      </div>
    </section>
  );
}
