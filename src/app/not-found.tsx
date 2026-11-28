import Link from "next/link";
import { House } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
      <House aria-hidden="true" className="mb-6 size-8 text-muted" />
      <h1 className="text-2xl font-bold">This room isn&apos;t here</h1>
      <p className="mt-3 text-muted">
        We couldn&apos;t find that page. Head back to the household workspace.
      </p>
      <Link href="/dashboard" className={buttonStyles("primary", "mt-6")}>
        Back to workspace
      </Link>
    </main>
  );
}
