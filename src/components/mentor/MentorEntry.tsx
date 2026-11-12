"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { lessons } from "@/domain/seed";
import type { MentorRequest } from "./openMentor";
export default function MentorEntry(props: MentorRequest) {
  const { lessonId } = props;
  const router = useRouter();
  useEffect(() => {
    router.replace(
      lessons.some((lesson) => lesson.id === lessonId)
        ? `/app/lesson/${lessonId}`
        : "/app/profile",
    );
  }, [lessonId, router]);
  return null;
}
