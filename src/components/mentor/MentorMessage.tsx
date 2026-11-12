import { Fragment, type ReactNode } from "react";
import MentorCode from "@/components/cabinet/MentorCode";
import { cleanMentorText } from "@/lib/mentorHistory";

function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
    .map((part, i) =>
      part.startsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : part.startsWith("*") ? (
        <em key={i}>{part.slice(1, -1)}</em>
      ) : part.startsWith("`") ? (
        <code key={i}>{part.slice(1, -1)}</code>
      ) : (
        <Fragment key={i}>{part.replace(/[`*]/g, "")}</Fragment>
      ),
    );
}

export default function MentorMessage({ text }: { text: string }) {
  const blocks = cleanMentorText(text).split(/(```[\s\S]*?(?:```|$))/g);
  return (
    <div className="h-mentor-content">
      {blocks.map((block, index) => {
        if (block.startsWith("```")) {
          const code = block
            .replace(/^```[^\n]*\n?/, "")
            .replace(/```$/, "")
            .trim();
          return code ? (
            <MentorCode
              key={index}
              text={`\x60\x60\x60\n${code}\n\x60\x60\x60`}
            />
          ) : null;
        }
        const lines = block.split("\n");
        const nodes: ReactNode[] = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim().replace(/^#{1,6}\s*/, "");
          if (!line || /^[-*_]{3,}$/.test(line) || /^\|?\s*:?-{2,}/.test(line))
            continue;
          const list = /^(?:[-+*]|\d+\.)\s+/.test(line);
          if (list) {
            const ordered = /^\d+\./.test(line),
              items: ReactNode[] = [];
            while (
              i < lines.length &&
              /^(?:[-+*]|\d+\.)\s+/.test(lines[i].trim())
            ) {
              const item = lines[i].trim().replace(/^(?:[-+*]|\d+\.)\s+/, "");
              items.push(<li key={i}>{inline(item)}</li>);
              i++;
            }
            i--;
            for (let n = 0; n < items.length; n += 6)
              nodes.push(
                ordered ? (
                  <ol key={`${i}-${n}`}>{items.slice(n, n + 6)}</ol>
                ) : (
                  <ul key={`${i}-${n}`}>{items.slice(n, n + 6)}</ul>
                ),
              );
          } else nodes.push(<p key={i}>{inline(line.replace(/\|/g, " "))}</p>);
        }
        return <Fragment key={index}>{nodes}</Fragment>;
      })}
    </div>
  );
}
