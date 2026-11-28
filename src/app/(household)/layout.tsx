import { DemoLoginGate } from "@/features/demo-login/demo-login-provider";
import { AppShell } from "@/components/app-shell";
import { HouseholdGate } from "@/state/household-gate";

export default function HouseholdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoLoginGate>
      <HouseholdGate>
        <AppShell>{children}</AppShell>
      </HouseholdGate>
    </DemoLoginGate>
  );
}
