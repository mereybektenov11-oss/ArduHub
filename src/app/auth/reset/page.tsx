import AuthCard from "@/components/auth/AuthCard";
import "../../sign-in/auth.css";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { expired } = await searchParams;
  return (
    <AuthCard
      initialMode={expired ? "forgot" : "reset"}
      initialExpired={!!expired}
    />
  );
}
