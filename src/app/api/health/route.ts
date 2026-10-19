import { serviceHealth, showDevStatus } from "@/lib/env";
export function GET() {
  return showDevStatus()
    ? Response.json(serviceHealth(), {
        headers: { "Cache-Control": "no-store" },
      })
    : new Response(null, { status: 404 });
}
