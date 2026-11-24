import type { Metadata } from "next";
import { ChoresScreen } from "@/features/chores/chores-screen";

export const metadata: Metadata = { title: "Chores" };
export default function ChoresPage() {
  return <ChoresScreen />;
}
