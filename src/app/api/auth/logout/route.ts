import { sameOrigin } from "@/lib/requestOrigin";
import { cookies } from "next/headers";
import { serverSupabase } from "@/lib/supabase/server";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const client = await serverSupabase();
  await client?.auth.signOut();
  (await cookies()).delete("arduhub-guest");
  return Response.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
