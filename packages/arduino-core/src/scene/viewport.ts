export function fitSceneToViewport(
  scene: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  if (viewport.width <= 0 || viewport.height <= 0) return 1;
  return Math.max(
    0.01,
    Math.min(
      1,
      (viewport.width - 2) / Math.max(1, scene.width),
      (viewport.height - 2) / Math.max(1, scene.height),
    ),
  );
}
