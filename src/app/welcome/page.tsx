import type { Metadata } from "next";
import { HouseholdGate } from "@/state/household-gate";
import { WelcomeScreen } from "@/features/setup/welcome-screen";

export const metadata: Metadata = { title: "Welcome" };
export default function WelcomePage() {
  return (
    <HouseholdGate welcome>
      <WelcomeScreen />
    </HouseholdGate>
  );
}
