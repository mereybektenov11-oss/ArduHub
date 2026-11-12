"use client";
import { useEffect, useRef, useState } from "react";
import { dashboardRu as c } from "@/content/dashboard.ru";
import Icon from "@/components/icons/Icon";
import RewardPopup from "./RewardPopup";

/** Retains a short notice while another reward window owns the shared layer. */
export default function TransientNotice({
  message,
  offline,
}: {
  message: string;
  offline: boolean;
}) {
  const [notices, setNotices] = useState<{ id: number; text: string }[]>([]);
  const sequence = useRef(0);
  useEffect(() => {
    if (!message) return;
    const frame = requestAnimationFrame(() =>
      setNotices((items) => [
        ...items,
        { id: ++sequence.current, text: message },
      ]),
    );
    return () => cancelAnimationFrame(frame);
  }, [message]);
  const notice = notices[0];
  if (notice)
    return (
      <RewardPopup
        key={notice.id}
        className="cab-toast"
        onDone={() => setNotices((items) => items.slice(1))}
      >
        {notice.text === c.saved && <Icon name="saved" state="done" />}
        {notice.text}
      </RewardPopup>
    );
  return offline ? (
    <RewardPopup className="cab-toast" queued={false}>
      {c.offline}
    </RewardPopup>
  ) : null;
}
