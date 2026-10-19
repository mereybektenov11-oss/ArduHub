"use client";
import { interfaceCopy as uiCopy } from "@/content/cabinet.ru";
import dynamic from "next/dynamic";
const IslandMap = dynamic(() => import("./IslandMap"), {
  loading: () => <div className="cab-card">{uiCopy.text091}</div>,
});
export default function MapPage() {
  return <IslandMap />;
}
