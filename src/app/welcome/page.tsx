import { DemoLoginGate } from "@/features/demo-login/demo-login-provider";
import type { Metadata } from "next";
import { HouseholdGate } from "@/state/household-gate";
import { WelcomeScreen } from "@/features/setup/welcome-screen";

export const metadata: Metadata = { title: "Welcome" };
export default function WelcomePage() {
  return (
    <DemoLoginGate>
      <HouseholdGate welcome>
        <WelcomeScreen />
      </HouseholdGate>
    </DemoLoginGate>
  );
}
