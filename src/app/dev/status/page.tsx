import { notFound } from "next/navigation";
import { serviceHealth, showDevStatus } from "@/lib/env";
export default function Page() {
  if (!showDevStatus()) notFound();
  return (
    <main className="shell privacy-page">
      <h1>ArduHub · статус сервисов</h1>
      {Object.entries(serviceHealth()).map(([name, on]) => (
        <p key={name}>
          {name}: {on ? "Настроен" : "Не настроен — доступен запасной режим"}
        </p>
      ))}
    </main>
  );
}
