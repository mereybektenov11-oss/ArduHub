import { showDevStatus } from "@/lib/env";
import { sameOrigin } from "@/lib/requestOrigin";
import { createRateLimiter } from "@/lib/rateLimit";
import { probeCompiler } from "@/services/compile/probe";
import { compilerStatusRu as c } from "@/content/compiler";

export const runtime = "nodejs";
export const maxDuration = 45;
const limiter = createRateLimiter(3);
export async function POST(request: Request) {
  if (!showDevStatus())
    return Response.json({ error: "not_found" }, { status: 404 });
  if (!sameOrigin(request))
    return Response.json({ message: c.forbidden }, { status: 403 });
  if (!limiter.check("compiler-probe"))
    return Response.json({ message: c.busy }, { status: 429 });
  const result = await probeCompiler({
    url: process.env.COMPILER_API_URL || process.env.COMPILER_URL,
    key: process.env.COMPILER_API_KEY || process.env.COMPILER_SECRET,
  });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
