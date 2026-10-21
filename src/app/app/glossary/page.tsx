import { redirect } from "next/navigation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const { term } = await searchParams;
  redirect(
    `/app/practice?tab=glossary${term ? `&term=${encodeURIComponent(term)}` : ""}`,
  );
}
