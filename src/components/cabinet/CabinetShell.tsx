"use client";
import type { ReactNode } from "react";
import { ProgressProvider } from "@/lib/useProgress";
import DashboardShell from "@/components/shell/DashboardShell";
export default function CabinetShell({ children }: { children: ReactNode }) {
  return (
    <ProgressProvider>
      <DashboardShell>{children}</DashboardShell>
    </ProgressProvider>
  );
}
