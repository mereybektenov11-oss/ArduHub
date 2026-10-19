"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { browserSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { dashboardRu as d, lessonExpected } from "@/content/dashboard.ru";
import { Modal } from "@/components/cabinet/ui";
import { learningRu as c, lessonV2Copy } from "@/content/learning.ru";
import { lessons } from "@/domain/seed";
import {
  learningLessons,
  type LearningLesson as Lesson,
} from "@/domain/lessons/content";
import {
  initialSteps,
  type Draft,
  type StepState,
} from "@/domain/projects/storage";
import { migrateScene } from "@/domain/scene/migrate";
import { checkScene } from "@/domain/scene/check";
import { codeIssue } from "@/domain/lessons/codeChecks";
import { checkBehavior, type CheckResult } from "@/domain/sim/checks";
import type { Trace } from "@/domain/sim/runner";
import type { LearningStore } from "@/domain/projects/storage";
import { lessonOpen, awardLesson } from "@/domain/progress/xp";
import { useProgress } from "@/lib/useProgress";
import { useLearningStore } from "@/lib/useLearningStore";
import { Action, Card, Pill } from "@/components/cabinet/ui";
import LessonStepper from "./LessonStepper";
import LessonQuiz from "./LessonQuiz";
import { lessonQuizzes } from "@/content/lesson-quiz.ru";
import { prepareLessonDraft, canOpenLessonStep } from "@/domain/lessons/quiz";
import VideoStep from "./VideoStep";
import PartView from "@/components/workspace/PartView";
import MentorChat from "@/components/cabinet/MentorChat";
const Workspace = dynamic(() => import("@/components/workspace/Workspace"), {
  ssr: false,
  loading: () => <Card>{c.workspace}…</Card>,
});
export default function LearningLesson({ id }: { id: string }) {
  const { progress, ready } = useProgress(),
    { store, mutate } = useLearningStore();
  const lesson = learningLessons.find((l) => l.id === id),
    legacy = lessons.find((l) => l.id === id);
  if (!ready || !store) return <p>{c.workspace}…</p>;
  if (!legacy)
    return (
      <Card>
        <h1>{c.notFound}</h1>
        <Action href="/app/lessons">{c.backMap}</Action>
      </Card>
    );
  if (!lesson)
    return (
      <Card>
        <Pill>{c.prepare}</Pill>
        <h1>{legacy.title}</h1>
        <p>{c.prepareNote}</p>
        <Action href="/app/lesson/lesson-1">{lessons[0].title}</Action>
        <Action secondary href="/app/projects">
          {c.projects}
        </Action>
      </Card>
    );
  if (!lessonOpen(progress, id))
    return (
      <Card>
        <h1>{legacy.title}</h1>
        <p>{c.prepareNote}</p>
        <Action href="/app/map">{c.backMap}</Action>
      </Card>
    );
  return <LessonFlow key={id} lesson={lesson} store={store} mutate={mutate} />;
}
function LessonFlow({
  lesson,
  store,
  mutate,
}: {
  lesson: Lesson;
  store: LearningStore;
  mutate: (fn: (s: LearningStore) => void) => void;
}) {
  const router = useRouter();
  const [showHints, setShowHints] = useState(false);
  const [showTheory, setShowTheory] = useState(false),
    [showMentor, setShowMentor] = useState(false);
  const { progress, update, refreshAccount } = useProgress(),
    { id } = lesson,
    index = learningLessons.indexOf(lesson),
    copy = {
      title: lesson.title ?? lessonV2Copy[0].title,
      task: lesson.task ?? lessonV2Copy[0].task,
    },
    legacy = lessons.find((l) => l.id === id)!;
  const [extraHint, setExtraHint] = useState(-1),
    [hintBusy, setHintBusy] = useState(false);
  async function useExtraHint() {
    if (hintBusy || (progress.boosts?.hints ?? 0) < 1) return;
    setHintBusy(true);
    try {
      if (progress.account?.userId) {
        const client = browserSupabase();
        if (!client) return;
        const { error } = await client.rpc("consume_boost", { kind: "hint" });
        if (error) return;
        await refreshAccount();
      } else
        update((p) => ({
          ...p,
          boosts: {
            freeze: p.boosts?.freeze ?? 0,
            hints: Math.max(0, (p.boosts?.hints ?? 0) - 1),
          },
        }));
      setExtraHint((i) => (i + 1) % d.extraHints.length);
    } finally {
      setHintBusy(false);
    }
  }
  const [draft, setDraft] = useState<Draft>(() =>
    prepareLessonDraft(
      store.drafts[id] ?? {
        scene: progress.circuits[id]
          ? (migrateScene(progress.circuits[id]) ?? lesson.circuit.starterScene)
          : lesson.circuit.starterScene,
        code: lesson.code.starter,
        step: 0,
        steps: initialSteps(),
      },
    ),
  );
  const [errors, setErrors] = useState<
      { message: string; componentIds: string[] }[]
    >([]),
    [hint, setHint] = useState({ circuit: 0, code: 0 }),
    [report, setReport] = useState<CheckResult[]>([]),
    [notice, setNotice] = useState("");
  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  function save(next: Draft) {
    next = { ...next, updatedAt: new Date().toISOString() };
    setDraft(next);
    mutate((s) => {
      s.drafts = { ...s.drafts, [id]: next };
      s.save();
    });
    update((p) => ({
      ...p,
      lessons: { ...p.lessons, [id]: { ...p.lessons[id], steps: next.steps } },
    }));
  }
  function done(key: keyof StepState, step: number) {
    save({ ...draft, step, steps: { ...draft.steps, [key]: true } });
  }
  function verify() {
    const found = checkScene(draft.scene, lesson.circuit.referenceScene);
    setErrors(found);
    update((p) => ({
      ...p,
      lessons: {
        ...p.lessons,
        [id]: {
          ...p.lessons[id],
          attempts: p.lessons[id].attempts + 1,
          bestErrors: Math.min(p.lessons[id].bestErrors, found.length),
        },
      },
    }));
    if (!found.length) {
      setNotice(c.circuitOk);
      done("circuit", 3);
    } else setNotice("");
  }
  function run(trace: Trace) {
    const found = checkScene(draft.scene, lesson.circuit.referenceScene);
    setErrors(found);
    const buttonId = draft.scene.components.find(
      (c) => c.type === "button",
    )?.id;
    const checks = lesson.run.checks.map((check) =>
      check.kind === "pinHighWhen" && buttonId
        ? { ...check, input: { ...check.input, part: buttonId } }
        : check,
    );
    const result = checkBehavior(checks, trace);
    setReport(result);
    if (!found.length && result.every((r) => r.pass)) {
      save({
        ...draft,
        steps: { ...draft.steps, circuit: true, code: true, run: true },
      });
      update((p) => awardLesson(p, id));
    } else save({ ...draft, steps: { ...draft.steps, run: false } });
  }
  const circuitMode = draft.step === 2,
    codeMode = draft.step === 3,
    runMode = draft.step === 4;
  return (
    <div className="cab-stack l2-lesson">
      <div className="dash-focus-top" data-tour="lesson-header">
        <button
          className="cab-icon-btn"
          aria-label={d.back}
          onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push("/app");
          }}
        >
          ×
        </button>
        <span>{copy.title}</span>
        <span>
          ◆ {progress.sparks} · ϟ {progress.mentor.tokens}
        </span>
      </div>
      <nav className="dash-focus-tools" aria-label={d.theory}>
        <button aria-label={d.theory} onClick={() => setShowTheory(true)}>
          ▤
        </button>
        <button
          aria-label={d.hint}
          onClick={() => {
            setShowHints(true);
            setHint((h) => ({
              ...h,
              circuit: Math.min(3, h.circuit + 1),
              code: Math.min(3, h.code + 1),
            }));
          }}
        >
          ?
        </button>
        <button aria-label={d.askAI} onClick={() => setShowMentor(true)}>
          ϟ
        </button>
      </nav>
      <div className="cab-row">
        <div>
          <p className="cab-eyebrow">
            {c.workspace} · {index + 1}
          </p>
          <h1>{copy.title}</h1>
        </div>
        <div className="cab-row">
          <label className="l2-text-size">
            Аа
            <select
              aria-label={c.textSize}
              value={progress.settings?.textScale ?? 1}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  settings: {
                    ...p.settings,
                    textScale: Number(e.target.value) as 1 | 1.15 | 1.3,
                  },
                }))
              }
            >
              {([1, 1.15, 1.3] as const).map((scale, i) => (
                <option key={scale} value={scale}>
                  {c.textSizes[i]}
                </option>
              ))}
            </select>
          </label>
          <Pill>+{legacy.xp} XP</Pill>
        </div>
      </div>
      <LessonStepper
        step={draft.step}
        steps={draft.steps}
        onStep={(step) => {
          if (canOpenLessonStep(step, draft.steps)) save({ ...draft, step });
        }}
      />
      {store.unavailable && (
        <p className="l2-error" role="alert">
          {c.unsaved}
        </p>
      )}
      {store.corrupt && (
        <Card>
          <p>{c.corrupt}</p>
          <Action secondary onClick={() => mutate((s) => s.reset())}>
            {c.reset}
          </Action>
        </Card>
      )}
      {draft.step === 0 && (
        <div className="l2-step-content">
          <VideoStep lessonId={id} onDone={() => done("video", 1)} />
        </div>
      )}
      {draft.step === 1 && (
        <Card>
          <div className="l2-theory l2-step-content">
            {lesson.theory.map((block, i) => (
              <section key={block.title}>
                <div className="l2-theory-part">
                  <PartView
                    type={block.partType}
                    scale={Math.min(
                      0.8,
                      80 / (block.partType === "uno" ? 274 : 80),
                    )}
                  />
                </div>
                <h2>
                  <span className="l2-theory-number" aria-hidden="true">
                    {i + 1}
                  </span>
                  {block.title}
                </h2>
                <p>{block.text}</p>
              </section>
            ))}
            <Action onClick={() => done("theory", 5)}>{c.understood} →</Action>
          </div>
        </Card>
      )}
      {draft.step === 5 && (
        <LessonQuiz
          questions={lessonQuizzes[id]}
          value={draft.quiz}
          onChange={(quiz, passed) =>
            save({
              ...draft,
              quiz,
              steps: { ...draft.steps, quiz: draft.steps.quiz || passed },
            })
          }
          onContinue={() => {
            if (draft.steps.quiz) save({ ...draft, step: 2 });
          }}
        />
      )}
      {(circuitMode || codeMode || runMode) && (
        <div className="l2-lesson-layout">
          <div className="l2-lesson-guide">
            <Card>
              <Pill>{c.steps[draft.step]}</Pill>
              <h2>{copy.title}</h2>
              <p>{copy.task}</p>
              <div className="dash-guide-actions">
                <Action secondary onClick={() => setShowTheory(true)}>
                  {d.theory}
                </Action>
                <Action secondary onClick={() => setShowMentor(true)}>
                  {d.explain}
                </Action>
              </div>
              <section className="dash-expected">
                <h3>{d.expected}</h3>
                <p>{lessonExpected[index] ?? copy.task}</p>
              </section>
              <p className="l2-note">
                {store.unavailable ? c.unsaved : c.saved}
              </p>
              {(progress.boosts?.hints ?? 0) > 0 && (
                <Action secondary disabled={hintBusy} onClick={useExtraHint}>
                  {d.extraHint} · {progress.boosts?.hints}
                </Action>
              )}
              {extraHint >= 0 && <p role="status">{d.extraHints[extraHint]}</p>}

              {codeMode && (
                <>
                  <p>{lesson.code.mode === "fill" ? c.blanks : c.steps[3]}</p>
                  <Action
                    onClick={() => {
                      const issue = codeIssue(draft.code);
                      if (issue) setNotice(issue);
                      else {
                        setNotice("");
                        done("code", 4);
                      }
                    }}
                  >
                    {c.next} →
                  </Action>
                </>
              )}
              {runMode && (
                <p>
                  {c.steps[4]}: {c.run}
                </p>
              )}
            </Card>
            {(circuitMode || codeMode) && (
              <Card>
                <Action
                  secondary
                  disabled={hint[circuitMode ? "circuit" : "code"] >= 3}
                  onClick={() =>
                    setHint((h) => ({
                      ...h,
                      [circuitMode ? "circuit" : "code"]:
                        h[circuitMode ? "circuit" : "code"] + 1,
                    }))
                  }
                >
                  {c.hint}{" "}
                  {Math.min(3, hint[circuitMode ? "circuit" : "code"] + 1)}/3
                </Action>
                {hint[circuitMode ? "circuit" : "code"] > 0 && (
                  <>
                    <strong>
                      {c.hintStages[hint[circuitMode ? "circuit" : "code"] - 1]}
                    </strong>
                    <p>
                      {
                        (circuitMode
                          ? lesson.circuit.hints
                          : lesson.code.hints)[
                          hint[circuitMode ? "circuit" : "code"] - 1
                        ]
                      }
                    </p>
                    {codeMode && hint.code === 3 && (
                      <Action
                        secondary
                        onClick={() =>
                          save({ ...draft, code: lesson.code.solution })
                        }
                      >
                        {c.hintStages[2]} → {c.code}
                      </Action>
                    )}
                  </>
                )}
              </Card>
            )}
            {notice && (
              <p role="status" className="cab-card">
                {notice}
              </p>
            )}
            {errors.map((e, i) => (
              <p key={i} className="l2-error" role="alert">
                {e.message}
              </p>
            ))}
            {report.length > 0 && (
              <Card>
                {report.map((r, i) => (
                  <p key={i}>
                    {r.pass ? "✓" : "↻"} {r.message}
                  </p>
                ))}
              </Card>
            )}
          </div>
          <Workspace
            onDiagnostics={setCompileErrors}
            tests={
              report.length ? (
                <div className="cab-stack">
                  {report.map((r, i) => (
                    <p key={i}>
                      {r.pass ? "✓" : "↻"} {r.message}
                    </p>
                  ))}
                </div>
              ) : (
                <p>{lessonExpected[index]}</p>
              )
            }
            solution={hint.code >= 3 ? lesson.code.solution : undefined}
            actions={
              <>
                <Action secondary onClick={() => setShowMentor(true)}>
                  {d.askAI}
                </Action>
                <Action
                  secondary
                  onClick={() =>
                    setHint((h) => ({
                      ...h,
                      [circuitMode ? "circuit" : "code"]: Math.min(
                        3,
                        h[circuitMode ? "circuit" : "code"] + 1,
                      ),
                    }))
                  }
                >
                  {d.hint}
                </Action>
                <Action secondary onClick={verify}>
                  {c.check}
                </Action>
              </>
            }
            key={id}
            scene={draft.scene}
            code={draft.code}
            initialTab={circuitMode ? "circuit" : codeMode ? "code" : "circuit"}
            allowedParts={lesson.circuit.allowedParts}
            durationMs={lesson.run.durationMs}
            autoButton={
              lesson.run.autoButton
                ? draft.scene.components.find((c) => c.type === "button")?.id
                : undefined
            }
            errors={errors.flatMap((e) => e.componentIds)}
            canRun={true}
            onScene={(scene) => {
              setNotice(c.recheck);
              setReport([]);
              setErrors([]);
              save({
                ...draft,
                scene,
                step: 2,
                steps: { ...draft.steps, circuit: false, run: false },
              });
            }}
            onCode={(code) => {
              setReport([]);
              save({
                ...draft,
                code,
                steps: { ...draft.steps, code: false, run: false },
              });
            }}
            onRun={run}
          />
        </div>
      )}
      {draft.steps.run && (
        <Card className="cab-success">
          <h2>{c.success}</h2>
          <p>{c.reward}</p>
          <Action href={`/app/map/${legacy.levelId}`}>{c.backMap} →</Action>
        </Card>
      )}
      {showHints && (
        <Modal title={d.hint} onClose={() => setShowHints(false)}>
          <p>
            {lesson.circuit.hints[Math.max(0, Math.min(2, hint.circuit - 1))]}
          </p>
        </Modal>
      )}
      {showTheory && (
        <Modal title={d.theory} onClose={() => setShowTheory(false)}>
          <div className="l2-theory">
            {lesson.theory.map((block) => (
              <section key={block.title}>
                <h2>{block.title}</h2>
                <p>{block.text}</p>
              </section>
            ))}
          </div>
        </Modal>
      )}
      {showMentor && (
        <Modal title={d.askAI} onClose={() => setShowMentor(false)}>
          <MentorChat
            lessonId={id}
            context={{
              step: c.steps[draft.step],
              scene: `${draft.scene.components.length} ${c.partsCount}; ${draft.scene.components.map((p) => `${p.id}:${p.type}`).join(", ")}; ${draft.scene.wires.map((w) => `${w.from.componentId}:${w.from.pin}>${w.to.componentId}:${w.to.pin}`).join(", ")}`,
              code: draft.code,
              errors: [...errors.map((e) => e.message), ...compileErrors],
              level: progress.profile.level,
            }}
          />
        </Modal>
      )}
    </div>
  );
}
