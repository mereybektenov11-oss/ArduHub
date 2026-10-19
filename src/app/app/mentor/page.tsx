import MentorPage from "@/components/cabinet/MentorPage";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string; error?: string }>;
}) {
  const q = await searchParams;
  return <MentorPage lessonId={q.lesson} errorCode={q.error} />;
}
