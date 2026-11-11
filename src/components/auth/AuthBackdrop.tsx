"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const scenes = [
  "/images/auth/mentor-tool-run-hq.webp",
  "/images/auth/mentor-giant-robot-hq.webp",
  "/images/auth/mentor-robot-test-hq.webp",
];

export default function AuthBackdrop() {
  const [loaded, setLoaded] = useState<string[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return (
    <div
      className="auth-backdrop"
      aria-hidden="true"
      data-ready={loaded.length === scenes.length}
      data-visible={visible}
    >
      {scenes.map((src, index) => (
        <Image
          key={src}
          className="auth-backdrop-scene"
          src={src}
          alt=""
          fill
          sizes="100vw"
          unoptimized
          loading="eager"
          fetchPriority={index === 0 ? "high" : "low"}
          onLoad={() =>
            setLoaded((current) =>
              current.includes(src) ? current : [...current, src],
            )
          }
        />
      ))}
    </div>
  );
}
