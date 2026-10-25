import { notFound } from "next/navigation";
import { serviceHealth, showDevStatus } from "@/lib/env";
import { compilerHealth } from "@/services/compile/health";
import { polishRu as c } from "@/content/ru";
import { CompilerProbe } from "@/components/dev/CompilerProbe";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!showDevStatus()) notFound();
  const compiler = await compilerHealth(
    process.env.COMPILER_API_URL || process.env.COMPILER_URL,
  );
  return (
    <main className="shell privacy-page">
      <h1>{c.statusTitle}</h1>
      {Object.entries(serviceHealth()).map(([name, on]) => (
        <p key={name}>
          {name}: {on ? c.statusConfigured : c.statusMissing}
        </p>
      ))}
      <p>
        {c.probe}:{" "}
        {compiler.configured
          ? compiler.reachable
            ? c.reachable
            : c.unreachable
          : c.statusMissing}{" "}
        · {compiler.ms} ms
      </p>
      <CompilerProbe />
    </main>
  );
}
