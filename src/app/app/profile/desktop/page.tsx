import { profileRu as c } from "@/content/ru";
import { TextureButton } from "@/components/ui/texture-button";
export default function Page() {
  return (
    <div className="profile-content">
      <div className="profile-account">
        <p className="profile-eyebrow">{c.workspace}</p>
        <h1>{c.desktop}</h1>
        <p className="profile-subtitle">{c.desktopHint}</p>
      </div>
      <section className="profile-desktop">
        <div className="profile-desktop-art" aria-hidden="true">
          <div className="profile-monitor">
            <span>∞</span>
            <div>
              <i />
              <i />
              <i />
            </div>
          </div>
          <span className="profile-monitor-stand" />
        </div>
        <div className="profile-desktop-copy">
          <span className="profile-status">{c.soon}</span>
          <h2>{c.desktopHint}</h2>
          <p>{c.desktopBody}</p>
          <TextureButton
            variant="secondary"
            type="button"
            disabled
            aria-describedby="desktop-status"
          >
            ↓ {c.download}
          </TextureButton>
          <small id="desktop-status">{c.unavailable}</small>
        </div>
      </section>
    </div>
  );
}
