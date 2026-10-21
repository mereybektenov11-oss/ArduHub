"use client";
import { useEffect, useRef, useState } from "react";
import { learningRu as c } from "@/content/learning.ru";
import { Action, Card } from "@/components/cabinet/ui";
import { polishRu } from "@/content/ru";
type Video = {
  videoId: string;
  title: string;
  channel: string;
  durationSec?: number;
};
type Player = {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
};
type YouTube = {
  Player: new (
    element: HTMLIFrameElement,
    options: { events: { onError: () => void; onReady: () => void } },
  ) => Player;
};
let api: Promise<YouTube> | undefined;
function youtubeApi() {
  api ??= new Promise<YouTube>((resolve, reject) => {
    const target = window as typeof window & {
      YT?: YouTube;
      onYouTubeIframeAPIReady?: () => void;
    };
    if (target.YT?.Player) return resolve(target.YT);
    const previous = target.onYouTubeIframeAPIReady;
    target.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (target.YT) resolve(target.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = reject;
    document.head.append(script);
  });
  return api;
}
function VideoPlayer({
  video,
  onError,
  onProgress,
}: {
  video: Video;
  onError: () => void;
  onProgress: (n: number) => void;
}) {
  const [ready, setReady] = useState(false);
  const iframe = useRef<HTMLIFrameElement>(null);
  const callbacks = useRef({ onError, onProgress });
  useEffect(() => {
    callbacks.current = { onError, onProgress };
  }, [onError, onProgress]);
  useEffect(() => {
    let active = true,
      player: Player | undefined,
      timer: ReturnType<typeof setInterval> | undefined;
    let failed = false;
    const fail = () => {
      if (active && !failed) {
        failed = true;
        callbacks.current.onError();
      }
    };
    const deadline = setTimeout(fail, 12000);
    void youtubeApi()
      .then((YT) => {
        if (!active || !iframe.current) return;
        player = new YT.Player(iframe.current, {
          events: {
            onError: fail,
            onReady: () => {
              if (active) {
                clearTimeout(deadline);
                setReady(true);
              }
            },
          },
        });
        let previous = 0,
          watched = 0,
          wall = performance.now();
        const seen = new Set<number>();
        timer = setInterval(() => {
          if (!player || !active) return;
          const time = player.getCurrentTime?.() ?? 0,
            duration = player.getDuration?.() ?? 0;
          const elapsed = (performance.now() - wall) / 1000,
            delta = time - previous;
          if (
            player.getPlayerState?.() === 1 &&
            !document.hidden &&
            delta > 0 &&
            delta <= elapsed + 0.4 &&
            delta < 2
          ) {
            const second = Math.floor(time);
            if (!seen.has(second)) {
              seen.add(second);
              watched += Math.min(1, delta);
            }
            if (duration > 0)
              callbacks.current.onProgress(Math.min(1, watched / duration));
          }
          previous = time;
          wall = performance.now();
        }, 1000);
      })
      .catch(() => {
        api = undefined;
        fail();
      });
    return () => {
      active = false;
      clearInterval(timer);
      clearTimeout(deadline);
      player?.destroy();
    };
  }, []);
  return (
    <div className="polish-video-frame" aria-busy={!ready}>
      {!ready && (
        <div className="polish-video-loading" role="status">
          <span className="polish-spinner" aria-hidden="true" />
          {polishRu.videoLoading}
        </div>
      )}
      <iframe
        ref={iframe}
        className="l2-video"
        style={{ opacity: ready ? 1 : 0 }}
        title={video.title}
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.videoId)}?enablejsapi=1&origin=${typeof location === "undefined" ? "" : encodeURIComponent(location.origin)}`}
        allow="fullscreen; encrypted-media"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
export default function VideoStep({
  lessonId,
  onDone,
}: {
  lessonId: string;
  onDone: () => void;
}) {
  const [videos, setVideos] = useState<Video[]>([]),
    [index, setIndex] = useState(0),
    [loading, setLoading] = useState(true),
    [watched, setWatched] = useState(0),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/lesson-video?lessonId=${encodeURIComponent(lessonId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (/^[\w-]{11}$/.test(data.videoId))
          setVideos([
            data,
            ...(data.alternatives ?? []).filter((v: Video) =>
              /^[\w-]{11}$/.test(v.videoId),
            ),
          ]);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [lessonId]);
  function next() {
    setWatched(0);
    setIndex((i) => i + 1);
    setNotice(c.switchingVideo);
  }
  const video = videos[index];
  return (
    <Card className="polish-video-step">
      <h2>{c.steps[0]}</h2>
      {loading ? (
        <div className="polish-video-frame polish-video-loading" role="status">
          <span className="polish-spinner" aria-hidden="true" />
          {polishRu.videoLoading}
        </div>
      ) : video ? (
        <>
          <VideoPlayer
            key={video.videoId}
            video={video}
            onError={next}
            onProgress={setWatched}
          />
          <h3>{video.title}</h3>
          <p>
            {c.youtubeCredit} · {video.channel}
          </p>
          <p>
            {c.videoProgress}: {Math.round(watched * 100)}%
          </p>
          {notice && <p role="status">{notice}</p>}
          <div className="cab-row">
            <Action
              secondary
              onClick={next}
              disabled={index + 1 >= videos.length}
            >
              {c.anotherVideo}
            </Action>
            <Action disabled={watched < 0.8} onClick={onDone}>
              {c.next} →
            </Action>
          </div>
        </>
      ) : (
        <p role="status">{polishRu.videoUnavailable}</p>
      )}
      <Action secondary onClick={onDone}>
        {c.withoutVideo} →
      </Action>
    </Card>
  );
}
