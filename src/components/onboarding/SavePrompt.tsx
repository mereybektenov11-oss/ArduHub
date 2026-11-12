"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useProgress } from "@/lib/useProgress";
import {
  readSavePromptHistory,
  savePromptKey,
  shouldOfferSave,
} from "@/lib/onboarding";
import { onboardingRu as c } from "@/content/ru";
import { Modal } from "@/components/cabinet/ui";

export default function SavePrompt() {
  const { progress: p } = useProgress();
  const [open, setOpen] = useState(false);
  const completed = Object.values(p.lessons).some(
    (lesson) => lesson.status === "done",
  );
  useEffect(() => {
    let history = null;
    const key = savePromptKey(p.account?.userId);
    try {
      history = readSavePromptHistory(localStorage.getItem(key));
    } catch {
      return;
    }
    const now = Date.now();
    if (!shouldOfferSave(completed, Boolean(p.account?.userId), history, now))
      return;
    let frame = 0;
    const offer = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Let the learner close the completion reward (or another dialog) first.
        if (document.querySelector("dialog[open]")) return;
        try {
          localStorage.setItem(
            key,
            JSON.stringify({
              firstShownAt: history?.firstShownAt ?? now,
              shown: (history?.shown ?? 0) + 1,
            }),
          );
        } catch {
          return;
        }
        setOpen(true);
        observer.disconnect();
      });
    };
    const observer = new MutationObserver(offer);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    offer();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [completed, p.account?.userId]);
  if (!open || p.account?.userId) return null;
  return (
    <Modal title={c.saveTitle} onClose={() => setOpen(false)}>
      <p>{c.saveNote}</p>
      <div className="cab-row">
        <Link href="/register" className="cab-btn">
          {c.createAccount}
        </Link>
        <Link href="/sign-in" className="cab-btn cab-btn-secondary">
          {c.signIn}
        </Link>
      </div>
    </Modal>
  );
}
