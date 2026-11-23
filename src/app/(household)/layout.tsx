import { AppShell } from "@/components/app-shell";

export default function HouseholdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
