import { expect, test } from "vitest";
import { recoverySession } from "../../src/domain/auth";
test("recovery fragments supply both tokens without treating ordinary sign-ins as reset", () => {
  expect(
    recoverySession("#type=recovery&access_token=access&refresh_token=refresh"),
  ).toEqual({ access_token: "access", refresh_token: "refresh" });
  expect(
    recoverySession("#type=signup&access_token=access&refresh_token=refresh"),
  ).toBeNull();
  expect(recoverySession("#type=recovery&access_token=access")).toBeNull();
  expect(
    recoverySession("#error=access_denied&error_code=otp_expired"),
  ).toBeNull();
});
