import Link from "next/link";
import Image from "next/image";
import { BookOpen, CheckSquare, Monitor, Wallet } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { buttonStyles } from "@/components/ui/button";

const features = [
  {
    Icon: CheckSquare,
    title: "Share the chores",
    text: "Know what's yours to do. Keep track of due dates, rotate responsibilities and see what's done.",
  },
  {
    Icon: Wallet,
    title: "Make expenses clear",
    text: "Split shared costs, see who owes whom and record when you've settled up outside the app.",
  },
  {
    Icon: BookOpen,
    title: "Get on the same page",
    text: "Keep your house agreements in one place, from quiet hours to the way you share your space.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-10">
        <Link href="/" aria-label="RoomieOS home" className="rounded-lg">
          <Wordmark />
        </Link>
        <Link href="/login" className={buttonStyles("secondary")}>
          Log in
        </Link>
      </header>
      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl flex-1 px-5 pt-14 pb-16 sm:px-10 sm:pt-24"
      >
        <section className="max-w-3xl">
          <p className="mb-5 text-sm font-medium text-accent">
            A little less housework. A little more harmony.
          </p>
          <h1 className="text-5xl leading-[1.08] font-semibold tracking-tight sm:text-7xl">
            Your shared home,
            <br />
            <span className="text-accent">organized.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">
            Chores, shared expenses and house agreements. One calm place to keep
            roommate life running smoothly.
          </p>
          <Link href="/login" className={buttonStyles("primary", "mt-8 px-6")}>
            Get started
          </Link>
        </section>
        <figure className="mt-14 sm:mt-16">
          <div className="overflow-hidden rounded-xl border border-line bg-subtle">
            <Image
              src="/images/dashboard-preview.jpg"
              alt="Maple House dashboard showing Avery's pending chores, outstanding balance and household overview."
              width={1280}
              height={900}
              unoptimized
              className="h-auto w-full"
            />
          </div>
          <figcaption className="mt-3 text-sm text-muted">
            A look inside Maple House, our sample household.
          </figcaption>
        </figure>
        <section
          aria-label="A simpler way to live together"
          className="mt-16 grid gap-4 sm:mt-24 md:grid-cols-3"
        >
          {features.map(({ Icon, title, text }) => (
            <article
              key={title}
              className="rounded-xl border border-line bg-subtle p-6"
            >
              <span className="mb-5 inline-flex size-11 items-center justify-center rounded-lg border border-line bg-page text-accent">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </article>
          ))}
        </section>
      </main>
      <footer className="border-t border-line px-5 py-6">
        <p className="mx-auto flex max-w-6xl items-start gap-2 text-sm text-muted sm:px-5">
          <Monitor aria-hidden="true" className="mt-0.5 size-4 shrink-0" />A
          local demo for shared living. Saved in this browser only; nothing
          syncs between devices.
        </p>
      </footer>
    </div>
  );
}
