import PracticeView from "@/components/cabinet/PracticeView";
import GlossaryView from "@/components/cabinet/GlossaryView";
import HomeworkView from "@/components/cabinet/HomeworkView";
import Link from "next/link";
import { polishRu as c } from "@/content/ru";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ review?: string; tab?: string }>;
}) {
  const { review, tab } = await searchParams;
  const selected = ["training", "glossary", "homework"].includes(tab ?? "")
    ? tab
    : "training";
  return (
    <div className="cab-stack">
      <nav className="polish-practice-tabs" aria-label={c.practice}>
        {["training", "glossary", "homework"].map((id, i) => (
          <Link
            key={id}
            href={`/app/practice?tab=${id}`}
            aria-current={selected === id ? "page" : undefined}
          >
            {c.practiceTabs[i]}
          </Link>
        ))}
      </nav>
      {selected === "glossary" ? (
        <GlossaryView />
      ) : selected === "homework" ? (
        <HomeworkView />
      ) : (
        <PracticeView review={review === "1"} />
      )}
    </div>
  );
}
