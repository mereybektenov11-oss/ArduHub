import AuthCard from "@/components/auth/AuthCard";
import "../sign-in/auth.css";

export const metadata = {
  title: "Регистрация · ArduHub",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AuthCard initialMode="register" />;
}
