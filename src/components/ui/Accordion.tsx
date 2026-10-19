"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import type { FaqItem } from "@/content/ru";
const subscribe = () => () => {};
export default function Accordion({ items }: { items: readonly FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <div className="accordion" data-enhanced={hydrated}>
      {items.map((item, i) => (
        <div
          className="faq-item"
          key={item.id}
          data-open={!hydrated || open === i}
        >
          <h3>
            <button
              type="button"
              id={`faq-button-${item.id}`}
              aria-expanded={!hydrated || open === i}
              aria-controls={`faq-answer-${item.id}`}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              onClick={() => setOpen(open === i ? null : i)}
              onKeyDown={(e) => {
                let next = i;
                if (e.key === "ArrowDown") next = (i + 1) % items.length;
                else if (e.key === "ArrowUp")
                  next = (i - 1 + items.length) % items.length;
                else if (e.key === "Home") next = 0;
                else if (e.key === "End") next = items.length - 1;
                else return;
                e.preventDefault();
                buttons.current[next]?.focus();
              }}
            >
              {item.question}
              <span className="faq-plus" aria-hidden="true">
                +
              </span>
            </button>
          </h3>
          <div
            className="faq-answer"
            id={`faq-answer-${item.id}`}
            role="region"
            aria-labelledby={`faq-button-${item.id}`}
            aria-hidden={hydrated && open !== i}
            inert={hydrated && open !== i}
          >
            <div className="faq-answer-inner">
              <p>{item.answer}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
