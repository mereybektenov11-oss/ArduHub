import { authRu as c } from "@/content/dashboard.ru";
export const normalizeAuthEmail = (email: string) => email.trim().toLowerCase();
export function validateRegistration(data: {
  name: string;
  password: string;
  repeat: string;
  consent: boolean;
}) {
  return !data.name.trim() || data.name.trim().length > 20
    ? c.badName
    : data.password.length < 8
      ? c.short
      : data.password !== data.repeat
        ? c.mismatch
        : !data.consent
          ? c.consent
          : null;
}
export function authError(code?: string) {
  return code === "email_not_confirmed"
    ? c.confirm
    : code === "over_request_rate_limit" ||
        code === "over_email_send_rate_limit"
      ? c.rate
      : c.invalid;
}
