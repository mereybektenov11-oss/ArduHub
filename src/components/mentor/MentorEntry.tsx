"use client";
import { useEffect } from "react";
import { openMentor, type MentorRequest } from "./openMentor";
import { polishRu as c } from "@/content/ru";
export default function MentorEntry(props: MentorRequest) {
  const { lessonId, errorCode } = props;
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      openMentor({ lessonId, errorCode }),
    );
    return () => cancelAnimationFrame(frame);
  }, [lessonId, errorCode]);
  return (
    <button className="cab-btn" onClick={() => openMentor(props)}>
      {c.askMentor}
    </button>
  );
}
