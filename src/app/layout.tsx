import type { Metadata } from "next";
import "./globals.css";
import { HouseholdProvider } from "@/state/household-provider";

export const metadata: Metadata = {
  title: { default: "RoomieOS", template: "%s · RoomieOS" },
  description:
    "Your shared home, organized. A local household prototype for chores, expenses and house agreements.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh text-base leading-relaxed antialiased">
        <HouseholdProvider>{children}</HouseholdProvider>
      </body>
    </html>
  );
}
