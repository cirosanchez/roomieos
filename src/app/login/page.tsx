import type { Metadata } from "next";
import { LoginScreen } from "@/features/demo-login/login-screen";

export const metadata: Metadata = { title: "Demo login" };
export default function LoginPage() {
  return <LoginScreen />;
}
