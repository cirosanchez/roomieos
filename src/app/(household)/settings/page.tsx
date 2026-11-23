import type { Metadata } from "next";
import { FoundationScreen } from "@/features/foundation/foundation-screen";

export const metadata: Metadata = { title: "Settings" };
export default function SettingsPage() {
  return <FoundationScreen section="settings" />;
}
