export const onboardingKey = (userId?: string) =>
  `arduhub.onboarding.v1:${userId || "local"}`;
export const savePromptKey = (userId?: string) =>
  `arduhub.save-prompt.v1:${userId || "local"}`;
export type SavePromptHistory = { firstShownAt: number; shown: number };
export function shouldOfferSave(
  completed: boolean,
  account: boolean,
  history: SavePromptHistory | null,
  now: number,
): boolean {
  if (!completed || account) return false;
  if (!history) return true;
  return history.shown === 1 && now - history.firstShownAt >= 7 * 86400000;
}
export function readSavePromptHistory(
  value: string | null,
): SavePromptHistory | null {
  if (!value) return null;
  try {
    const history = JSON.parse(value);
    return Number.isFinite(history.firstShownAt) &&
      Number.isInteger(history.shown) &&
      history.shown >= 1
      ? history
      : null;
  } catch {
    return null;
  }
}
