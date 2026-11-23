import type { Metadata } from "next";
import Link from "next/link";
import { House, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { buttonStyles } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";

export const metadata: Metadata = { title: "Welcome" };

export default function WelcomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-4 py-10 sm:px-8 sm:py-16">
      <Link
        href="/"
        className="mb-12 inline-flex self-start"
        aria-label="RoomieOS dashboard"
      >
        <Wordmark />
      </Link>
      <header>
        <span className="mb-5 flex size-12 items-center justify-center rounded-[10px] bg-subtle text-muted">
          <House aria-hidden="true" className="size-6" />
        </span>
        <h1 className="text-[30px] font-bold leading-tight tracking-tight sm:text-4xl">
          Your shared home, organized.
        </h1>
        <p className="mt-4 max-w-lg text-base text-muted">
          A little less household admin. A little more room to live.
        </p>
      </header>
      <div className="mt-9">
        <InlineNotice>
          Foundation preview · Household setup will be available in the next
          milestone. These are the two planned ways to begin.
        </InlineNotice>
      </div>
      <div className="my-6 grid gap-4 sm:grid-cols-2">
        <section className="rounded-[10px] border border-line bg-subtle p-6">
          <Sparkles aria-hidden="true" className="mb-5 size-5 text-accent" />
          <h2 className="text-lg font-semibold">Explore a sample household</h2>
          <p className="mt-2 text-sm text-muted">
            Meet Maple House: three roommates, everyday chores and shared
            purchases. A ready-made starting point to explore.
          </p>
        </section>
        <section className="rounded-[10px] border border-line p-6">
          <UsersRound aria-hidden="true" className="mb-5 size-5 text-muted" />
          <h2 className="text-lg font-semibold">Start from scratch</h2>
          <p className="mt-2 text-sm text-muted">
            Choose a household name, currency and two to five roommates. Begin
            with a clean slate.
          </p>
        </section>
      </div>
      <p className="flex items-start gap-2 text-sm text-muted">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        The prototype will save in this browser only. No sign-in or cross-device
        synchronization.
      </p>
      <Link href="/" className={buttonStyles("secondary", "mt-8 self-start")}>
        Back to workspace
      </Link>
    </main>
  );
}
