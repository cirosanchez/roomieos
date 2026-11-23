import { AppShell } from "@/components/app-shell";
import { HouseholdGate } from "@/state/household-gate";

export default function HouseholdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HouseholdGate>
      <AppShell>{children}</AppShell>
    </HouseholdGate>
  );
}
