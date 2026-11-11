"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { lessons } from "@/domain/seed";
import type { LearningLesson as Lesson } from "@arduhub/arduino-core/lessons/content";
import {
  initialSteps,
  type Draft,
  type LearningStore,
} from "@/domain/projects/storage";
import { migrateScene } from "@arduhub/arduino-core/scene/migrate";
import { checkScene } from "@arduhub/arduino-core/scene/check";
import { codeIssue } from "@arduhub/arduino-core/lessons/codeChecks";
import {
  checkBehavior,
  type CheckResult,
} from "@arduhub/arduino-core/sim/checks";
import type { Trace } from "@arduhub/arduino-core/sim/runner";
import { lessonOpen, awardLesson } from "@/domain/progress/xp";
import {
  migrateLessonFlow,
  flowPercent,
  resolveStage,
  flowQuizResult,
  practiceAfterQuiz,
  type LessonStage,
  type FlowQuiz,
} from "@/domain/lessons/flow";
import { useProgress } from "@/lib/useProgress";
import { useLearningStore } from "@/lib/useLearningStore";
import { useLessonData } from "@/lib/useLessonData";
import { useStageGate } from "@/lib/useStageGate";
import { Action, Card, Modal } from "@/components/cabinet/ui";
import { openMentor } from "@/components/mentor/openMentor";
import { lessonFlowRu as c, learningRu } from "@/content/ru";
import { lessonExpected } from "@/content/dashboard.ru";
import LessonShell from "./LessonShell";
import LessonSkeleton, { Skeleton } from "./LessonSkeleton";
import StageIndicator from "./StageIndicator";
import StageTransition from "./StageTransition";
import VideoStage from "./stages/VideoStage";
import QuizStage from "./stages/QuizStage";
import PracticeStage from "./stages/PracticeStage";
import Link from "next/link";
import CompletionModal from "./CompletionModal";
import { catalog } from "@arduhub/arduino-core/parts/catalog";
import { computeStageState } from "@/domain/progress/courseState";
import {
  matchesSolution,
  recordCompileAttempt,
} from "@/domain/lessons/solutions";
import { compileRunRu } from "@arduhub/curriculum/compile-run.ru";
import { kidsWorkspaceRu as k, kidsMentorRu } from "@/content/ru";
import { useMentorNudge } from "@/lib/useMentorNudge";
import { playSfx } from "@/lib/sfx";
import HintIcon from "@/components/icons/HintIcon";
import Boxicon from "@/components/icons/Boxicon";
const Workspace = dynamic(() => import("@/components/workspace/Workspace"), {
  ssr: false,
  loading: () => <Skeleton shape="practice" />,
});
export default function LearningLesson({ id }: { id: string }) {
  const { progress, ready } = useProgress(),
    { store, mutate } = useLearningStore(),
    data = useLessonData(id);
  const legacy = lessons.find((l) => l.id === id);
  if (data.error || (data.lesson && !data.lesson.quiz?.questions.length))
    return (
      <LessonShell title={legacy?.title}>
        <div className="flow-load-error" role="alert">
          <h1>
            {typeof navigator !== "undefined" && !navigator.onLine
              ? c.offline
              : c.unavailable}
          </h1>
          <Action onClick={data.retry}>{c.retry}</Action>
        </div>
      </LessonShell>
    );
  if (data.loading || !ready || !store)
    return (
      <LessonShell title={legacy?.title} loading>
        <LessonSkeleton />
      </LessonShell>
    );
  if (!data.lesson || !legacy || !lessonOpen(progress, id))
    return (
      <LessonShell title={legacy?.title}>
        <Card>
          <h1>{legacy?.title ?? learningRu.notFound}</h1>
          <p>{c.lockedNote}</p>
          <Action href="/app">{c.back}</Action>
        </Card>
      </LessonShell>
    );
  return (
    <LessonFlow key={id} lesson={data.lesson} store={store} mutate={mutate} />
  );
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
  const { progress, update } = useProgress(),
    router = useRouter(),
    path = usePathname(),
    id = lesson.id,
    index = Number(id.split("-")[1]) - 1;
  const [draft, setDraft] = useState<Draft>(() => {
    const old = store.drafts[id] ?? {
      scene: progress.circuits[id]
        ? (migrateScene(progress.circuits[id]) ?? lesson.circuit.starterScene)
        : lesson.circuit.starterScene,
      code: lesson.code.starter,
      step: 0,
      steps: progress.lessons[id]?.steps ?? initialSteps(),
    };
    const saved = progress.lessons[id];
    const flow = migrateLessonFlow(
      (!old.flow || (saved?.flowUpdatedAt ?? "") > (old.updatedAt ?? "")) &&
        saved?.stages &&
        saved?.practice &&
        saved?.quiz
        ? {
            ...old,
            flow: {
              version: 2,
              stage: "video",
              stages: saved.stages,
              practice: saved.practice,
              quiz: saved.quiz,
              video: saved.video,
            },
          }
        : old,
      id,
    );
    return { ...old, flow };
  });
  const flow = {
      ...draft.flow!,
      stages: computeStageState(lesson, draft.flow!),
    },
    gate = useStageGate(flow);
  const nudge = useMentorNudge({
    stageKey: `${progress.account?.userId ?? "local"}:${id}:practice`,
    active: gate.active === "practice",
    enabled: progress.settings?.mentorHints !== false,
  });
  const [errors, setErrors] = useState<
      { message: string; componentIds: string[] }[]
    >([]),
    [report, setReport] = useState<CheckResult[]>([]),
    [notice, setNotice] = useState(""),
    [compileErrors, setCompileErrors] = useState<string[]>([]),
    [showTheory, setShowTheory] = useState(false),
    [showReference, setShowReference] = useState(false),
    [hint, setHint] = useState({ circuit: 0, code: 0 });
  const [complete, setComplete] = useState<null | {
    rewarded: boolean;
    halfReward?: boolean;
  }>(null);
  const [serverFailures, setServerFailures] = useState(0);
  const initialized = useRef(false);
  const save = useCallback(
    (next: Draft, xp = 0) => {
      const f = next.flow!;
      next = {
        ...next,
        updatedAt: new Date().toISOString(),
        step:
          f.stage === "video"
            ? 0
            : f.stage === "test"
              ? 5
              : f.tab === "code"
                ? 3
                : 2,
        steps: {
          video: f.stages.video,
          theory: f.stages.video,
          quiz: f.stages.test,
          circuit: f.practice.circuit,
          code: f.practice.code,
          run: f.practice.run,
        },
      };
      setDraft(next);
      mutate((s) => {
        s.drafts = { ...s.drafts, [id]: next };
        s.save();
      });
      update((p) => ({
        ...p,
        xp: p.xp + xp,
        lessons: {
          ...p.lessons,
          [id]: {
            ...p.lessons[id],
            ...(p.lessons[id].status === "done"
              ? {}
              : {
                  steps: next.steps,
                  flowUpdatedAt: next.updatedAt,
                  stages: f.stages,
                  practice: f.practice,
                  quiz: f.quiz,
                  video: f.video,
                }),
          },
        },
      }));
    },
    [id, mutate, update],
  );
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!initialized.current) {
        initialized.current = true;
        if (!store.drafts[id]?.flow) save(draft);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [draft, id, lesson.quiz, save, store]);
  function navigate(stage: LessonStage, next = flow) {
    const active = resolveStage(next, stage);
    save({ ...draft, flow: { ...next, stage: active } });
    router.replace(`${path}?stage=${active}`, { scroll: false });
  }
  const mentorContext = {
    lessonId: id,
    context: {
      step: c.stages[
        gate.active === "video" ? 0 : gate.active === "test" ? 1 : 2
      ],
      code: draft.code,
      scene: JSON.stringify(draft.scene),
      errors: [...errors.map((e) => e.message), ...compileErrors],
      level: progress.profile.level,
    },
  };
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("arduhub:mentor-context", { detail: mentorContext }),
    );
  });
  useEffect(
    () => () => {
      window.dispatchEvent(
        new CustomEvent("arduhub:mentor-context", { detail: {} }),
      );
    },
    [],
  );
  const ask = () => openMentor(mentorContext);
  const unlockVideo = (evidence: {
    confirmed?: boolean;
    watchedRatio?: number;
  }) => {
    if (!flow.stages.video)
      save({
        ...draft,
        flow: {
          ...flow,
          video: evidence,
          stages: { ...flow.stages, video: true },
        },
      });
  };
  function verify() {
    const found = checkScene(draft.scene, lesson.circuit.referenceScene);
    nudge.recordCheck(found.length === 0);
    playSfx(found.length ? "wrong" : "correct");
    setErrors(found);
    const issue = codeIssue(draft.code),
      code =
        flow.practice.code || (!issue && draft.code !== lesson.code.starter);
    save({
      ...draft,
      flow: {
        ...flow,
        stage: "practice",
        practice: { ...flow.practice, circuit: !found.length, code },
      },
    });
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
    setNotice(found.length ? "" : learningRu.circuitOk);
  }
  function run(trace: Trace) {
    const found = checkScene(draft.scene, lesson.circuit.referenceScene);
    setErrors(found);
    const button = draft.scene.components.find((p) => p.type === "button")?.id;
    const checks = lesson.run.checks.map((check) =>
      check.kind === "pinHighWhen" && button
        ? { ...check, input: { ...check.input, part: button } }
        : check,
    );
    const result = checkBehavior(checks, trace);
    setReport(result);
    const pass =
      !found.length && !codeIssue(draft.code) && result.every((r) => r.pass);
    nudge.recordCheck(pass);
    playSfx(pass ? "correct" : "wrong");
    save({
      ...draft,
      flow: {
        ...flow,
        stage: "practice",
        stages: { ...flow.stages, practice: pass },
        practice: {
          circuit: !found.length,
          code: !codeIssue(draft.code),
          run: pass,
        },
      },
    });
    if (pass) {
      const rewarded = !progress.lessons[id]?.rewarded;
      update((p) => awardLesson(p, id));
      if (rewarded) {
        try {
          sessionStorage.setItem("arduhub.lesson.completed", id);
        } catch {}
      }
      setComplete({ rewarded });
    }
  }
  function checkByExample() {
    if (serverFailures < 3 || !flow.stages.test) return;
    if (
      !matchesSolution(id, draft.code) ||
      checkScene(draft.scene, lesson.circuit.referenceScene).length
    ) {
      setNotice(compileRunRu.mismatch);
      return;
    }
    const rewarded = !progress.lessons[id]?.rewarded;
    const next = {
      ...draft,
      flow: {
        ...flow,
        stages: { ...flow.stages, practice: true },
        practice: { circuit: true, code: true, run: true },
      },
    };
    save(next);
    update((p) => awardLesson(p, id, "lesson_fallback"));
    setComplete({ rewarded, halfReward: true });
    setServerFailures(0);
  }
  const hintKind = flow.tab === "code" ? "code" : "circuit";
  const addHint = () => {
    playSfx("hint");
    setHint((h) => ({ ...h, [hintKind]: Math.min(3, h[hintKind] + 1) }));
  };
  const expected = lessonExpected[index] ?? lesson.task ?? "";
  function changeQuiz(quiz: FlowQuiz, passed: boolean, newAward?: string) {
    const valid =
      passed &&
      flowQuizResult(
        lesson.quiz?.questions ?? [],
        quiz,
        lesson.quiz?.passPercent,
      ).passed;
    save(
      {
        ...draft,
        flow: {
          ...flow,
          stage: "test",
          quiz,
          stages: { ...flow.stages, test: flow.stages.test || valid },
        },
      },
      newAward ? 1 : 0,
    );
  }
  return (
    <LessonShell
      title={lesson.title}
      progress={flowPercent(flow)}
      indicator={
        <StageIndicator
          lesson={lesson}
          flow={flow}
          active={gate.active}
          onStage={(stage) => navigate(stage)}
        />
      }
      onVideo={() => navigate("video")}
      onReference={() => setShowReference(true)}
      nudge={
        nudge.visible ? (
          <aside className="kids-mentor-nudge" role="status">
            <button className="kids-nudge-open" onClick={ask}>
              {kidsMentorRu.nudge}
            </button>
            <button
              className="cab-icon-btn"
              aria-label={kidsMentorRu.dismissNudge}
              onClick={nudge.dismiss}
            >
              <Boxicon name="close" />
            </button>
          </aside>
        ) : undefined
      }
    >
      {store.unavailable && (
        <p className="l2-error" role="alert">
          {learningRu.unsaved}
        </p>
      )}
      {store.corrupt && (
        <Card>
          <p>{learningRu.corrupt}</p>
          <Action secondary onClick={() => mutate((s) => s.reset())}>
            {learningRu.reset}
          </Action>
        </Card>
      )}
      <StageTransition stage={gate.active}>
        {gate.active === "video" && (
          <VideoStage
            lesson={lesson}
            completed={flow.stages.video}
            onUnlock={unlockVideo}
            onContinue={() =>
              navigate(lesson.quiz?.questions.length ? "test" : "practice", {
                ...flow,
                stages: { ...flow.stages, video: true },
              })
            }
          />
        )}
        {gate.active === "test" && (
          <QuizStage
            lessonId={lesson.id}
            questions={lesson.quiz?.questions ?? []}
            passPercent={lesson.quiz?.passPercent}
            value={flow.quiz}
            onChange={changeQuiz}
            onContinue={() => {
              const next = practiceAfterQuiz(lesson, flow);
              if (next) navigate("practice", next);
            }}
          />
        )}
        {gate.active === "practice" && (
          <PracticeStage
            onActivity={nudge.recordActivity}
            lesson={lesson}
            flow={flow}
            expected={expected}
            onExplain={ask}
            onTheory={() => setShowTheory(true)}
            onHint={addHint}
            hint={
              hint[hintKind] > 0 ? (
                <>
                  <p>{lesson[hintKind].hints[hint[hintKind] - 1]}</p>
                  {hintKind === "code" && hint.code === 3 && (
                    <Action
                      secondary
                      onClick={() =>
                        save({
                          ...draft,
                          code: lesson.code.solution,
                          flow: {
                            ...flow,
                            practice: {
                              ...flow.practice,
                              code: true,
                              run: false,
                            },
                            stages: { ...flow.stages, practice: false },
                          },
                        })
                      }
                    >
                      {learningRu.hintStages[2]}
                    </Action>
                  )}
                </>
              ) : undefined
            }
            notice={notice}
            errors={errors}
            report={report}
          >
            <Workspace
              practiceMode
              scene={draft.scene}
              code={draft.code}
              initialTab={flow.tab ?? (draft.step === 3 ? "code" : "circuit")}
              onTabChange={(tab) => save({ ...draft, flow: { ...flow, tab } })}
              allowedParts={lesson.circuit.allowedParts}
              durationMs={lesson.run.durationMs}
              autoButton={
                lesson.run.autoButton
                  ? draft.scene.components.find((p) => p.type === "button")?.id
                  : undefined
              }
              errors={errors.flatMap((e) => e.componentIds)}
              onDiagnostics={setCompileErrors}
              onCompileResult={(result) =>
                setServerFailures((n) => recordCompileAttempt(n, result))
              }
              onRun={run}
              actions={
                <>
                  <Action secondary onClick={verify}>
                    {k.check}
                  </Action>
                  <Action
                    secondary
                    onClick={addHint}
                    disabled={hint[hintKind] >= 3}
                    aria-label={`${k.hint}: ${k.hintsLeft} ${Math.max(0, 3 - hint[hintKind])}`}
                  >
                    <HintIcon />
                    {k.hint} {Math.max(0, 3 - hint[hintKind])}
                  </Action>
                  <Action secondary onClick={ask}>
                    {k.ask}
                  </Action>
                  {serverFailures >= 3 && (
                    <div role="status">
                      <p>{compileRunRu.fallbackNote}</p>
                      <Action secondary onClick={checkByExample}>
                        {compileRunRu.fallback}
                      </Action>
                    </div>
                  )}
                </>
              }
              onScene={(scene) => {
                const changed =
                  JSON.stringify([scene.components, scene.wires]) !==
                  JSON.stringify([draft.scene.components, draft.scene.wires]);
                if (changed) {
                  setReport([]);
                  setErrors([]);
                  setNotice(learningRu.recheck);
                }
                save({
                  ...draft,
                  scene,
                  flow: changed
                    ? {
                        ...flow,
                        stages: { ...flow.stages, practice: false },
                        practice: {
                          ...flow.practice,
                          circuit: false,
                          run: false,
                        },
                      }
                    : flow,
                });
              }}
              onCode={(code) => {
                setReport([]);
                save({
                  ...draft,
                  code,
                  flow: {
                    ...flow,
                    stages: { ...flow.stages, practice: false },
                    practice: {
                      ...flow.practice,
                      code: !codeIssue(code),
                      run: false,
                    },
                  },
                });
              }}
            />
          </PracticeStage>
        )}
      </StageTransition>
      {showTheory && (
        <Modal title={c.summary} onClose={() => setShowTheory(false)}>
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
      {showReference && (
        <Modal title={c.reference} onClose={() => setShowReference(false)}>
          <Link className="cab-btn" href="/app/practice?tab=glossary">
            {c.detailsLink}
          </Link>
          <ul>
            {lesson.circuit.allowedParts.map((part) => (
              <li key={part}>{catalog[part]?.name ?? part}</li>
            ))}
          </ul>
        </Modal>
      )}
      {complete && (
        <CompletionModal
          rewarded={complete.rewarded}
          halfReward={complete.halfReward}
          nextId={
            lessons.find(
              (l) =>
                l.id !== id &&
                progress.lessons[l.id]?.status !== "done" &&
                lessonOpen(progress, l.id),
            )?.id
          }
          onClose={() => setComplete(null)}
        />
      )}
    </LessonShell>
  );
}
