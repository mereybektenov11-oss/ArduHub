import { Card } from "./ui";
import { scheduleCopy as c } from "@/content/cabinet.ru";
export default function Schedule() {
  return (
    <Card tour="schedule">
      <h2>{c.title}</h2>
      <p className="cab-muted">{c.note}</p>
    </Card>
  );
}
