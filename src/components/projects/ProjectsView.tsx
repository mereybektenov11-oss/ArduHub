"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onboardingRu } from "@/content/ru";
import { learningRu as c } from "@/content/learning.ru";
import sketches from "@/content/sketches.json" with { type: "json" };
import { emptyScene } from "@/domain/scene/scene";
import { exampleScene } from "@/domain/lessons/content";
import {
  importProject,
  thumbnail,
  type Project,
} from "@/domain/projects/storage";
import { useLearningStore } from "@/lib/useLearningStore";
import { Action, Card, Tabs } from "@/components/cabinet/ui";

import ScenePreview from "./ScenePreview";
import { projectIdeas } from "@/domain/projects/ideas";
import { kidsPagesRu as k } from "@/content/kids-pages.ru";
import PartView from "@/components/workspace/PartView";
import CabinetArt from "@/components/cabinet/CabinetArt";
import { catalog } from "@/domain/parts/catalog";
import { exportProject } from "@/domain/projects/export";
import { useProgress } from "@/lib/useProgress";
import { recordAchievementEvent } from "@/domain/achievements";
export default function ProjectsView({
  initialTab = "mine",
}: {
  initialTab?: string;
}) {
  const { update } = useProgress();
  const { store, mutate } = useLearningStore(),
    router = useRouter(),
    [tab, setTab] = useState(initialTab),
    [message, setMessage] = useState("");
  const importInput = useRef<HTMLInputElement>(null);
  function create(kind?: string) {
    if (!store) return;
    const idea = projectIdeas.find((s) => s.id === kind);
    const example = idea ?? sketches.find((s) => s.id === kind),
      now = new Date().toISOString(),
      scene =
        idea?.scene ?? (example ? exampleScene(example.id) : emptyScene()),
      project: Project = {
        id: crypto.randomUUID(),
        title: example?.title ?? c.untitled,
        idea: example?.idea ?? "",
        createdAt: now,
        updatedAt: now,
        scene,
        code: example?.code ?? "void setup() {\n\n}\n\nvoid loop() {\n\n}\n",
        thumbnailSvg: thumbnail(scene),
      };
    let added = false;
    mutate((s) => {
      added = s.add(project);
    });
    if (added) {
      update((p) =>
        recordAchievementEvent(p, { kind: "project", id: project.id }),
      );
      router.push(`/app/projects/${project.id}`);
    } else setMessage(c.limit);
  }
  return (
    <div className="cab-stack kids-projects">
      <div className="cab-row">
        <div>
          <h1>{initialTab === "ideas" ? c.ideas : c.projects}</h1>
          <p className="cab-lead">{c.projectsIntro}</p>
        </div>
        {tab === "mine" && !!store?.projects.length && (
          <Action
            disabled={!store || store.projects.length >= 20 || store.corrupt}
            onClick={() => create()}
          >
            {k.createProject} +
          </Action>
        )}
      </div>
      {store?.unavailable && (
        <p className="l2-error" role="alert">
          {c.unsaved}
        </p>
      )}
      {store?.corrupt && (
        <Card>
          <p>{c.corrupt}</p>
          <Action secondary onClick={() => mutate((s) => s.reset())}>
            {c.reset}
          </Action>
        </Card>
      )}
      <div className="cab-row">
        <Tabs
          label={c.projects}
          value={tab}
          onChange={setTab}
          items={[
            { id: "mine", title: c.mine },
            { id: "ideas", title: c.ideas },
          ]}
        />
        <details className="project-actions">
          <summary
            className="cab-icon-btn"
            aria-label={onboardingRu.projectMenu}
          >
            ⋯
          </summary>
          <button
            className="cab-btn cab-btn-secondary"
            type="button"
            disabled={!store || store.projects.length >= 20 || store.corrupt}
            onClick={() => importInput.current?.click()}
          >
            {c.import}
          </button>
          <input
            ref={importInput}
            hidden
            type="file"
            aria-label={c.import}
            accept=".json,application/json"
            disabled={!store || store.projects.length >= 20 || store.corrupt}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size > 200 * 1024) {
                setMessage(c.importBad);
                return;
              }
              const imported = importProject(await file.text());
              if (!imported) {
                setMessage(c.importBad);
                return;
              }
              let ok = false;
              mutate((s) => {
                ok = s.add(imported);
              });
              setMessage(ok ? "" : c.limit);
            }}
          />
        </details>
      </div>
      {message && (
        <p role="alert" className="l2-error">
          {message}
        </p>
      )}
      {store && store.projects.length >= 20 && (
        <p className="l2-note">{c.limit}</p>
      )}
      {tab === "mine" && store && !store.projects.length && (
        <Card className="kids-project-empty">
          <CabinetArt name="volt" alt="" size={150} />
          <h2>{k.emptyProjects}</h2>
          <p>{k.emptyProjectsNote}</p>
          <Action onClick={() => create()} disabled={!store || store.corrupt}>
            {k.createProject}
          </Action>
        </Card>
      )}
      <div className="l2-project-grid">
        {tab === "mine"
          ? store?.projects.map((p) => (
              <Card key={p.id}>
                <div className="l2-project-preview" aria-label={p.title}>
                  <ScenePreview scene={p.scene} title={p.title} />
                </div>
                <h2>{p.title}</h2>
                <p>{p.idea}</p>
                <p className="cab-small cab-muted">
                  <time dateTime={p.updatedAt}>
                    {new Date(p.updatedAt).toLocaleString("ru-RU")}
                  </time>
                </p>
                <div className="cab-row">
                  <Action href={`/app/projects/${p.id}`}>{c.open} →</Action>
                  <details className="project-actions">
                    <summary
                      className="cab-icon-btn"
                      aria-label={onboardingRu.projectMenu}
                    >
                      ⋯
                    </summary>
                    <Action secondary onClick={() => exportProject(p)}>
                      {c.export}
                    </Action>
                  </details>
                </div>
              </Card>
            ))
          : projectIdeas.map((s) => (
              <Card key={s.id}>
                <div className="l2-project-preview">
                  <ScenePreview scene={s.scene} title={s.title} />
                </div>
                <h2>{s.title}</h2>
                <p>{s.idea}</p>
                <span
                  className="kids-difficulty"
                  aria-label={k.difficulty(
                    Math.min(3, Math.max(1, Math.ceil(s.required.length / 2))),
                  )}
                >
                  {[1, 2, 3].map((star) => (
                    <span
                      aria-hidden="true"
                      key={star}
                      className={
                        star <=
                        Math.min(
                          3,
                          Math.max(1, Math.ceil(s.required.length / 2)),
                        )
                          ? "filled"
                          : ""
                      }
                    >
                      ★
                    </span>
                  ))}
                </span>
                <div className="kids-required-parts">
                  {s.required.map((type) => (
                    <span
                      key={type}
                      role="img"
                      aria-label={catalog[type].name}
                      title={catalog[type].name}
                    >
                      <PartView
                        type={type}
                        scale={Math.min(
                          36 / catalog[type].width,
                          36 / catalog[type].height,
                        )}
                        lazy
                      />
                    </span>
                  ))}
                </div>
                <Action
                  onClick={() => create(s.id)}
                  disabled={
                    !store || store.projects.length >= 20 || store.corrupt
                  }
                >
                  {k.start} →
                </Action>
              </Card>
            ))}
      </div>
    </div>
  );
}
