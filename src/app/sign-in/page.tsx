import AuthCard from "@/components/auth/AuthCard";
import "./auth.css";
export const metadata = {
  title: "Вход · ArduHub",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <AuthCard />;
}
