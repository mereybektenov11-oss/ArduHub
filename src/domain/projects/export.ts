import type { Project } from "./storage";
export function exportProject(project: Project) {
  const file = new Blob([JSON.stringify({ version: 1, project }, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(file),
    link = document.createElement("a");
  link.href = url;
  link.download = `${project.title.replace(/[\\/:*?"<>|]/g, "_")}.arduhub.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
