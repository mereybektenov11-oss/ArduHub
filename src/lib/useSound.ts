"use client";
import { useProgress } from "./useProgress";
import { configureSfx, unlockSfx } from "./sfx";
export function useSound() {
  const { progress, update } = useProgress();
  const enabled = progress.settings?.sounds !== false;
  const volume = progress.settings?.soundVolume ?? 0.5;
  const change = (on: boolean, value: number) => {
    configureSfx({ enabled: on, volume: value });
    unlockSfx();
    update((p) => ({
      ...p,
      settings: {
        ...p.settings,
        textScale: p.settings?.textScale ?? 1,
        sounds: on,
        soundVolume: value,
      },
    }));
  };
  return {
    enabled,
    volume,
    toggle: () => change(!enabled, volume),
    setVolume: (value: number) => change(enabled, value),
  };
}
