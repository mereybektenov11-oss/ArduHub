import ProfilePage from "@/components/profile/ProfilePage";
import { serverSupabase } from "@/lib/supabase/server";
export default async function Page() {
  const client = await serverSupabase();
  const user = client ? (await client.auth.getUser()).data.user : null;
  return (
    <ProfilePage
      identity={
        user
          ? {
              email: user.email,
              createdAt: user.created_at,
              id: user.id,
              name:
                typeof user.user_metadata?.display_name === "string"
                  ? user.user_metadata.display_name
                  : undefined,
            }
          : undefined
      }
    />
  );
}
