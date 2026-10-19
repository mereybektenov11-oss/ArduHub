import GameView from "@/components/games/GameView";
export default async function Page({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <GameView id={gameId} />;
}
