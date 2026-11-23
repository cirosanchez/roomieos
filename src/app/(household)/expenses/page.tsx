import type { Metadata } from "next";
import { FoundationScreen } from "@/features/foundation/foundation-screen";

export const metadata: Metadata = { title: "Expenses" };
export default function ExpensesPage() {
  return <FoundationScreen section="expenses" />;
}
