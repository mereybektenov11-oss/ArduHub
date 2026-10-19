import LevelView from "@/components/map/LevelView";
export default async function Page({
  params,
}: {
  params: Promise<{ levelId: string }>;
}) {
  const { levelId } = await params;
  return <LevelView id={Number(levelId)} />;
}
