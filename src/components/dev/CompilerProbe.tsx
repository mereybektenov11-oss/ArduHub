"use client";
import { useState } from "react";
import { compilerStatusRu as c } from "@/content/compiler";

export function CompilerProbe() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ message: string; ms?: number } | null>(
    null,
  );
  async function run() {
    setPending(true);
    setResult(null);
    try {
      const response = await fetch("/dev/status/compile", { method: "POST" });
      setResult(await response.json());
    } catch {
      setResult({ message: c.unavailable });
    } finally {
      setPending(false);
    }
  }
  return (
    <section>
      <button
        className="button button-primary"
        type="button"
        disabled={pending}
        onClick={run}
      >
        {pending ? c.pending : c.action}
      </button>
      <p role="status" aria-live="polite">
        {result?.message}
        {result?.ms !== undefined ? ` · ${result.ms} ${c.ms}` : ""}
      </p>
    </section>
  );
}
