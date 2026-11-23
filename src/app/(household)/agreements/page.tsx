import type { Metadata } from "next";
import { FoundationScreen } from "@/features/foundation/foundation-screen";

export const metadata: Metadata = { title: "Agreements" };
export default function AgreementsPage() {
  return <FoundationScreen section="agreements" />;
}
