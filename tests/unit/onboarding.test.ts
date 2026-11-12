import { describe, expect, it } from "vitest";
import {
  shouldOfferSave,
  readSavePromptHistory,
} from "../../src/lib/onboarding";
describe("save progress invitation", () => {
  it("appears only after the first completed lesson without an account", () => {
    expect(shouldOfferSave(false, false, null, 0)).toBe(false);
    expect(shouldOfferSave(true, true, null, 0)).toBe(false);
    expect(shouldOfferSave(true, false, null, 0)).toBe(true);
  });
  it("does not repeat on reload, offers once after seven days, then stops", () => {
    const first = { firstShownAt: 1000, shown: 1 };
    expect(shouldOfferSave(true, false, first, 1001)).toBe(false);
    expect(shouldOfferSave(true, false, first, 1000 + 7 * 86400000 - 1)).toBe(
      false,
    );
    expect(shouldOfferSave(true, false, first, 1000 + 7 * 86400000)).toBe(true);
    expect(
      shouldOfferSave(
        true,
        false,
        { ...first, shown: 2 },
        1000 + 14 * 86400000,
      ),
    ).toBe(false);
  });
  it("rejects corrupt persisted history", () => {
    for (const value of [
      null,
      "invalid",
      "null",
      "{}",
      '{"firstShownAt":"bad","shown":1}',
    ])
      expect(readSavePromptHistory(value)).toBeNull();
  });
});
