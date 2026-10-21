import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LearningStore,
  type Draft,
  type Project,
  isDraft,
} from "@/domain/projects/storage";
import { motionTokens } from "@/lib/motion";
export async function loadLearning(
  client: SupabaseClient,
  userId: string,
  store: LearningStore,
  importGuest = false,
) {
  const [drafts, projects] = await Promise.all([
    client
      .from("drafts")
      .select("*")
      .eq("user_id", userId)
      .abortSignal(AbortSignal.timeout(motionTokens.lessonFlow.timeout)),
    client
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .abortSignal(AbortSignal.timeout(motionTokens.lessonFlow.timeout)),
  ]);
  if (drafts.error || projects.error) throw Error("offline");
  const cloudDrafts = Object.fromEntries(
    (drafts.data ?? [])
      .map(
        (d) =>
          [
            d.lesson_id,
            {
              ...d.data,
              scene: d.scene,
              code: d.code,
              updatedAt: d.updated_at,
            } as Draft,
          ] as const,
      )
      .filter(([, draft]) => isDraft(draft)),
  );
  const cloudProjects = (projects.data ?? []).map(
    (p) =>
      ({
        id: p.id,
        title: p.title,
        idea: p.idea,
        scene: p.scene,
        code: p.code,
        thumbnailSvg: p.thumbnail_svg,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }) as Project,
  );
  const pending = localStorage.getItem("arduhub.pending-learning:" + userId);
  const removed: string[] = JSON.parse(
    localStorage.getItem("arduhub.deleted-projects:" + userId) || "[]",
  );
  for (let i = cloudProjects.length - 1; i >= 0; i--)
    if (removed.includes(cloudProjects[i].id)) cloudProjects.splice(i, 1);
  const localDrafts = pending ? { ...store.drafts } : {};
  const localProjects = pending ? [...store.projects] : [];
  const guest = importGuest ? new LearningStore(localStorage) : null;
  guest?.load();
  for (const [id, draft] of Object.entries({
    ...localDrafts,
    ...guest?.drafts,
  })) {
    const own = cloudDrafts[id];
    if (!own || (draft.updatedAt ?? "") > (own.updatedAt ?? ""))
      cloudDrafts[id] = draft;
  }
  for (const project of [...localProjects, ...(guest?.projects ?? [])]) {
    const index = cloudProjects.findIndex((p) => p.id === project.id);
    if (index >= 0 && cloudProjects[index].updatedAt < project.updatedAt)
      cloudProjects[index] = project;
    if (
      !cloudProjects.some((p) => p.id === project.id) &&
      cloudProjects.length < 20
    )
      cloudProjects.push(project);
  }
  store.drafts = cloudDrafts;
  store.projects = cloudProjects;
  store.save();
  if (importGuest || pending) await saveLearning(client, userId, store);
}
export async function saveLearning(
  client: SupabaseClient,
  userId: string,
  store: LearningStore,
) {
  const revision = localStorage.getItem("arduhub.pending-learning:" + userId);
  const removed: string[] = JSON.parse(
    localStorage.getItem("arduhub.deleted-projects:" + userId) || "[]",
  );
  if (removed.length) {
    const { error } = await client
      .from("projects")
      .delete()
      .eq("user_id", userId)
      .in("id", removed);
    if (error) throw error;
  }
  const drafts = Object.entries(store.drafts).map(([id, d]) => ({
    user_id: userId,
    lesson_id: id,
    scene: d.scene,
    code: d.code,
    data: d,
    updated_at: d.updatedAt ?? new Date().toISOString(),
  }));
  const projects = store.projects.map((p) => ({
    id: p.id,
    user_id: userId,
    title: p.title,
    idea: p.idea,
    scene: p.scene,
    code: p.code,
    thumbnail_svg: p.thumbnailSvg,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }));
  if (drafts.length) {
    const { error } = await client.from("drafts").upsert(drafts);
    if (error) throw error;
  }
  if (projects.length) {
    const { error } = await client.from("projects").upsert(projects);
    if (error) throw error;
  }
  if (localStorage.getItem("arduhub.pending-learning:" + userId) === revision) {
    localStorage.removeItem("arduhub.pending-learning:" + userId);
    localStorage.removeItem("arduhub.deleted-projects:" + userId);
  }
}
