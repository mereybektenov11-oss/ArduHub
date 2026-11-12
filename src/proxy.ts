import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin } from "@/lib/requestOrigin";
import { supabaseFetch } from "@/lib/supabase/fetch";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const guest = request.cookies.get("arduhub-guest")?.value === "1";
  if (url && key) {
    try {
      const client = createServerClient(url, key, {
        global: { fetch: supabaseFetch },
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll(values) {
            values.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({ request });
            values.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      });
      const { data, error } = await client.auth.getUser();
      if (!error && data.user) {
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      }
    } catch {
      /* Redirect to sign-in; local drafts stay in the browser. */
    }
  }
  if (guest) return response;
  return NextResponse.redirect(new URL("/sign-in", requestOrigin(request)));
}
export const config = { matcher: ["/app/:path*"] };
