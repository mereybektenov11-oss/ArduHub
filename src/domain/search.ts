import { dashboardRu as c } from "@/content/dashboard.ru";
import { lessons, terms } from "@/domain/seed";
import type { Project } from "@/domain/projects/storage";
export type SearchResult = { title: string; href: string; group: number };
export function searchCabinet(
  query: string,
  projects: Project[] = [],
): SearchResult[] {
  const q = query.trim().toLocaleLowerCase("ru");
  const pages: SearchResult[] = c.groups.flatMap<SearchResult>((g) =>
    g.items.map(([title, href]) => ({ title, href, group: 3 })),
  );
  const all: SearchResult[] = [
    ...lessons.map((l) => ({
      title: l.title,
      href: "/app/lesson/" + l.id,
      group: 0,
    })),
    ...terms.map((t) => ({
      title: t.title,
      href: "/app/glossary?term=" + encodeURIComponent(t.title),
      group: 1,
    })),
    ...projects.map((p) => ({
      title: p.title,
      href: "/app/projects/" + p.id,
      group: 2,
    })),
    ...pages,
  ];
  return all
    .filter((r) => !q || r.title.toLocaleLowerCase("ru").includes(q))
    .slice(0, 30);
}
