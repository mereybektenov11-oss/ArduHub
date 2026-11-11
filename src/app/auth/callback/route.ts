import { requestOrigin } from "@/lib/requestOrigin";
import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const client = await serverSupabase();
  if (code && client) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(
          url.searchParams.get("next") === "reset"
            ? "/auth/reset"
            : url.searchParams.get("next") === "profile"
              ? "/app/profile"
              : "/app",
          requestOrigin(request),
        ),
      );
  }
  return NextResponse.redirect(
    new URL("/auth/reset?expired=1", requestOrigin(request)),
  );
}
