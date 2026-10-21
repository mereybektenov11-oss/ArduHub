"use client";
import { useEffect, useRef, useState } from "react";
import { useProgress } from "@/lib/useProgress";
import { mentors, lessons } from "@/domain/seed";
import { errorCopy } from "@/domain/checker/errors.ru";
import type { CheckError, ErrorCode } from "@/domain/types";
import { askMentor } from "@/services/mentor/client";
import { mentorCopy as c } from "@/content/cabinet.ru";
import CabinetArt, { type ArtName } from "./CabinetArt";
import { Action, Pill, Card } from "./ui";
import MentorCode from "./MentorCode";
import { polishRu as ui } from "@/content/ru";
export default function MentorChat({
  lessonId,
  errorCode,
  compact = false,
  context,
  initialPrompt = "",
  onMinimize,
}: {
  lessonId?: string;
  errorCode?: string;
  compact?: boolean;
  initialPrompt?: string;
  onMinimize?: () => void;
  context?: {
    step?: string;
    scene?: string;
    code?: string;
    errors?: string[];
    level?: number;
  };
}) {
  const { progress: p, update, refreshAccount } = useProgress();
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
      { role: "assistant", text: c.welcome },
    ]),
    [input, setInput] = useState(initialPrompt),
    [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(c.templateMode);
  const [interrupted, setInterrupted] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null),
    logRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true),
    [failed, setFailed] = useState(false);
  const mentor = mentors.find((m) => m.id === p.mentor.selectedId)!;
  const storageKey = `arduhub.chat.${p.account?.userId ?? "guest"}.${mentor.id}.general`;
  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!atBottom) return;
    const frame = requestAnimationFrame(() => {
      if (logRef.current)
        logRef.current.scrollTop = logRef.current.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, atBottom]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const data: unknown = JSON.parse(
          localStorage.getItem(storageKey) ?? "null",
        );
        setMessages(
          Array.isArray(data)
            ? data
                .filter(
                  (m) =>
                    m &&
                    ["user", "assistant"].includes(m.role) &&
                    typeof m.text === "string",
                )
                .slice(-24)
            : [{ role: "assistant", text: c.welcome }],
        );
      } catch {
        setMessages([{ role: "assistant", text: c.welcome }]);
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      controller.current?.abort();
    };
  }, [storageKey]);
  async function send(text = input) {
    if (!text.trim() || busy) return;
    const clean = text.replace(/<[^>]*>/g, "").slice(0, 500);
    setBusy(true);
    setFailed(false);
    setInterrupted(false);
    controller.current = new AbortController();
    const history = [...messages, { role: "user", text: clean }];
    setMessages(history);
    const contextualError =
      errorCode ??
      Object.keys(errorCopy).find((code) =>
        context?.errors?.includes(errorCopy[code as ErrorCode][0]),
      );
    const error =
      contextualError && Object.hasOwn(errorCopy, contextualError)
        ? ({
            code: contextualError as ErrorCode,
            hint1: errorCopy[contextualError as ErrorCode][1],
            hint2: errorCopy[contextualError as ErrorCode][2],
            answer: errorCopy[contextualError as ErrorCode][3],
            componentIds: [],
            severity: "error",
            message: errorCopy[contextualError as ErrorCode][0],
          } as CheckError)
        : undefined;
    const result = await askMentor(
      {
        mentorId: mentor.id,
        lessonId,
        errors: error ? [error] : [],
        message: clean,
        history: messages.slice(-10),
        mode:
          lessonId && text === c.quick[0]
            ? "explain_errors"
            : lessonId
              ? "lesson"
              : "project",
        context,
      },
      {
        signal: controller.current.signal,
        templateOnly: p.mentor.tokens <= 0,
        onDelta: (text) =>
          setMessages([...history, { role: "assistant", text }]),
      },
    );
    const next = result.reply
      ? [...history, { role: "assistant", text: result.reply }]
      : history;
    setMessages(next);
    setInterrupted(!!result.interrupted);
    setFailed(result.fallback && !result.interrupted);
    if (!result.fallback && !result.interrupted) setInput("");
    try {
      localStorage.setItem(storageKey, JSON.stringify(next.slice(-24)));
    } catch {}
    if (!result.blocked) setMode(result.fallback ? c.templateMode : c.aiMode);
    if (!result.blocked)
      update((prev) => ({
        ...prev,
        mentor: {
          ...prev.mentor,
          tokens: Math.max(0, prev.mentor.tokens - (result.tokensUsed ?? 0)),
        },
      }));
    if (p.account?.userId) await refreshAccount();
    setBusy(false);
  }
  return (
    <Card className={`cab-chat ${compact ? "cab-chat-compact" : ""}`}>
      <div className="cab-row polish-chat-header">
        <div className="polish-chat-identity">
          <CabinetArt name={mentor.id as ArtName} alt={mentor.name} size={48} />
          <div>
            <h2>{mentor.name}</h2>
            <span className="cab-small cab-muted polish-chat-mode">{mode}</span>
            <small>{ui.teachingMentor}</small>
          </div>
        </div>
        <Pill>
          {p.mentor.tokens} {c.tokens}
        </Pill>
        <label>
          <span className="sr-only">{ui.chooseMentor}</span>
          <select
            aria-label={ui.chooseMentor}
            disabled={busy}
            value={mentor.id}
            onChange={(e) =>
              update((prev) => ({
                ...prev,
                mentor: { ...prev.mentor, selectedId: e.target.value },
              }))
            }
          >
            {mentors.map((m) => (
              <option
                key={m.id}
                value={m.id}
                disabled={!p.mentor.unlockedIds.includes(m.id)}
              >
                {m.name}
              </option>
            ))}
          </select>
        </label>
        {onMinimize && (
          <button className="cab-btn" onClick={onMinimize}>
            {ui.minimize}
          </button>
        )}
      </div>
      {lessonId && (
        <p className="cab-small cab-muted">
          {lessons.find((l) => l.id === lessonId)?.title}
        </p>
      )}
      {context && (
        <p className="cab-small">
          {ui.context}:{" "}
          {[
            lessons.find((l) => l.id === lessonId)?.title ?? c.freeProject,
            context.step,
            context.scene?.split(";")[0],
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      <div
        ref={logRef}
        onScroll={() => {
          const el = logRef.current;
          if (el)
            setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
        }}
        className="cab-chat-log"
        role="log"
        aria-label={c.history}
        tabIndex={0}
      >
        {messages.map((m, i) => (
          <div key={i} className={`cab-chat-${m.role}`}>
            {m.role === "assistant" && (
              <CabinetArt name={mentor.id as ArtName} alt="" size={28} />
            )}
            <span>{m.role === "user" ? c.you : mentor.name}</span>
            {m.text
              .split(/(```[\s\S]*?```)/g)
              .map((block, j) =>
                block.startsWith("```") ? (
                  <MentorCode key={j} text={block} />
                ) : (
                  <p key={j}>{block}</p>
                ),
              )}
          </div>
        ))}
        {busy && <p role="status">{c.typing}</p>}
      </div>
      {!atBottom && (
        <Action
          secondary
          onClick={() => {
            logRef.current?.scrollTo({
              top: logRef.current.scrollHeight,
              behavior: "smooth",
            });
            setAtBottom(true);
          }}
        >
          {ui.down}
        </Action>
      )}
      {p.mentor.tokens <= 0 && <p role="status">{ui.noTokens}</p>}
      {failed && (
        <div role="status">
          <p>{c.templateMode}</p>
          <Action
            secondary
            onClick={() =>
              void send(
                input || messages.findLast((m) => m.role === "user")?.text,
              )
            }
          >
            {ui.retry}
          </Action>
        </div>
      )}
      <div className="cab-row polish-chat-quick">
        {c.quick.map((text) => (
          <Action
            key={text}
            secondary
            disabled={busy}
            onClick={() => void send(text)}
          >
            {text}
          </Action>
        ))}
      </div>
      {busy && (
        <Action secondary onClick={() => controller.current?.abort()}>
          {c.stopReply}
        </Action>
      )}
      {interrupted && (
        <Action secondary onClick={() => void send(c.continueReply)}>
          {c.continueReply}
        </Action>
      )}
      {errorCode && messages.length === 1 && (
        <Action secondary onClick={() => send(c.explain)}>
          {c.explain}
        </Action>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label
          htmlFor={compact ? "quick-message" : "mentor-message"}
          className="sr-only"
        >
          {c.question}
        </label>
        <textarea
          ref={inputRef}
          id={compact ? "quick-message" : "mentor-message"}
          value={input}
          maxLength={500}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 130) + "px";
          }}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={c.placeholder}
          rows={1}
        />
        <Action type="submit" disabled={busy || !input.trim()}>
          {c.send} ↑
        </Action>
      </form>
      <details className="polish-chat-notes cab-small cab-muted">
        <summary>{ui.aboutMentor}</summary>
        <p>{c.demoNote}</p>
        <p>{c.noPersonalData}</p>
      </details>
    </Card>
  );
}
