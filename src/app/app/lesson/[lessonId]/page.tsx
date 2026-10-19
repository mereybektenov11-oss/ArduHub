import LessonView from "@/components/cabinet/LessonView";
export default async function Page({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  return <LessonView id={lessonId} />;
}
