import PracticeView from "@/components/cabinet/PracticeView";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ review?: string }>;
}) {
  const { review } = await searchParams;
  return <PracticeView review={review === "1"} />;
}
