import type { Metadata } from "next";
import Link from "next/link";
import { ru } from "@/content/ru";
export const metadata: Metadata = {
  title: `${ru.privacy.title} | ${ru.brand}`,
  alternates: { canonical: "/privacy" },
};
export default function Privacy() {
  return (
    <main className="shell privacy-page">
      <Link className="text-button" href="/">
        ← {ru.ui.privacyBack}
      </Link>
      <h1>{ru.privacy.title}</h1>
      <p>{ru.privacy.updated}</p>
      {ru.privacy.sections.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          <p>{s.text}</p>
        </section>
      ))}
    </main>
  );
}
