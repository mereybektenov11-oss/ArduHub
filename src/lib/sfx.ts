"use client";
export type SfxId = "tap" | "success" | "retry";
let enabled = true;
let lastTap = -Infinity;
export function configureSfx(settings: { enabled: boolean }) {
  enabled = settings.enabled;
}
export function playSfx(id: SfxId) {
  if (!enabled || typeof window === "undefined" || !window.AudioContext) return;
  const now = performance.now();
  if (id === "tap" && now - lastTap < 70) return;
  if (id === "tap") lastTap = now;
  try {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const length = id === "tap" ? 0.045 : 0.14;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
      id === "success" ? 660 : id === "retry" ? 300 : 480,
      audio.currentTime,
    );
    if (id === "success")
      oscillator.frequency.exponentialRampToValueAtTime(
        880,
        audio.currentTime + length,
      );
    gain.gain.setValueAtTime(0.025, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + length);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.onended = () => {
      void audio.close();
    };
    void audio
      .resume()
      .then(() => {
        oscillator.start();
        oscillator.stop(audio.currentTime + length);
      })
      .catch(() => {
        void audio.close();
      });
  } catch {
    /* Sound is optional; blocked audio never interrupts learning. */
  }
}
