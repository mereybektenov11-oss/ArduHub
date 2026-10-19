import ProjectWorkspace from "@/components/projects/ProjectWorkspace";
export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectWorkspace id={projectId} />;
}
