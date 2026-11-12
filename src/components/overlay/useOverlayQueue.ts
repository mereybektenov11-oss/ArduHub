"use client";
import { useEffect, useId, useSyncExternalStore } from "react";

export function createOverlayQueue() {
  let ids: string[] = [];
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    current: () => ids[0] ?? null,
    enter(id: string) {
      if (!ids.includes(id)) {
        ids = [...ids, id];
        emit();
      }
    },
    leave(id: string) {
      if (ids.includes(id)) {
        ids = ids.filter((value) => value !== id);
        emit();
      }
    },
  };
}
export const overlayQueue = createOverlayQueue();
export function useOverlayQueue(enabled = true) {
  const id = useId();
  const current = useSyncExternalStore(
    overlayQueue.subscribe,
    overlayQueue.current,
    () => null,
  );
  useEffect(() => {
    if (!enabled) return;
    overlayQueue.enter(id);
    return () => overlayQueue.leave(id);
  }, [id, enabled]);
  return !enabled || current === id;
}
