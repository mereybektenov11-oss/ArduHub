import type { SchemeItem } from "@/content/ru";
export type Filters = {
  topic: readonly string[];
  level: readonly string[];
  status: readonly string[];
};
export const emptyFilters: Filters = { topic: [], level: [], status: [] };
export function filterSchemes(items: readonly SchemeItem[], filters: Filters) {
  return items.filter(
    (item) =>
      (!filters.topic.length || filters.topic.includes(item.topic)) &&
      (!filters.level.length || filters.level.includes(item.level)) &&
      (!filters.status.length || filters.status.includes(item.status)),
  );
}
