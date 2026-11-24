import type { Metadata } from "next";
import { AgreementsScreen } from "@/features/agreements/agreements-screen";

export const metadata: Metadata = { title: "Agreements" };
export default function AgreementsPage() {
  return <AgreementsScreen />;
}
