"use client";
import Link from "next/link";
import { TextureButton } from "@/components/ui/texture-button";
import { onboardingRu, profileRu as profileCopy } from "@/content/ru";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { useProgress } from "@/lib/useProgress";
export default function ProfilePage({
  identity,
}: {
  identity?: { email?: string; createdAt: string; id: string; name?: string };
}) {
  const { progress: p } = useProgress();
  const displayName =
    p.account?.userId === identity?.id
      ? p.profile.name
      : identity?.name || p.profile.name;
  const timezone = p.account?.timezone || "UTC";
  return (
    <div className="profile-content">
      <section id="account" className="profile-account">
        <p className="profile-eyebrow">{profileCopy.eyebrow}</p>
        <h1>{profileCopy.title}</h1>
        <p className="profile-subtitle">{profileCopy.subtitle}</p>
        <div className="profile-identity">
          <span className="profile-avatar" aria-hidden="true">
            {displayName.slice(0, 1)}
          </span>
          <div>
            <h2>{displayName}</h2>
            <p>{identity?.email || profileCopy.guest}</p>
          </div>
          <TextureButton asChild variant="secondary">
            <Link href="/app/profile/settings">
              {profileCopy.edit}
              <span aria-hidden="true">↗</span>
            </Link>
          </TextureButton>
          {!p.account?.userId && (
            <TextureButton asChild variant="accent">
              <Link href="/register">{onboardingRu.saveProgress}</Link>
            </TextureButton>
          )}
        </div>
        <div className="profile-section-label">
          <span aria-hidden="true">＋</span>
          {profileCopy.details}
        </div>
        <dl className="profile-details">
          <div>
            <dt>{profileCopy.name}</dt>
            <dd>{displayName}</dd>
          </div>
          <div>
            <dt>{profileCopy.role}</dt>
            <dd>{p.account?.role === "teacher" ? c.teacher : c.student}</dd>
          </div>
          <div>
            <dt>{profileCopy.email}</dt>
            <dd>{identity?.email || profileCopy.local}</dd>
          </div>
          <div>
            <dt>{profileCopy.timezone}</dt>
            <dd>{p.account?.timezone || timezone}</dd>
          </div>
          <div>
            <dt>{profileCopy.id}</dt>
            <dd className="profile-id">{identity?.id || profileCopy.guest}</dd>
          </div>
          {identity?.createdAt && (
            <div>
              <dt>{profileCopy.joined}</dt>
              <dd>
                {new Date(identity.createdAt).toLocaleDateString("ru-RU", {
                  timeZone: p.account?.timezone || "UTC",
                })}
              </dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  );
}
