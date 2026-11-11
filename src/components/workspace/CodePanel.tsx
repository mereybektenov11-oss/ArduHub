"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { polishRu } from "@/content/ru";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { cpp } from "@codemirror/legacy-modes/mode/clike";
import { linter, lintGutter, setDiagnostics } from "@codemirror/lint";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  StreamLanguage,
} from "@codemirror/language";
import { explain, type Diagnostic } from "@/services/compile/explain";
import { learningRu as c } from "@arduhub/curriculum/learning.ru";
import { kidsWorkspaceRu as k } from "@/content/kids-workspace.ru";
import SettingsIcon from "@/components/icons/SettingsIcon";
export default function CodePanel({
  value,
  onChange,
  diagnostics = [],
}: {
  value: string;
  onChange: (code: string) => void;
  diagnostics?: Diagnostic[];
}) {
  const [tooLarge, setTooLarge] = useState(false);
  const [codeFontSize, setCodeFontSize] = useState(14);
  const root = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null),
    callback = useRef(onChange),
    initial = useRef(value),
    errors = useRef(diagnostics);
  useEffect(() => {
    callback.current = onChange;
  }, [onChange]);
  useEffect(() => {
    if (!root.current) return;
    const editor = new EditorView({
      parent: root.current,
      state: EditorState.create({
        doc: initial.current,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          StreamLanguage.define(cpp),
          syntaxHighlighting(defaultHighlightStyle),
          EditorState.transactionFilter.of((tr) => {
            const large =
              new TextEncoder().encode(tr.newDoc.toString()).length > 16384;
            setTooLarge(large);
            return large ? [] : tr;
          }),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({
            "aria-label": c.code,
            spellcheck: "false",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged)
              callback.current(update.state.doc.toString());
          }),
          lintGutter(),
          linter((v) =>
            errors.current.map((d) => {
              const line = v.state.doc.line(
                Math.min(v.state.doc.lines, Math.max(1, d.line)),
              );
              return {
                from: line.from,
                to: line.to,
                severity: "error" as const,
                message: explain(d.message),
              };
            }),
          ),
          EditorView.theme({
            "&": {
              fontSize: "var(--code-font-size, var(--lesson-code, 14px))",
              backgroundColor: "var(--white)",
              color: "var(--text-dark)",
            },
            ".cm-content": { minHeight: "280px", fontFamily: "monospace" },
            ".cm-scroller": { overflow: "auto" },
            ".cm-gutters": {
              backgroundColor: "var(--cream-100)",
              color: "var(--text-muted-dark)",
            },
            "&.cm-focused": { outline: "2px solid var(--amber-600)" },
            ".cm-activeLine": { backgroundColor: "var(--cream-50)" },
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, []);
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value)
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: value },
      });
  }, [value]);
  useEffect(() => {
    errors.current = diagnostics;
    const editor = view.current;
    if (editor)
      editor.dispatch(
        setDiagnostics(
          editor.state,
          diagnostics.map((d) => {
            const line = editor.state.doc.line(
              Math.min(editor.state.doc.lines, Math.max(1, d.line)),
            );
            return {
              from: line.from,
              to: line.to,
              severity: "error" as const,
              message: explain(d.message),
            };
          }),
        ),
      );
  }, [diagnostics]);
  return (
    <div
      className="l2-code"
      style={{ "--code-font-size": `${codeFontSize}px` } as CSSProperties}
    >
      <details className="kids-code-settings">
        <summary className="cab-icon-btn" aria-label={k.codeSettings}>
          <SettingsIcon />
        </summary>
        <div
          className="cab-row kids-options-panel"
          aria-label={polishRu.codeSize}
        >
          <button
            className="cab-btn cab-btn-secondary"
            aria-label={polishRu.codeSmaller}
            disabled={codeFontSize <= 12}
            onClick={() => {
              setCodeFontSize((n) => Math.max(12, n - 1));
              view.current?.requestMeasure();
            }}
          >
            A−
          </button>
          <span>{codeFontSize}</span>
          <button
            className="cab-btn cab-btn-secondary"
            aria-label={polishRu.codeLarger}
            disabled={codeFontSize >= 20}
            onClick={() => {
              setCodeFontSize((n) => Math.min(20, n + 1));
              view.current?.requestMeasure();
            }}
          >
            A+
          </button>
        </div>
      </details>
      <div ref={root} />
      {tooLarge && (
        <p className="l2-error" role="alert">
          {c.size}
        </p>
      )}
      {diagnostics.map((d, i) => (
        <p className="l2-error" role="alert" key={i}>
          {d.line}:{d.col} — {explain(d.message)}
        </p>
      ))}
    </div>
  );
}
