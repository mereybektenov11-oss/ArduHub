"use client";

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  type ReactNode,
} from "react";
import { motionTokens, revealStyle } from "@/lib/motion";
import { useInViewOnce } from "@/lib/useInViewOnce";

const ItemDelay = createContext(0);

export function Stagger({
  children,
  className = "",
  delay = 0,
  interval = motionTokens.stagger,
  eager = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  interval?: number;
  eager?: boolean;
}) {
  const { ref } = useInViewOnce<HTMLDivElement>({ enabled: !eager });
  return (
    <div
      ref={ref}
      className={`stagger ${eager ? "stagger-eager" : ""} ${className}`}
    >
      {Children.toArray(children).map((child, index) => (
        <ItemDelay.Provider
          key={isValidElement(child) ? child.key : index}
          value={delay + index * interval}
        >
          {child}
        </ItemDelay.Provider>
      ))}
    </div>
  );
}

export function StaggerItem({
  children,
  className = "",
  y = motionTokens.reveal.y,
  delay: explicitDelay,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
}) {
  const inheritedDelay = useContext(ItemDelay);
  const delay = explicitDelay ?? inheritedDelay;
  return (
    <div className={`stagger-item ${className}`} style={revealStyle(delay, y)}>
      {children}
    </div>
  );
}
