export type HeroAsset = {
  id: string;
  src: string;
  width: number;
  height: number;
  className: string;
};

export const heroAssets: readonly HeroAsset[] = [
  "uno",
  "breadboard",
  "sensor",
  "servo",
  "led",
  "resistor",
].map((id) => ({
  id,
  src: `/images/landing/cobalt/${id}-640.webp`,
  width: 640,
  height: 640,
  className: `hero-component-${id}`,
}));
