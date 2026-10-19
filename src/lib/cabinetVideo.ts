export function cabinetVideo(
  value: string | null,
): { kind: "embed" | "file"; src: string } | null {
  if (!value) return null;
  if (/^\/videos\/[A-Za-z0-9/_-]+\.mp4$/.test(value))
    return { kind: "file", src: value };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (
    [
      "youtube.com",
      "www.youtube.com",
      "youtu.be",
      "youtube-nocookie.com",
      "www.youtube-nocookie.com",
    ].includes(url.hostname)
  ) {
    const id =
      url.hostname === "youtu.be"
        ? url.pathname.slice(1)
        : url.pathname.startsWith("/embed/")
          ? url.pathname.slice(7)
          : url.pathname === "/watch"
            ? url.searchParams.get("v")
            : null;
    return id && /^[A-Za-z0-9_-]{11}$/.test(id)
      ? { kind: "embed", src: `https://www.youtube-nocookie.com/embed/${id}` }
      : null;
  }
  if (
    ["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(url.hostname)
  ) {
    const id = url.pathname.replace(/^\/video\//, "/").slice(1);
    if (/^\d+$/.test(id))
      return { kind: "embed", src: `https://player.vimeo.com/video/${id}` };
  }
  return null;
}
