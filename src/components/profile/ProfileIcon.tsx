export default function ProfileIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    user: "M20 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    chart: "M4 4v16h16M8 16v-4m5 4V8m5 8v-6",
    settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
    code: "M3 4h18v13H3zM8 21h8m-4-4v4",
  };
  return (
    <svg
      className="profile-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.user} />
    </svg>
  );
}
