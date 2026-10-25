import { notFound } from "next/navigation";
import { showDevStatus } from "@/lib/env";
import { ProgressProvider } from "@/lib/useProgress";
import ProgressControls from "@/components/dev/ProgressControls";
import "../../app/cabinet.css";
export const dynamic = "force-dynamic";
export default function Page() {
  if (!showDevStatus()) notFound();
  return (
    <main className="shell privacy-page cabinet">
      <ProgressProvider>
        <ProgressControls />
      </ProgressProvider>
    </main>
  );
}
