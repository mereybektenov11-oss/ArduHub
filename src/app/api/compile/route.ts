import { createCompileHandler } from "@/services/compile/handler";
import { sameOrigin } from "@/lib/requestOrigin";
export const runtime = "nodejs";
const handle = createCompileHandler({
  url: process.env.COMPILER_API_URL || process.env.COMPILER_URL,
  key: process.env.COMPILER_API_KEY || process.env.COMPILER_SECRET,
});
export async function POST(request: Request) {
  if (process.env.LOCAL_COMPILER === "true") {
    const host = request.headers.get("host") ?? "";
    if (
      !/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host) ||
      !sameOrigin(request)
    )
      return Response.json({ error: "forbidden" }, { status: 403 });
  }
  return handle(request);
}
