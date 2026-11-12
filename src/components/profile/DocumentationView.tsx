"use client";
import Link from "next/link";
import { TextureButton } from "@/components/ui/texture-button";
import { useState } from "react";
import { accountDocsRu as c } from "@/content/ru";
export default function DocumentationView({
  section,
}: {
  section: "start" | "workspace" | "components" | "code";
}) {
  const [search, setSearch] = useState("");
  const guide =
    section === "start"
      ? c.gettingStarted
      : section === "workspace"
        ? c.workspace
        : c.code;
  const components = c.components.filter((part) =>
    `${part.title} ${part.tag} ${part.text}`
      .toLocaleLowerCase("ru")
      .includes(search.trim().toLocaleLowerCase("ru")),
  );
  return (
    <div className="profile-content">
      <header className="profile-account">
        <p className="profile-eyebrow">{c.eyebrow}</p>
        <h1>
          {section === "start"
            ? c.title
            : section === "components"
              ? c.componentsTitle
              : guide.title}
        </h1>
        <p className="profile-subtitle">
          {section === "start"
            ? c.subtitle
            : section === "components"
              ? c.componentsSubtitle
              : guide.subtitle}
        </p>
      </header>
      {section === "components" ? (
        <>
          <label className="profile-field docs-search">
            {c.search}
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="account-card-grid">
            {components.map((part) => (
              <article className="account-info-card" key={part.title}>
                <span className="profile-status">{part.tag}</span>
                <h2>{part.title}</h2>
                <p>{part.text}</p>
                <div className="docs-tip">{part.tip}</div>
              </article>
            ))}
          </div>
          {!components.length && (
            <p role="status" className="profile-subtitle">
              {c.empty}
            </p>
          )}
        </>
      ) : (
        <>
          <ol className="docs-steps">
            {guide.steps.map((step, i) => (
              <li key={step.title}>
                <span className="account-step" aria-hidden="true">
                  0{i + 1}
                </span>
                <div>
                  <h2>{step.title}</h2>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          {section === "code" && (
            <section className="docs-code">
              <h2>{c.example}</h2>
              <pre>
                <code>{c.exampleCode}</code>
              </pre>
              <p className="profile-subtitle">{c.exampleNote}</p>
            </section>
          )}
        </>
      )}
      {section === "start" && (
        <nav className="account-card-grid docs-links" aria-label={c.topics}>
          {c.menu.slice(1).map(([label, href], i) => (
            <Link href={href} className="account-info-card" key={href}>
              <span className="account-step" aria-hidden="true">
                0{i + 1}
              </span>
              <h2>
                {label}
                <span aria-hidden="true"> ↗</span>
              </h2>
            </Link>
          ))}
        </nav>
      )}
      <div>
        <TextureButton asChild variant="primary">
          <Link href="/app/profile/desktop">
            {c.openLesson}
            <span aria-hidden="true">↗</span>
          </Link>
        </TextureButton>
      </div>
    </div>
  );
}
