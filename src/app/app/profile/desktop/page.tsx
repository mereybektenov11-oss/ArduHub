import { desktopAppRu as app, profileRu as c } from "@/content/ru";
import DownloadAppButton from "@/components/ui/DownloadAppButton";
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
          <h2>{app.platform}</h2>
          <p>{c.desktopBody}</p>
          <DownloadAppButton variant="primary" size="default" />
          <small>
            {app.meta(app.version, app.size)}. {c.smartscreen}
          </small>
        </div>
      </section>
    </div>
  );
}
