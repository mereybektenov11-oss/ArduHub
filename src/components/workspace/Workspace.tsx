"use client";
import { polishRu } from "@/content/ru";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { dashboardRu as d } from "@/content/dashboard.ru";
import { learningRu as c } from "@arduhub/curriculum/learning.ru";
import {
  catalog,
  partTypes,
  type PartType,
} from "@arduhub/arduino-core/parts/catalog";
import { makePart, type SceneDoc } from "@arduhub/arduino-core/scene/scene";
import { shorted } from "@arduhub/arduino-core/scene/netlist";
import { codeIssue } from "@arduhub/arduino-core/lessons/codeChecks";
import { compile, type CompileResult } from "@/services/compile/client";
import { compileRunRu } from "@arduhub/curriculum/compile-run.ru";
import type { Diagnostic } from "@/services/compile/explain";
import type { Sample, Trace } from "@arduhub/arduino-core/sim/runner";
import {
  outputLevels,
  buzzerFrequency,
} from "@arduhub/arduino-core/sim/glue/outputs";
import { Action } from "@/components/cabinet/ui";
import Canvas from "./Canvas";
import Palette from "./Palette";
import InputControls from "./InputControls";
import { projectCopy } from "@/content/projects.ru";
import { freePosition, snap } from "@arduhub/arduino-core/scene/placement";
import { useProgress } from "@/lib/useProgress";
import { askMentor } from "@/services/mentor/client";
import { kidsWorkspaceRu as k } from "@/content/kids-workspace.ru";
import { playSfx } from "@/lib/sfx";
import Boxicon from "@/components/icons/Boxicon";
const CodePanel = dynamic(() => import("./CodePanel"), {
  ssr: false,
  loading: () => <p>{c.code}…</p>,
});
type Props = {
  onCompileResult?: (result: CompileResult) => void;
  practiceMode?: boolean;
  onTabChange?: (tab: "circuit" | "code" | "serial") => void;
  tests?: ReactNode;
  solution?: string;
  actions?: ReactNode;
  scene: SceneDoc;
  code: string;
  onScene: (s: SceneDoc) => void;
  onCode: (code: string) => void;
  allowedParts?: PartType[];
  initialTab?: "circuit" | "code" | "serial";
  durationMs?: number;
  autoButton?: string;
  onRun?: (trace: Trace) => void;
  onInvalidate?: () => void;
  errors?: string[];
  canRun?: boolean;
  onDiagnostics?: (errors: string[]) => void;
};
export default function Workspace({
  onCompileResult,
  practiceMode = false,
  onTabChange,
  scene,
  code,
  onScene,
  onCode,
  allowedParts = partTypes,
  initialTab = "circuit",
  durationMs = 0,
  autoButton,
  onRun,
  onInvalidate,
  errors = [],
  canRun = true,
  onDiagnostics,
  tests,
  solution,
  actions,
}: Props) {
  const { progress, update } = useProgress();
  const [explanation, setExplanation] = useState(""),
    [explaining, setExplaining] = useState(false);
  async function explainError() {
    if (explaining || !diagnostics.length || progress.mentor.tokens <= 0)
      return;
    setExplaining(true);
    const result = await askMentor({
      mentorId: progress.mentor.selectedId,
      mode: "compile_error",
      context: { code, errors: diagnostics.map((d) => d.message) },
      message: diagnostics
        .map((d) => `${d.line}:${d.col} ${d.message}`)
        .join("\n")
        .slice(0, 500),
    });
    setExplanation(result.reply);
    if (!result.blocked)
      update((p) => ({
        ...p,
        mentor: {
          ...p.mentor,
          tokens: Math.max(0, p.mentor.tokens - (result.tokensUsed ?? 0)),
        },
      }));
    setExplaining(false);
  }
  const [tab, setTab] = useState<
      "circuit" | "code" | "serial" | "tests" | "solution"
    >(initialTab),
    [selected, setSelected] = useState<string | null>(null),
    [color, setColor] = useState("#c58320"),
    [message, setMessage] = useState(""),
    [status, setStatus] = useState<"idle" | "compiling" | "running" | "paused">(
      "idle",
    ),
    [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]),
    [serial, setSerial] = useState(""),
    [sample, setSample] = useState<Sample | null>(null),
    [source, setSource] = useState(""),
    [audioMuted, setAudioMuted] = useState(false);
  const [previousInitialTab, setPreviousInitialTab] = useState(initialTab);
  if (previousInitialTab !== initialTab) {
    setPreviousInitialTab(initialTab);
    setTab(initialTab);
  }
  const worker = useRef<Worker | null>(null),
    generation = useRef(0),
    history = useRef<SceneDoc[]>([]),
    future = useRef<SceneDoc[]>([]),
    lastTrace = useRef<Trace | null>(null),
    [version, setVersion] = useState(0),
    [historyCounts, setHistoryCounts] = useState({ undo: 0, redo: 0 }),
    [inputStates, setInputStates] = useState<Record<string, number>>({});
  const callback = useRef(onRun),
    muted = useRef(false),
    sound = useRef<AudioContext | null>(null),
    oscillator = useRef<OscillatorNode | null>(null);
  useEffect(() => {
    callback.current = onRun;
  }, [onRun]);
  function stop() {
    generation.current++;
    worker.current?.terminate();
    worker.current = null;
    oscillator.current?.stop();
    oscillator.current = null;
    if (sound.current) {
      void sound.current.close();
      sound.current = null;
    }
    setStatus("idle");
    setSample(null);
  }
  useEffect(
    () => () => {
      generation.current++;
      worker.current?.terminate();
      oscillator.current?.stop();
      void sound.current?.close();
    },
    [],
  );
  useEffect(() => {
    const visibility = () => {
      if (worker.current) {
        worker.current.postMessage({ type: "pause", value: document.hidden });
        setStatus(document.hidden ? "paused" : "running");
        if (document.hidden) void sound.current?.suspend();
        else if (!muted.current) void sound.current?.resume();
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  const change = (next: SceneDoc, record = true) => {
    stop();
    setMessage("");
    onInvalidate?.();
    if (record) {
      history.current = [...history.current.slice(-49), scene];
      future.current = [];
    }
    setVersion((n) => n + 1);
    setHistoryCounts({
      undo: history.current.length,
      redo: future.current.length,
    });
    onScene(next);
  };
  function undo() {
    const next = history.current.pop();
    if (next) {
      future.current.push(scene);
      change(next, false);
    }
  }
  function redo() {
    const next = future.current.pop();
    if (next) {
      history.current.push(scene);
      change(next, false);
    }
  }
  function remove() {
    if (!selected) return;
    change({
      ...scene,
      components: scene.components.filter((p) => p.id !== selected),
      wires: scene.wires.filter(
        (w) =>
          w.id !== selected &&
          w.from.componentId !== selected &&
          w.to.componentId !== selected,
      ),
    });
    setSelected(null);
  }
  async function run() {
    if (status !== "idle" || !canRun) return;
    playSfx("run_start");
    const issue = codeIssue(code);
    if (issue) {
      onCompileResult?.({ error: "compile_error" });
      setMessage(issue);
      setTab("code");
      return;
    }
    if (scene.components.filter((c) => c.type === "uno").length !== 1) {
      setMessage(c.checks.noUno);
      return;
    }
    if (shorted(scene)) {
      setMessage(c.checks.short);
      return;
    }
    const current = ++generation.current;
    setDiagnostics([]);
    onDiagnostics?.([]);
    setMessage("");
    setSource("");
    setSerial("");
    setSample(null);
    setStatus("compiling");
    const result = await compile(code);
    if (current !== generation.current) return;
    onCompileResult?.(result);
    if (!result.hex && result.interpreterCode === undefined) {
      setStatus("idle");
      setDiagnostics(result.diagnostics ?? []);
      onDiagnostics?.(
        (result.diagnostics ?? []).map((d) => `${d.line}: ${d.message}`),
      );
      setMessage(
        result.error === "code_too_large"
          ? c.size
          : result.error === "rate_limited"
            ? c.limited
            : result.error === "forbidden_header"
              ? c.compilerPolicy
              : result.error === "compile_error"
                ? c.compileFailed
                : compileRunRu.unavailable,
      );
      if (result.diagnostics?.length) setTab("code");
      return;
    }
    setSource(result.source === "service" ? c.compiled : c.cached);
    if (scene.components.some((p) => !catalog[p.type].simulated))
      setMessage(c.unsupported);
    try {
      const next = new Worker(
        new URL("../../domain/sim/worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current = next;
      if (
        progress.settings?.sounds !== false &&
        scene.components.some((p) => p.type === "buzzer")
      ) {
        sound.current = new AudioContext();
        await sound.current.resume();
        if (muted.current) await sound.current.suspend();
      }
      next.onmessage = (
        event: MessageEvent<{
          type: string;
          sample: Sample;
          serial: string;
          trace: Trace;
        }>,
      ) => {
        if (current !== generation.current) return;
        const data = event.data;
        if (data.type === "frame") {
          setSample(data.sample);
          setSerial(data.serial);
          setInputStates(data.sample.inputs);
          const buzzer = scene.components.find((p) => p.type === "buzzer");
          if (buzzer && sound.current) {
            const output = outputLevels(scene, data.sample, data.sample.inputs)[
              buzzer.id
            ];
            const frequency = buzzerFrequency(
              scene,
              buzzer.id,
              data.sample,
              data.sample.inputs,
            );
            const active =
              typeof output === "number" && output > 0.01 && frequency > 0;
            if (active && !oscillator.current) {
              const tone = sound.current.createOscillator(),
                gain = sound.current.createGain();
              gain.gain.value = 0.03;
              tone.frequency.value = Math.max(20, Math.min(20000, frequency));
              tone.connect(gain);
              gain.connect(sound.current.destination);
              tone.start();
              oscillator.current = tone;
            }
            if (active && oscillator.current)
              oscillator.current.frequency.value = Math.max(
                20,
                Math.min(20000, frequency),
              );
            if (!active && oscillator.current) {
              oscillator.current.stop();
              oscillator.current = null;
            }
          }
        }
        if (data.type === "done") {
          lastTrace.current = data.trace;
          callback.current?.(data.trace);
          next.terminate();
          worker.current = null;
          setStatus("idle");
          oscillator.current?.stop();
          oscillator.current = null;
          void sound.current?.close();
          sound.current = null;
        }
        if (data.type === "error") {
          stop();
          setMessage(c.checks.worker);
        }
      };
      next.onerror = () => {
        stop();
        setMessage(c.checks.worker);
      };
      setStatus("running");
      next.postMessage({
        type: "start",
        hex: result.hex,
        interpreterCode: result.interpreterCode,
        scene,
        durationMs,
        autoButton,
        inputs: inputStates,
      });
      if (document.hidden) {
        next.postMessage({ type: "pause", value: true });
        setStatus("paused");
      }
    } catch {
      stop();
      setMessage(c.checks.worker);
    }
  }
  const input = (id: string, value: number) => {
    setInputStates((s) => ({ ...s, [id]: value }));
    worker.current?.postMessage({ type: "input", id, value });
  };
  const part = scene.components.find((p) => p.id === selected),
    levels = outputLevels(scene, sample, inputStates);
  const board = scene.components.find((p) => p.type === "uno");
  if (board) levels[board.id] = sample?.pwm[13] ? sample.pwm[13] / 255 : 0;
  const busy = status !== "idle";
  const visibleCenter = useRef({ x: 300, y: 220 });
  const updateView = useCallback((point: { x: number; y: number }) => {
    visibleCenter.current = point;
  }, []);
  function addPart(type: PartType, point?: { x: number; y: number }) {
    if (busy || scene.components.length >= 60 || (type === "uno" && board))
      return;
    const position = point
      ? { x: Math.max(20, snap(point.x)), y: Math.max(60, snap(point.y)) }
      : freePosition(scene, type, visibleCenter.current);
    const id = `${type}-${crypto.randomUUID()}`;
    change({
      ...scene,
      components: [
        ...scene.components,
        makePart(type, id, position.x, position.y),
      ],
    });
    setSelected(id);
    playSfx("part_drop");
  }
  return (
    <section
      className="l2-workspace"
      aria-label={c.workspace}
      data-history={version}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest(".cm-editor,input,textarea"))
          return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        }
        if (e.key === "Delete" && !busy) {
          e.preventDefault();
          remove();
        }
      }}
    >
      <div className="l2-workbar">
        <div className="cab-tabs" role="tablist" aria-label={c.workspace}>
          {(
            [
              "circuit",
              "code",
              "serial",
              ...(tests && !practiceMode
                ? ["tests" as const, "solution" as const]
                : []),
            ] as const
          ).map((t) => (
            <button
              role="tab"
              aria-selected={tab === t}
              key={t}
              onClick={() => {
                setTab(t);
                if (t === "circuit" || t === "code" || t === "serial")
                  onTabChange?.(t);
              }}
            >
              {t === "tests" ? d.tests : t === "solution" ? d.solution : c[t]}
            </button>
          ))}
        </div>
        <div className="cab-row">
          {
            <Action
              className={`kids-run-action ${status === "running" ? "g3-running" : ""}`}
              onClick={run}
              disabled={busy || !canRun}
              aria-label={status === "compiling" ? c.compiling : k.run}
            >
              <Boxicon name={busy ? "pause" : "play"} />{" "}
              {status === "compiling" ? c.compiling : k.run}
            </Action>
          }
          {actions}
          {busy && (
            <Action
              secondary
              onClick={() => {
                stop();
                setMessage(c.stopped);
              }}
            >
              {c.stop} <Boxicon name="stop" />
            </Action>
          )}
          {scene.components.some((p) => p.type === "buzzer") && (
            <button
              className="cab-btn cab-btn-secondary"
              aria-pressed={audioMuted}
              onClick={() => {
                muted.current = !muted.current;
                setAudioMuted(muted.current);
                if (muted.current) void sound.current?.suspend();
                else if (!document.hidden) void sound.current?.resume();
              }}
            >
              {audioMuted ? c.unmute : c.mute}
            </button>
          )}
        </div>
      </div>
      {tab === "circuit" && (
        <div className="kids-workspace-circuit">
          <aside className="kids-palette-panel">
            <Palette
              types={allowedParts}
              busy={busy}
              atLimit={scene.components.length >= 60}
              hasBoard={scene.components.some((p) => p.type === "uno")}
              onAdd={addPart}
            />
          </aside>
          <div className="kids-circuit-area">
            <Canvas
              tools={
                <>
                  <Action
                    secondary
                    onClick={undo}
                    disabled={busy || !historyCounts.undo}
                  >
                    {c.undo}
                  </Action>
                  <Action
                    secondary
                    onClick={redo}
                    disabled={busy || !historyCounts.redo}
                  >
                    {c.redo}
                  </Action>
                  <Action
                    secondary
                    onClick={remove}
                    disabled={busy || !selected}
                  >
                    {c.remove}
                  </Action>
                </>
              }
              wireOptions={
                <label>
                  {c.color}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      setColor(e.target.value);
                      if (scene.wires.some((w) => w.id === selected))
                        change({
                          ...scene,
                          wires: scene.wires.map((w) =>
                            w.id === selected
                              ? { ...w, color: e.target.value }
                              : w,
                          ),
                        });
                    }}
                  />
                </label>
              }
              onRemove={remove}
              onView={updateView}
              inputs={sample?.inputs ?? inputStates}
              devices={sample?.devices}
              onAdd={addPart}
              scene={scene}
              onChange={change}
              levels={levels}
              selected={selected}
              onSelect={setSelected}
              color={color}
              disabled={busy}
              errors={errors}
            />
            {part && (
              <div className="l2-properties">
                <strong>{catalog[part.type].name}</strong>
                {(part.type === "lcd" || part.type === "lcd2004") && (
                  <label>
                    {projectCopy.lcdInterface}
                    <select
                      aria-label={projectCopy.lcdInterface}
                      disabled={busy}
                      value={part.attrs.pins ?? "full"}
                      onChange={(e) =>
                        change({
                          ...scene,
                          components: scene.components.map((p) =>
                            p.id === part.id
                              ? {
                                  ...p,
                                  attrs: { ...p.attrs, pins: e.target.value },
                                }
                              : p,
                          ),
                          wires: scene.wires.filter(
                            (w) =>
                              w.from.componentId !== part.id &&
                              w.to.componentId !== part.id,
                          ),
                        })
                      }
                    >
                      <option value="full">{projectCopy.parallel}</option>
                      <option value="i2c">{projectCopy.i2c}</option>
                    </select>
                  </label>
                )}
                {part.type === "breadboard" && (
                  <p>{projectCopy.ownBreadboard}</p>
                )}
                <Action
                  secondary
                  disabled={busy}
                  onClick={() =>
                    change({
                      ...scene,
                      components: scene.components.map((p) =>
                        p.id === part.id
                          ? { ...p, rotation: (p.rotation + 90) % 360 }
                          : p,
                      ),
                    })
                  }
                >
                  {c.rotate}
                </Action>
                {part.type === "resistor" && (
                  <label>
                    {c.resistance}
                    <input
                      type="number"
                      min="1"
                      max="10000000"
                      value={Number(part.attrs.value ?? 220)}
                      disabled={busy}
                      onChange={(e) =>
                        change({
                          ...scene,
                          components: scene.components.map((p) =>
                            p.id === part.id
                              ? {
                                  ...p,
                                  attrs: {
                                    ...p.attrs,
                                    value: Math.max(
                                      1,
                                      Math.min(
                                        10000000,
                                        Number(e.target.value),
                                      ),
                                    ),
                                  },
                                }
                              : p,
                          ),
                        })
                      }
                    />
                  </label>
                )}
                {part.type === "led" && (
                  <label>
                    {c.color}
                    <input
                      type="color"
                      value={
                        String(part.attrs.color).startsWith("#")
                          ? String(part.attrs.color)
                          : "#ff0000"
                      }
                      disabled={busy}
                      onChange={(e) =>
                        change({
                          ...scene,
                          components: scene.components.map((p) =>
                            p.id === part.id
                              ? {
                                  ...p,
                                  attrs: { ...p.attrs, color: e.target.value },
                                }
                              : p,
                          ),
                        })
                      }
                    />
                  </label>
                )}
                {!catalog[part.type].simulated && (
                  <small>{c.appearanceOnly}</small>
                )}
              </div>
            )}
            <details className="l2-wire-list">
              <summary>
                {c.circuit} · {scene.wires.length}
              </summary>
              {scene.wires.map((w) => (
                <div className="cab-row" key={w.id}>
                  <span>
                    {w.from.componentId} {w.from.pin} → {w.to.componentId}{" "}
                    {w.to.pin}
                  </span>
                  <button
                    disabled={busy}
                    aria-label={`${c.remove} ${w.id}`}
                    onClick={() =>
                      change({
                        ...scene,
                        wires: scene.wires.filter((v) => v.id !== w.id),
                      })
                    }
                  >
                    {c.remove}
                  </button>
                </div>
              ))}
            </details>
          </div>
        </div>
      )}
      {tab === "code" && (
        <CodePanel
          value={code}
          diagnostics={diagnostics}
          onChange={(next) => {
            if (next === code) return;
            stop();
            setDiagnostics([]);
            onDiagnostics?.([]);
            onInvalidate?.();
            onCode(next);
          }}
        />
      )}
      {tab === "serial" && (
        <div className="l2-serial">
          <div className="cab-row">
            <strong>{c.serial}</strong>
            <Action secondary onClick={() => setSerial("")}>
              {c.clear}
            </Action>
          </div>
          <pre role="log" aria-label={c.serial}>
            {serial || c.noOutput}
          </pre>
        </div>
      )}
      {tab === "tests" && <div className="cab-card">{tests}</div>}
      {tab === "solution" && (
        <div className="cab-card">
          <p>{c.hintStages[2]}</p>
          {solution ? <pre>{solution}</pre> : <p>{c.hint} 3/3</p>}
        </div>
      )}
      <InputControls scene={scene} states={inputStates} onInput={input} />
      <div className="l2-run-status" role="status">
        <span className={busy ? "l2-active-dot" : ""} />
        {status === "compiling"
          ? polishRu.compiling
          : status === "running"
            ? c.running
            : status === "paused"
              ? c.paused
              : k.beforeRun}
        {sample && ` · ${(sample.time / 1000).toFixed(1)} ${c.seconds}`}
      </div>
      {source && <p className="l2-note">{source}</p>}
      {message && (
        <p className="l2-error" role="alert">
          {message}
        </p>
      )}
      {message === c.unavailable && (
        <Action secondary onClick={run} disabled={busy}>
          {c.retry}
        </Action>
      )}
      {!!diagnostics.length && (
        <Action
          secondary
          disabled={explaining || progress.mentor.tokens <= 0}
          onClick={explainError}
        >
          {c.review}
        </Action>
      )}
      {explanation && (
        <p className="l2-note" role="status">
          {explanation}
        </p>
      )}
      <p className="l2-note">{c.simplified}</p>
    </section>
  );
}
