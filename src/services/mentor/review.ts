import { learningRu as c } from "@arduhub/curriculum/learning.ru";
export function reviewSections(text: string) {
  const headings = [c.works, c.risk, c.nextStep];
  return headings.map((title, i) => {
    const start = text.indexOf(title),
      end =
        i < 2
          ? text.indexOf(headings[i + 1], start + title.length)
          : text.length;
    return {
      title,
      text:
        start >= 0
          ? text
              .slice(start + title.length, end >= 0 ? end : undefined)
              .replace(/^[\s:*#-]+|[\s*#]+$/g, "")
          : i === 0
            ? text
            : i === 1
              ? c.reviewRisk
              : c.reviewNext,
    };
  });
}
