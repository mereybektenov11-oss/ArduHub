"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { learningRu as c } from "@/content/learning.ru";
import { useLearningStore } from "@/lib/useLearningStore";
import { useProgress } from "@/lib/useProgress";
import { thumbnail, type Project } from "@/domain/projects/storage";
import { Action, Card, Modal } from "@/components/cabinet/ui";
import { askMentor } from "@/services/mentor/client";
import { exportProject } from "@/domain/projects/export";
import MentorChat from "@/components/cabinet/MentorChat";
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
    const result = await askMentor({
      mentorId: progress.mentor.selectedId,
      mode: "project_review",
      message: project.idea || c.review,
      project: { scene: project.scene, code: project.code, observed },
    });
    setReply(result.reply);
    setFallback(result.fallback);
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
          <p className="cab-eyebrow">ARDUHUB LAB</p>
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
          {store.unavailable ? c.unsaved : c.saved}
        </p>
        <Action secondary onClick={() => exportProject(project)}>
          {c.export}
        </Action>
        <Action secondary onClick={() => setConfirm(true)}>
          {c.remove}
        </Action>
      </div>
      <Workspace
        onDiagnostics={setCompileErrors}
        scene={project.scene}
        code={project.code}
        onScene={(scene) => save({ scene })}
        onCode={(code) => save({ code })}
        onRun={() => setObserved(true)}
      />
      <Card>
        <div className="cab-row">
          <h2>{c.review}</h2>
          <Action
            secondary
            disabled={busy || progress.mentor.tokens <= 0}
            onClick={review}
          >
            {busy ? c.reviewBusy : c.review}
          </Action>
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
      </Card>
      <MentorChat
        context={{
          scene:
            `${project.scene.components.length} ${c.partsCount}; ` +
            project.scene.components
              .map((p) => `${p.id}:${p.type}`)
              .join(", ") +
            "; " +
            project.scene.wires
              .map(
                (w) =>
                  `${w.from.componentId}:${w.from.pin}>${w.to.componentId}:${w.to.pin}`,
              )
              .join(", "),
          code: project.code,
          errors: compileErrors,
          level: progress.profile.level,
        }}
      />
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
