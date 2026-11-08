import { ru } from "@/content/ru";
export default function Footer({
  videoLanding = false,
}: { videoLanding?: boolean } = {}) {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-top">
          <div>
            <a className="brand" href="#main">
              {ru.brand}
            </a>
            <p>{ru.ui.footerNote}</p>
          </div>
          <nav aria-label={ru.footer.product}>
            <a href="#features">{ru.footer.product}</a>
            <a href={videoLanding ? "#learning" : "#pricing"}>
              {videoLanding
                ? ru.landingVideo.footerLearning
                : ru.footer.schools}
            </a>
            <a href="#access">
              {videoLanding ? ru.hero.primary : ru.footer.contacts}
            </a>
            <a href="/privacy">{ru.footer.privacy.label}</a>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>{ru.footer.copyright}</span>
          <span>{ru.ui.upcoming}</span>
        </div>
      </div>
    </footer>
  );
}
