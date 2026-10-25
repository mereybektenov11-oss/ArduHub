import PracticeView from "@/components/cabinet/PracticeView";
import GlossaryView from "@/components/cabinet/GlossaryView";
import Link from "next/link";
import { kidsPagesRu as c } from "@/content/kids-pages.ru";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ review?: string; tab?: string }>;
}) {
  const { review, tab } = await searchParams;
  const selected = ["training", "glossary"].includes(tab ?? "")
    ? tab
    : "training";
  return (
    <div className="cab-stack">
      <nav className="polish-practice-tabs" aria-label={c.practice}>
        {["training", "glossary"].map((id, i) => (
          <Link
            key={id}
            href={`/app/practice?tab=${id}`}
            aria-current={selected === id ? "page" : undefined}
          >
            {[c.training, c.glossary][i]}
          </Link>
        ))}
      </nav>
      {selected === "glossary" ? (
        <GlossaryView />
      ) : (
        <PracticeView review={review === "1"} />
      )}
    </div>
  );
}
