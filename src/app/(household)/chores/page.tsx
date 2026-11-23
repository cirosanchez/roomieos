import type { Metadata } from "next";
import { FoundationScreen } from "@/features/foundation/foundation-screen";

export const metadata: Metadata = { title: "Chores" };
export default function ChoresPage() {
  return <FoundationScreen section="chores" />;
}
