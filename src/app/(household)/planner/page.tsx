import type { Metadata } from "next";
import { PlannerScreen } from "@/features/planner/planner-screen";
export const metadata: Metadata = { title: "Planner" };
export default function PlannerPage() {
  return <PlannerScreen />;
}
