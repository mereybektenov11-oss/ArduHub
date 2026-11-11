import DownloadAppButton from "../ui/DownloadAppButton";
import { ru } from "@/content/ru";
import VideoFrame from "./VideoFrame";
import BenefitCards from "./BenefitCards";
import Reveal from "../ui/Reveal";

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

export function LearningBenefits() {
  return (
    <section className="learning-benefits section" id="learning">
      <div className="shell">
        <Reveal className="video-intro">
          <h2>{ru.landingVideo.benefitsTitle}</h2>
          <p>{ru.landingVideo.benefitsText}</p>
        </Reveal>
        <BenefitCards />
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
          <DownloadAppButton />
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
