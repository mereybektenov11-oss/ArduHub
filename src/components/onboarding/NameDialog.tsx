"use client";
import { useEffect, useRef, useState } from "react";
import { useProgress } from "@/lib/useProgress";
import { onboardingRu as c } from "@/content/ru";
import { onboardingKey } from "@/lib/onboarding";
import { Action } from "@/components/cabinet/ui";

export default function NameDialog({ onReady }: { onReady: () => void }) {
  const { progress: p, ready, update } = useProgress();
  const dialog = useRef<HTMLDialogElement>(null);
  const callback = useRef(onReady);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string>(c.avatars[0]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    callback.current = onReady;
  });
  useEffect(() => {
    if (!ready) return;
    let introduced =
      Boolean(p.account?.userId) ||
      !["", "Ученик", "Юный изобретатель"].includes(p.profile.name);
    try {
      introduced ||= Boolean(
        localStorage.getItem(onboardingKey(p.account?.userId)),
      );
    } catch {}
    const frame = requestAnimationFrame(() => {
      if (introduced) callback.current();
      else setOpen(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, p.account?.userId, p.profile.name]);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={dialog}
      className="cab-modal"
      aria-labelledby="name-dialog-title"
      onCancel={(e) => e.preventDefault()}
    >
      <form
        className="cab-modal-content cab-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const nickname = name.trim();
          if (!nickname || nickname.length > 20) return;
          update((previous) => ({
            ...previous,
            profile: { ...previous.profile, name: nickname, avatar },
          }));
          try {
            localStorage.setItem(onboardingKey(p.account?.userId), "1");
          } catch {}
          setOpen(false);
          callback.current();
        }}
      >
        <h2 id="name-dialog-title">{c.nameTitle}</h2>
        <label className="cab-stack">
          {c.nickname}
          <input
            autoFocus
            value={name}
            required
            maxLength={20}
            autoComplete="nickname"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <p className="cab-muted">{c.nameHint}</p>
        <fieldset className="onboarding-avatars">
          <legend>{c.chooseAvatar}</legend>
          {c.avatars.map((option, i) => (
            <button
              type="button"
              className="cab-icon-btn"
              key={option}
              aria-pressed={avatar === option}
              aria-label={`${c.avatar} ${i + 1}`}
              onClick={() => setAvatar(option)}
            >
              {option}
            </button>
          ))}
        </fieldset>
        <Action type="submit" disabled={!name.trim()}>
          {c.start}
        </Action>
      </form>
    </dialog>
  );
}
