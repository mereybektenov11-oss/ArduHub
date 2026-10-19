export const breadboardPins = Array.from(
  { length: 30 },
  (_, i) => i + 1,
).flatMap((column) => [
  ..."abcdefghij".split("").map((row, i) => ({
    name: `${column}${row}`,
    x: 30 + (column - 1) * 12,
    y: i < 5 ? 50 + i * 10 : 120 + (i - 5) * 10,
  })),
  ...["tp", "tn", "bp", "bn"].map((rail, i) => ({
    name: `${rail}${column}`,
    x: 30 + (column - 1) * 12,
    y: [10, 25, 185, 200][i],
  })),
]);
export function breadboardGroup(pin: string) {
  const strip = pin.match(/^(\d+)([a-j])$/);
  if (strip) return `${strip[1]}${strip[2] <= "e" ? "left" : "right"}`;
  return pin.match(/^(tp|tn|bp|bn)\d+$/)?.[1] ?? pin;
}
