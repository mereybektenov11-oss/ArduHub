"use client";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  canOpenStage,
  resolveStage,
  type LessonFlowState,
  type LessonStage,
} from "@/domain/lessons/flow";
export { canOpenStage, resolveStage } from "@/domain/lessons/flow";
export function useStageGate(flow: LessonFlowState, skipTest = false) {
  const router = useRouter(),
    path = usePathname(),
    params = useSearchParams();
  const resolved = resolveStage(flow, params.get("stage"));
  const active = skipTest && resolved === "test" ? "practice" : resolved;
  useEffect(() => {
    if (params.get("stage") !== active) {
      const next = new URLSearchParams(params.toString());
      next.set("stage", active);
      router.replace(`${path}?${next}`, { scroll: false });
    }
  }, [active, params, path, router]);
  return {
    active,
    open: (stage: LessonStage) => {
      if (canOpenStage(flow, stage)) {
        const next = new URLSearchParams(params.toString());
        next.set("stage", stage);
        router.replace(`${path}?${next}`, { scroll: false });
      }
    },
  };
}
