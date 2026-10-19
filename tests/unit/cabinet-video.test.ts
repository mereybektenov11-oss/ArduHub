import { it, expect } from "vitest";
import { cabinetVideo } from "@/lib/cabinetVideo";
it("allows local lessons and known video hosts without arbitrary embeds", () => {
  expect(cabinetVideo(null)).toBeNull();
  expect(cabinetVideo("javascript:alert(1)")).toBeNull();
  expect(cabinetVideo("bad")).toBeNull();
  expect(cabinetVideo("http://youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  expect(cabinetVideo("https://untrusted.example/video")).toBeNull();
  expect(cabinetVideo("https://youtube.com/watch?v=bad")).toBeNull();
  expect(cabinetVideo("https://youtu.be/dQw4w9WgXcQ")?.src).toBe(
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  );
  expect(
    cabinetVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.kind,
  ).toBe("embed");
  expect(
    cabinetVideo("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")?.kind,
  ).toBe("embed");
  expect(cabinetVideo("https://vimeo.com/12345")?.src).toBe(
    "https://player.vimeo.com/video/12345",
  );
  expect(cabinetVideo("https://player.vimeo.com/video/12345")?.kind).toBe(
    "embed",
  );
  expect(cabinetVideo("https://vimeo.com/bad")).toBeNull();
  expect(cabinetVideo("/videos/lesson-1.mp4")).toEqual({
    kind: "file",
    src: "/videos/lesson-1.mp4",
  });
  expect(cabinetVideo("/videos/../bad.mp4")).toBeNull();
});
