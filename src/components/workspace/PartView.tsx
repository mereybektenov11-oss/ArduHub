"use client";
import { useEffect, useRef, useState } from "react";
import { catalog, type PartType } from "@arduhub/arduino-core/parts/catalog";
import { partLoaders } from "@/domain/parts/loaders.generated";
const loaders = {
  ...partLoaders,
  breadboard: () => import("./BreadboardElement"),
} as Record<PartType, () => Promise<unknown>>;
type WokwiPart = HTMLElement & { updateComplete?: Promise<unknown> };
function deviceVisual(
  type: PartType,
  level: number | number[],
  visual?: number | number[] | string,
  input?: { value: number; y: number },
) {
  if (input) {
    if (type === "pot" || type === "slide-potentiometer")
      return { min: 0, max: 100, value: input.value };
    if (type === "button" || type === "pushbutton-6mm")
      return { pressed: !!input.value };
    if (type === "switch") return { value: input.value };
    if (type === "analog-joystick")
      return { xValue: (input.value - 50) / 50, yValue: (input.y - 50) / 50 };
    if (type === "dip-switch-8")
      return {
        values: Array.from({ length: 8 }, (_, i) =>
          input.value & (1 << i) ? 1 : 0,
        ),
      };
    if (type === "ky-040") return { angle: input.value * 20 };
  }
  if (type === "servo" || type === "stepper-motor")
    return { angle: Number(level) };
  if (type === "segment" || type === "led-bar-graph")
    return { values: Array.isArray(level) ? level : [] };
  if (type === "lcd" || type === "lcd2004")
    return {
      text: typeof visual === "string" ? visual : "",
      backlight: !!visual,
    };
  if (type === "ssd1306" && Array.isArray(visual)) {
    const imageData = new ImageData(128, 64);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 128; x++) {
        const on = (visual[Math.floor(y / 8) * 128 + x] ?? 0) & (1 << (y % 8));
        const offset = (y * 128 + x) * 4;
        imageData.data.set(
          [on ? 180 : 0, on ? 240 : 0, on ? 255 : 0, 255],
          offset,
        );
      }
    return { imageData };
  }
  return {};
}
export default function PartView({
  type,
  attrs = {},
  level = 0,
  powered = false,
  scale = 1,
  lazy = false,
  visual,
  input,
}: {
  type: PartType;
  attrs?: Record<string, string | number>;
  level?: number | number[];
  powered?: boolean;
  scale?: number;
  lazy?: boolean;
  visual?: number | number[] | string;
  input?: { value: number; y: number };
}) {
  const host = useRef<HTMLSpanElement>(null),
    el = useRef<WokwiPart | null>(null);
  const props = useRef({ attrs, level, powered, visual, input });
  useEffect(() => {
    props.current = { attrs, level, powered, visual, input };
  }, [attrs, level, powered, visual, input]);
  const meta = catalog[type];
  const [visible, setVisible] = useState(!lazy);
  useEffect(() => {
    if (!lazy || !host.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { root: host.current.closest(".l2-palette"), rootMargin: "80px" },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [lazy]);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    loaders[type]()
      .then(() => {
        if (!active || !host.current) return;
        const part = document.createElement(catalog[type].tag) as WokwiPart;
        part.style.display = "block";
        part.style.pointerEvents = "none";
        part.inert = true;
        part.setAttribute("aria-hidden", "true");
        host.current.replaceChildren(part);
        el.current = part;
        const { attrs, level, powered, visual, input } = props.current;
        Object.assign(part, attrs);
        Object.assign(part, deviceVisual(type, level, visual, input));
        if (type === "pot") Object.assign(part, { min: 0, max: 100 });
        Object.assign(
          part,
          type === "led"
            ? { value: Number(level) > 0.01, brightness: Number(level) }
            : type === "rgb"
              ? {
                  ledRed: Array.isArray(level) ? level[0] : 0,
                  ledGreen: Array.isArray(level) ? level[1] : 0,
                  ledBlue: Array.isArray(level) ? level[2] : 0,
                }
              : type === "uno"
                ? { ledPower: powered, led13: Number(level) > 0.1 }
                : {},
        );
      })
      .catch(() => {
        host.current?.setAttribute("data-load-error", "true");
      });
    return () => {
      active = false;
      el.current = null;
    };
  }, [type, visible]); // initial props are applied immediately on registration
  useEffect(() => {
    if (!el.current) return;
    Object.assign(el.current, attrs);
    Object.assign(el.current, deviceVisual(type, level, visual, input));
    Object.assign(
      el.current,
      type === "led"
        ? { value: Number(level) > 0.01, brightness: Number(level) }
        : type === "rgb"
          ? {
              ledRed: Array.isArray(level) ? level[0] : 0,
              ledGreen: Array.isArray(level) ? level[1] : 0,
              ledBlue: Array.isArray(level) ? level[2] : 0,
            }
          : type === "uno"
            ? { ledPower: powered, led13: Number(level) > 0.1 }
            : {},
    );
  }, [attrs, level, powered, type, visual, input]);
  return (
    <span
      role="img"
      aria-label={meta.name}
      style={{
        display: "inline-block",
        width: meta.width * scale,
        height: meta.height * scale,
        pointerEvents: "none",
      }}
    >
      <span
        ref={host}
        style={{
          display: "block",
          width: meta.width,
          height: meta.height,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
        }}
      />
    </span>
  );
}
