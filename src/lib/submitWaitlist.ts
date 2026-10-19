import type { Role } from "./validators";
export async function submitWaitlist(body: {
  email: string;
  website: string;
  role?: Role;
}) {
  const response = await fetch("/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 429) return "rate_limited" as const;
  if (!response.ok) return "server_error" as const;
  const data = await response.json();
  return data.ok === true ? ("success" as const) : ("server_error" as const);
}
