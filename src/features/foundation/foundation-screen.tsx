import Link from "next/link";
import {
  BookOpen,
  CheckSquare,
  House,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { PageHeader } from "@/components/ui/page-header";

const sections = {
  chores: {
    title: "Chores",
    description: "A little clarity for the everyday things.",
    Icon: CheckSquare,
    emptyTitle: "A place for everyone's part",
    body: "Chore assignments, due dates and completion history will live here. Household setup comes first.",
  },
  expenses: {
    title: "Expenses",
    description: "Track shared spending without the spreadsheet.",
    Icon: Wallet,
    emptyTitle: "Shared spending, made clearer",
    body: "Payer contributions, expense splits and outstanding balances will live here after household setup and expense tools are implemented.",
  },
  agreements: {
    title: "House agreements",
    description: "Keep the expectations you share in one place.",
    Icon: BookOpen,
    emptyTitle: "A home for your ground rules",
    body: "Quiet hours, cleaning supplies and guest etiquette are a few things you might agree on. Agreement editing comes in a later milestone.",
  },
  settings: {
    title: "Settings",
    description: "The details that make a household yours.",
    Icon: Settings,
    emptyTitle: "Your household starts here",
    body: "Household name, currency and roommate settings arrive with setup in the next milestone. No household has been created in this preview.",
  },
} satisfies Record<
  string,
  {
    title: string;
    description: string;
    Icon: LucideIcon;
    emptyTitle: string;
    body: string;
  }
>;

export function FoundationScreen({
  section,
}: {
  section: keyof typeof sections;
}) {
  const { title, description, Icon, emptyTitle, body } = sections[section];
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        icon={<Icon className="size-6" />}
      />
      <EmptyState
        icon={<Icon className="size-6" />}
        title={emptyTitle}
        action={
          <Link href="/welcome" className={buttonStyles("secondary")}>
            About household setup
          </Link>
        }
      >
        <p>{body}</p>
      </EmptyState>
      <div className="mt-6">
        <InlineNotice>
          Foundation preview · This screen has no household data yet.
        </InlineNotice>
      </div>
    </>
  );
}

export function FoundationDashboard() {
  return (
    <>
      <PageHeader
        title="Your shared home, organized."
        description="A calmer way to share your space."
        icon={<House className="size-6" />}
      />
      <section className="rounded-[10px] border border-line p-6 sm:p-8">
        <span className="text-xs font-medium text-accent">
          Welcome to RoomieOS
        </span>
        <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
          Less keeping track. More feeling at home.
        </h2>
        <p className="mt-3 max-w-xl text-base text-muted">
          One thoughtful workspace for the chores, shared purchases and small
          agreements that keep a household running.
        </p>
        <Link href="/welcome" className={buttonStyles("primary", "mt-6")}>
          About household setup
        </Link>
      </section>
      <div className="mt-10 grid gap-6 md:grid-cols-3 md:gap-5">
        {[
          {
            href: "/chores",
            title: "Share the everyday",
            text: "A clear place for chores, due dates and whose turn comes next.",
            Icon: CheckSquare,
          },
          {
            href: "/expenses",
            title: "Make spending clear",
            text: "See who paid, how costs are shared and what remains outstanding.",
            Icon: Wallet,
          },
          {
            href: "/agreements",
            title: "Find common ground",
            text: "Keep your household's expectations easy to find and understand.",
            Icon: BookOpen,
          },
        ].map(({ href, title, text, Icon }) => (
          <Link
            href={href}
            key={href}
            className="group rounded-[10px] border border-transparent p-3 transition-colors hover:border-line hover:bg-subtle"
          >
            <Icon aria-hidden="true" className="mb-4 size-5 text-muted" />
            <h2 className="text-base font-semibold group-hover:text-accent">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
          </Link>
        ))}
      </div>
      <div className="mt-10 border-t border-line pt-6">
        <InlineNotice>
          Foundation preview · Navigation and layout are ready. Sample and empty
          household setup, personal summaries and browser saving are next.
        </InlineNotice>
      </div>
    </>
  );
}
