export const roles = [
  "student",
  "teacher",
  "school",
  "parent",
  "other",
] as const;
export type Role = (typeof roles)[number];
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (
    email.length > 254 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(
      email,
    )
  )
    return null;
  return email;
}
export function validRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (roles as readonly string[]).includes(value)
  );
}
