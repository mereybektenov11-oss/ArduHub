"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ru } from "@/content/ru";

// Boxicons 2.1.4 (regular), MIT license: https://boxicons.com
const ICON_PATHS = [
  [
    "M9 9h6v6H9z",
    "M20 6c0-1.103-.897-2-2-2h-2V2h-2v2h-4V2H8v2H6c-1.103 0-2 .897-2 2v2H2v2h2v4H2v2h2v2c0 1.103.897 2 2 2h2v2h2v-2h4v2h2v-2h2c1.103 0 2-.897 2-2v-2h2v-2h-2v-4h2V8h-2V6zM6 18V6h12l.002 12H6z",
  ],
  [
    "M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z",
    "M9.999 13.587 7.7 11.292l-1.412 1.416 3.713 3.705 6.706-6.706-1.414-1.414z",
  ],
  [
    "M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z",
    "m9 17 8-5-8-5z",
  ],
  [
    "m7.375 16.781 1.25-1.562L4.601 12l4.024-3.219-1.25-1.562-5 4a1 1 0 0 0 0 1.562l5 4zm9.25-9.562-1.25 1.562L19.399 12l-4.024 3.219 1.25 1.562 5-4a1 1 0 0 0 0-1.562l-5-4zm-1.649-4.003-4 18-1.953-.434 4-18z",
  ],
];

function CardIcon({ index }: { index: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {ICON_PATHS[index % ICON_PATHS.length].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export default function BenefitCards() {
  const [active, setActive] = useState<number | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const items = ru.landingVideo.benefits;

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = (index + 1) % items.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = (index + items.length - 1) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    buttons.current[next]?.focus();
  }

  return (
    <div className="benefits-grid">
      {items.map((item, index) => (
        <article
          className={`benefit-card benefit-card-${index}`}
          data-expanded={active === index}
          key={item.title}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse" || event.pointerType === "pen")
              setActive(index);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse" || event.pointerType === "pen")
              setActive((current) => (current === index ? null : current));
          }}
        >
          <div className="benefit-visual" aria-hidden="true">
            <div className="benefit-art">
              <CardIcon index={index} />
            </div>
          </div>
          <div className="benefit-copy">
            <h3>
              <button
                type="button"
                className="benefit-toggle"
                ref={(node) => {
                  buttons.current[index] = node;
                }}
                aria-expanded={active === index}
                aria-controls={`benefit-detail-${index}`}
                onClick={(event) => {
                  if (
                    event.detail === 0 ||
                    window.matchMedia("(hover: none)").matches
                  )
                    setActive((current) => (current === index ? null : index));
                }}
                onFocus={(event) => {
                  if (event.currentTarget.matches(":focus-visible"))
                    setActive(index);
                }}
                onBlur={() =>
                  setActive((current) => (current === index ? null : current))
                }
                onKeyDown={(event) => navigate(event, index)}
              >
                {item.title}
              </button>
            </h3>
            <p className="benefit-summary">{item.text}</p>
            <div
              className="benefit-more"
              id={`benefit-detail-${index}`}
              aria-hidden={active !== index}
              inert={active !== index}
            >
              <div>
                <p>{item.detail}</p>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
