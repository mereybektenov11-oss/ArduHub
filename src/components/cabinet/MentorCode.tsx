"use client";
import { useState } from "react";
import { mentorCopy as c } from "@/content/cabinet.ru";
export default function MentorCode({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const code = text.replace(/^```\w*\n?|```$/g, "");
  const tokens = code.split(
    /("(?:\\.|[^"\\])*"|\/\/[^\n]*|\b(?:void|int|bool|byte|const|if|else|for|while|return|HIGH|LOW|OUTPUT|INPUT_PULLUP)\b|\b\d+\b)/g,
  );
  return (
    <div className="l2-mentor-code">
      <pre tabIndex={0}>
        <code>
          {tokens.map((token, i) => (
            <span
              key={i}
              className={
                token.startsWith('"')
                  ? "l2-code-string"
                  : token.startsWith("//")
                    ? "l2-code-comment"
                    : /^\d+$/.test(token)
                      ? "l2-code-number"
                      : /^\w+$/.test(token)
                        ? "l2-code-keyword"
                        : undefined
              }
            >
              {token}
            </span>
          ))}
        </code>
      </pre>
      <button
        className="cab-btn cab-btn-secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? c.copiedCode : c.copyCode}
      </button>
    </div>
  );
}
