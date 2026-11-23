"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { BookOpen, CheckSquare, House, Wallet } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { useReadyHousehold } from "@/state/household-provider";
import { activeMembers } from "@/domain/household";
import { displayDate, localDate } from "@/domain/dates";

function subscribeDate(listener: () => void) {
  window.addEventListener("focus", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}
function useToday() {
  return useSyncExternalStore(
    subscribeDate,
    () => localDate(new Date()),
    () => "",
  );
}
const sections = {
  chores: {
    title: "Chores",
    description: "A little clarity for the everyday things.",
    Icon: CheckSquare,
  },
  expenses: {
    title: "Expenses",
    description: "Track shared spending without the spreadsheet.",
    Icon: Wallet,
  },
  agreements: {
    title: "House agreements",
    description: "Keep the expectations you share in one place.",
    Icon: BookOpen,
  },
};

export function FoundationScreen({
  section,
}: {
  section: keyof typeof sections;
}) {
  const { state } = useReadyHousehold();
  const today = useToday();
  const { title, description, Icon } = sections[section];
  const records =
    section === "chores"
      ? state.chores
      : section === "expenses"
        ? state.expenses
        : state.agreements;
  const nameFor = (id: string) =>
    state.members.find((member) => member.id === id)!.name;
  const money = (cents: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: state.household.currency,
      currencyDisplay: "code",
    }).format(cents / 100);
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        icon={<Icon className="size-6" />}
      />
      <InlineNotice>
        Household data is saved locally.{" "}
        {section === "chores"
          ? "Chore editing, history details and the board are coming next."
          : section === "expenses"
            ? "Expense editing, balances and settlement controls are coming soon."
            : "Agreement editing is coming soon."}
      </InlineNotice>
      <div className="mt-6">
        {records.length === 0 ? (
          <EmptyState
            icon={<Icon className="size-6" />}
            title={
              section === "chores"
                ? "Nothing on the chore board"
                : section === "expenses"
                  ? "No shared expenses yet"
                  : "Set the ground rules"
            }
          >
            <p>
              Your empty household is ready. Editing tools will appear as the
              next milestones are completed.
            </p>
          </EmptyState>
        ) : (
          <ul
            className="divide-y divide-line rounded-[10px] border border-line"
            aria-label={title}
          >
            {section === "chores" &&
              state.chores.map((chore) => (
                <li
                  key={chore.id}
                  className="flex flex-wrap items-start justify-between gap-3 p-5"
                >
                  <div className="min-w-0">
                    <h2 className="break-words text-base font-semibold">
                      {chore.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {nameFor(chore.assigneeId)} · {displayDate(chore.dueDate)}
                    </p>
                    {chore.notes && (
                      <p className="mt-2 break-words text-sm text-muted">
                        {chore.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={chore.status} />
                    {chore.status === "pending" && chore.dueDate < today && (
                      <span className="text-sm font-medium text-danger">
                        Overdue
                      </span>
                    )}
                  </div>
                </li>
              ))}
            {section === "expenses" &&
              state.expenses.map((expense) => (
                <li key={expense.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-base font-semibold">
                        {expense.description}
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        {expense.category} · {displayDate(expense.date)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold tabular-nums">
                        {money(expense.amountCents)}
                      </span>
                      <StatusPill status={expense.status} />
                    </div>
                  </div>
                  <details className="mt-4 text-sm">
                    <summary className="w-fit rounded text-accent">
                      View contributions and shares
                    </summary>
                    <div className="mt-3 grid gap-4 rounded-[7px] bg-subtle p-4 sm:grid-cols-2">
                      <div>
                        <h3 className="font-semibold">Who paid</h3>
                        {expense.payers.map((row) => (
                          <p key={row.memberId} className="mt-1 text-muted">
                            {nameFor(row.memberId)} · {money(row.amountCents)}
                          </p>
                        ))}
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          Who shares · {expense.splitMethod}
                        </h3>
                        {expense.participants.map((row) => (
                          <p key={row.memberId} className="mt-1 text-muted">
                            {nameFor(row.memberId)} · {money(row.amountCents)}
                          </p>
                        ))}
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            {section === "agreements" &&
              state.agreements.map((agreement) => (
                <li key={agreement.id} className="p-5">
                  <h2 className="break-words text-base font-semibold">
                    {agreement.title}
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted">
                    {agreement.details}
                  </p>
                </li>
              ))}
          </ul>
        )}
      </div>
    </>
  );
}

export function FoundationDashboard() {
  const { state } = useReadyHousehold();
  const selected = state.members.find(
    (member) => member.id === state.selectedMemberId,
  )!;
  const upcoming = state.chores
    .filter(
      (chore) => chore.assigneeId === selected.id && chore.status === "pending",
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return (
    <>
      <PageHeader
        title={state.household.name}
        description={`Your household from ${selected.name}'s perspective.`}
        icon={<House className="size-6" />}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "My pending chores", value: upcoming.length },
          {
            label: "Open household expenses",
            value: state.expenses.filter((expense) => expense.status === "open")
              .length,
          },
          { label: "Active roommates", value: activeMembers(state).length },
        ].map(({ label, value }) => (
          <section
            key={label}
            className="rounded-[10px] border border-line p-5"
          >
            <h2 className="text-sm text-muted">{label}</h2>
            <p className="mt-3 text-[28px] font-semibold leading-tight tabular-nums">
              {value}
            </p>
          </section>
        ))}
      </div>
      <section className="mt-9">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">My upcoming chores</h2>
          <Link href="/chores" className={buttonStyles("ghost")}>
            View chores
          </Link>
        </div>
        {upcoming.length ? (
          <ul className="divide-y divide-line rounded-[10px] border border-line">
            {upcoming.map((chore) => (
              <li
                key={chore.id}
                className="flex flex-wrap justify-between gap-2 p-4"
              >
                <span className="font-medium">{chore.title}</span>
                <span className="text-sm text-muted">
                  {displayDate(chore.dueDate)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<CheckSquare className="size-6" />}
            title="No pending chores assigned"
          >
            <p>There are no pending chores for {selected.name}.</p>
          </EmptyState>
        )}
      </section>
      <div className="mt-8">
        <InlineNotice>
          Saved on this browser only. Chore editing, expense balances and
          agreement editing are still in development.{" "}
          <Link
            href="/settings"
            className="font-medium text-accent underline underline-offset-4"
          >
            Manage your household in Settings.
          </Link>
        </InlineNotice>
      </div>
    </>
  );
}
