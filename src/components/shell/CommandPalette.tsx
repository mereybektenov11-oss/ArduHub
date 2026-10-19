"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/cabinet/ui";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { searchCabinet } from "@/domain/search";
import { useLearningStore } from "@/lib/useLearningStore";
export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState(""),
    [index, setIndex] = useState(0);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const { store } = useLearningStore();
  const results = searchCabinet(query, store?.projects ?? []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  function open(href: string) {
    onClose();
    router.push(href);
  }
  return (
    <Modal title={c.search} onClose={onClose}>
      <input
        ref={input}
        className="dash-search-input"
        role="combobox"
        aria-label={c.search}
        aria-autocomplete="list"
        aria-expanded={true}
        aria-controls="search-results"
        aria-activedescendant={
          results[index] ? "search-result-" + index : undefined
        }
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIndex(0);
        }}
        placeholder={c.searchPlaceholder}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndex((i) => Math.min(results.length - 1, i + 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndex((i) => Math.max(0, i - 1));
          }
          if (e.key === "Enter" && results[index]) {
            e.preventDefault();
            open(results[index].href);
          }
        }}
      />
      <div id="search-results" role="listbox" aria-label={c.search}>
        {results.map((r, i) => (
          <div key={r.href}>
            {(i === 0 || results[i - 1].group !== r.group) && (
              <p className="dash-search-heading" aria-hidden="true">
                {c.resultGroups[r.group]}
              </p>
            )}
            <div
              id={"search-result-" + i}
              role="option"
              aria-selected={i === index}
              className="dash-search-result"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => open(r.href)}
            >
              {r.title}
            </div>
          </div>
        ))}
      </div>
      {!results.length && <p>{c.noResults}</p>}
    </Modal>
  );
}
