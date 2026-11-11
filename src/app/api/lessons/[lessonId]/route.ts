import { learningLessons } from "@arduhub/arduino-core/lessons/content";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;
  const lesson = learningLessons.find((l) => l.id === lessonId);
  return lesson
    ? Response.json(lesson, {
        headers: { "Cache-Control": "public, max-age=300" },
      })
    : Response.json({ error: "not_found" }, { status: 404 });
}
