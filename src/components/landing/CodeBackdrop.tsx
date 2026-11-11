"use client";

import { useRef, type CSSProperties } from "react";
import { ru } from "@/content/ru";
import { useSceneActivity } from "./useSceneActivity";

export default function CodeBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  const active = useSceneActivity(ref);
  const lines = ru.heroBackdrop.lines;

  return (
    <div
      ref={ref}
      className="code-backdrop"
      data-active={active}
      aria-hidden="true"
    >
      {Array.from({ length: 10 }, (_, column) => (
        <div className="code-column" key={column}>
          <div
            className="code-stream"
            style={
              {
                "--code-duration": `${38 + (column % 4) * 9}s`,
                "--code-phase": `${-column * 7 - 13}s`,
              } as CSSProperties
            }
          >
            {[0, 1].map((copy) => (
              <div className="code-sequence" key={copy}>
                {Array.from({ length: 18 }, (_, row) => {
                  const index = (row * 7 + column * 11) % lines.length;
                  return (
                    <span
                      key={row}
                      data-kind={
                        /[а-яё]|^(Arduino|OLED|PWM|I²C)/i.test(lines[index])
                          ? "component"
                          : "code"
                      }
                      className={
                        (row + column) % 5 === 0
                          ? "code-line code-line-bright"
                          : "code-line"
                      }
                    >
                      {lines[index]}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
