"use client";
import { recordAchievementEvent } from "@/domain/achievements";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onboardingRu } from "@/content/ru";
import { learningRu as c } from "@arduhub/curriculum/learning.ru";
import { useLearningStore } from "@/lib/useLearningStore";
import { useProgress } from "@/lib/useProgress";
import { thumbnail, type Project } from "@/domain/projects/storage";
import { Action, Card, Modal } from "@/components/cabinet/ui";
import { askMentor } from "@/services/mentor/client";
import { exportProject } from "@/domain/projects/export";
import { openMentor } from "@/components/mentor/openMentor";
import { kidsMentorRu } from "@/content/kids-mentor.ru";
import { reviewSections } from "@/services/mentor/review";
const Workspace = dynamic(() => import("@/components/workspace/Workspace"), {
  ssr: false,
  loading: () => <p>{c.workspace}…</p>,
});
export default function ProjectWorkspace({ id }: { id: string }) {
  const { store, mutate } = useLearningStore(),
    { progress, update } = useProgress(),
    router = useRouter(),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [reply, setReply] = useState(""),
    [fallback, setFallback] = useState(false),
    [observed, setObserved] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  useEffect(() => {
    if (!savedAt) return;
    const timer = setTimeout(() => setSavedAt(0), 1000);
    return () => clearTimeout(timer);
  }, [savedAt]);
  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  const project = store?.projects.find((p) => p.id === id);
  if (!store) return <p>{c.workspace}…</p>;
  if (!project)
    return (
      <Card>
        <h1>{c.notFound}</h1>
        <Action href="/app/projects">{c.backProjects}</Action>
      </Card>
    );
  const save = (patch: Partial<Project>) => {
    setSavedAt(Date.now());
    setObserved(false);
    setReply("");
    mutate((s) => {
      const current = s.projects.find((p) => p.id === id);
      if (current) {
        const next = {
          ...current,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        next.thumbnailSvg = thumbnail(next.scene);
        s.replace(next);
      }
    });
  };
  async function review() {
    if (!project || busy || progress.mentor.tokens <= 0) return;
    setBusy(true);
    setReviewOpen(true);
    const result = await askMentor({
      mentorId: progress.mentor.selectedId,
      mode: "project_review",
      message: project.idea || c.review,
      project: { scene: project.scene, code: project.code, observed },
    });
    setReply(result.reply);
    setFallback(result.fallback);
    if (
      result.reply &&
      !result.fallback &&
      !result.blocked &&
      !result.interrupted
    )
      update((p) =>
        recordAchievementEvent(p, { kind: "mentor", id: crypto.randomUUID() }),
      );
    if (!result.blocked)
      update((p) => ({
        ...p,
        mentor: {
          ...p.mentor,
          tokens: Math.max(0, p.mentor.tokens - (result.tokensUsed ?? 0)),
        },
      }));
    setBusy(false);
  }
  return (
    <div className="cab-stack">
      <div className="cab-row">
        <div>
          <h1>{project.title}</h1>
        </div>
        <Action secondary href="/app/projects" prefetch={false}>
          ← {c.backProjects}
        </Action>
      </div>
      <div className="l2-project-meta">
        <label>
          {c.title}
          <input
            value={project.title}
            maxLength={100}
            onChange={(e) => save({ title: e.target.value || c.untitled })}
          />
        </label>
        <label>
          {c.idea}
          <textarea
            value={project.idea}
            maxLength={1000}
            onChange={(e) => save({ idea: e.target.value })}
          />
        </label>
      </div>
      <div className="cab-row">
        <p className={store.unavailable ? "l2-error" : "l2-note"} role="status">
          {store.unavailable ? c.unsaved : savedAt > 0 ? c.saved : ""}
        </p>
        <details className="project-actions">
          <summary
            className="cab-icon-btn"
            aria-label={onboardingRu.projectMenu}
          >
            ⋯
          </summary>
          <Action secondary onClick={() => exportProject(project)}>
            {c.export}
          </Action>
          <Action secondary onClick={() => setConfirm(true)}>
            {c.remove}
          </Action>
        </details>
      </div>
      <Workspace
        onDiagnostics={setCompileErrors}
        scene={project.scene}
        code={project.code}
        onScene={(scene) => save({ scene })}
        onCode={(code) => save({ code })}
        onRun={() => setObserved(true)}
        actions={
          <div className="cab-row kids-mentor-project-actions">
            <Action
              secondary
              onClick={() =>
                openMentor({
                  context: {
                    scene:
                      project.scene.components
                        .map((part) => `${part.id}:${part.type}`)
                        .join(", ") +
                      "; " +
                      project.scene.wires
                        .map(
                          (wire) =>
                            `${wire.from.componentId}:${wire.from.pin}>${wire.to.componentId}:${wire.to.pin}`,
                        )
                        .join(", "),
                    code: project.code,
                    errors: compileErrors,
                    level: progress.profile.level,
                  },
                })
              }
            >
              {kidsMentorRu.ask}
            </Action>
            <Action
              secondary
              disabled={busy || progress.mentor.tokens <= 0}
              onClick={review}
            >
              {kidsMentorRu.review}
            </Action>
          </div>
        }
      />
      {reviewOpen && (
        <Modal title={kidsMentorRu.review} onClose={() => setReviewOpen(false)}>
          <div className="cab-row">
            {busy && <p role="status">{c.reviewBusy}</p>}
          </div>
          {fallback && <p className="l2-note">{c.reviewTemplate}</p>}
          {reply && (
            <div role="status" className="l2-project-review">
              {reviewSections(reply).map((section) => (
                <section key={section.title}>
                  <h3>{section.title}</h3>
                  <p>{section.text}</p>
                </section>
              ))}
            </div>
          )}
        </Modal>
      )}
      {confirm && (
        <Modal title={c.deleteConfirm} onClose={() => setConfirm(false)}>
          <p>{c.deleteNote}</p>
          <div className="cab-row">
            <Action secondary onClick={() => setConfirm(false)}>
              {c.cancel}
            </Action>
            <Action
              onClick={() => {
                mutate((s) => s.remove(id));
                router.push("/app/projects");
              }}
            >
              {c.remove}
            </Action>
          </div>
        </Modal>
      )}
    </div>
  );
}
