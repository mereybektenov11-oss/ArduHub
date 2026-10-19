import type { Metadata } from "next";
import CabinetShell from "@/components/cabinet/CabinetShell";
import "./cabinet.css";
import "./learning.css";
import "./dashboard.css";
export const metadata: Metadata = {
  title: "Кабинет ученика · ArduHub",
  robots: { index: false, follow: false },
  alternates: { canonical: "/app" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <CabinetShell>{children}</CabinetShell>;
}
