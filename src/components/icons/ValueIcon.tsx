"use client";
import { useEffect, useRef, useState } from "react";
import Icon, { type IconName } from "./Icon";
export default function ValueIcon({
  name,
  value,
}: {
  name: IconName;
  value: number;
}) {
  const previous = useRef(value),
    [state, setState] = useState<"idle" | "gain" | "spend">("idle");
  useEffect(() => {
    const old = previous.current;
    previous.current = value;
    if (old === value) return;
    const frame = requestAnimationFrame(() =>
      setState(value > old ? "gain" : "spend"),
    );
    const timer = setTimeout(() => setState("idle"), 650);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [value]);
  return <Icon name={name} value={value} state={state} />;
}
