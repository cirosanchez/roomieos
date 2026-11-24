import type { Metadata } from "next";
import { ExpensesScreen } from "@/features/expenses/expenses-screen";

export const metadata: Metadata = { title: "Expenses" };
export default function ExpensesPage() {
  return <ExpensesScreen />;
}
