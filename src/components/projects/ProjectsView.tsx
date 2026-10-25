"use client";
import { useState } from "react";
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
import { projectIdeas, ideaSupport } from "@/domain/projects/ideas";
import { projectCopy } from "@/content/projects.ru";
import { catalog } from "@/domain/parts/catalog";
import { exportProject } from "@/domain/projects/export";
export default function ProjectsView({
  initialTab = "mine",
}: {
  initialTab?: string;
}) {
  const { store, mutate } = useLearningStore(),
    router = useRouter(),
    [tab, setTab] = useState(initialTab),
    [message, setMessage] = useState("");
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
    if (added) router.push(`/app/projects/${project.id}`);
    else setMessage(c.limit);
  }
  return (
    <div className="cab-stack">
      <div className="cab-row">
        <div>
          <h1>{c.projects}</h1>
          <p className="cab-lead">{c.projectsIntro}</p>
        </div>
        <Action
          disabled={!store || store.projects.length >= 20 || store.corrupt}
          onClick={() => create()}
        >
          {c.newProject} +
        </Action>
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
          <label className="l2-import">
            {c.import}
            <input
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
          </label>
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
        <Card>
          <h2>{c.noProjects}</h2>
          <p>{c.noProjectsNote}</p>
          <Action secondary onClick={() => setTab("ideas")}>
            {c.ideas} →
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
                <p>
                  {projectCopy.required}:{" "}
                  {s.required.map((type) => catalog[type].name).join(", ")}
                </p>
                <p>{projectCopy[ideaSupport(s)]}</p>
                <Action
                  onClick={() => create(s.id)}
                  disabled={
                    !store || store.projects.length >= 20 || store.corrupt
                  }
                >
                  {c.newProject} →
                </Action>
              </Card>
            ))}
      </div>
    </div>
  );
}
