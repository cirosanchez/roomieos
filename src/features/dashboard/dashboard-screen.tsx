"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckSquare, House, Plus } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { isOverdue } from "@/domain/chores";
import { dashboardSummary } from "@/domain/dashboard";
import { displayDate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import { useReadyHousehold } from "@/state/household-provider";
import { useToday } from "@/state/use-today";
import { ChoreForm } from "../chores/chore-form";
import { ChoreDetails } from "../chores/chore-details";

export function DashboardScreen() {
  const { state, store, conflict } = useReadyHousehold();
  const summary = dashboardSummary(state);
  const today = useToday();
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedChore = state.chores.find((chore) => chore.id === selectedId);
  function focusAdd() {
    requestAnimationFrame(() =>
      document.getElementById("dashboard-add-chore")?.focus(),
    );
  }
  function closeDetails() {
    const stillListed = summary.pendingChores.some(
      (chore) => chore.id === selectedId,
    );
    setSelectedId(null);
    if (!stillListed) focusAdd();
  }
  return (
    <>
      <PageHeader
        title={state.household.name}
        description={`Your household from ${summary.selected.name}'s perspective.`}
        icon={<House className="size-6" />}
        action={
          <Button
            id="dashboard-add-chore"
            disabled={conflict}
            onClick={() => {
              store.dismissFeedback();
              setCreating(true);
            }}
          >
            <Plus aria-hidden="true" className="size-4" />
            Add a chore
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "My pending chores", value: summary.pendingChores.length },
          {
            label: "My balance",
            value: formatMoney(
              Math.abs(summary.netCents),
              state.household.currency,
            ),
            help:
              summary.netCents > 0
                ? "You are owed"
                : summary.netCents < 0
                  ? "You owe"
                  : "All settled",
          },
          { label: "Open household expenses", value: summary.openExpenseCount },
        ].map(({ label, value, help }) => (
          <section
            key={label}
            aria-label={label}
            className="min-w-0 rounded-[10px] border border-line p-5"
          >
            <h2 className="text-sm text-muted">{label}</h2>
            <p className="mt-3 break-words text-[28px] font-semibold leading-tight tabular-nums">
              {value}
            </p>
            {help && <p className="mt-2 text-sm text-muted">{help}</p>}
          </section>
        ))}
      </div>
      <div className="mt-9 grid items-start gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="min-w-0" aria-labelledby="upcoming-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="upcoming-heading" className="text-lg font-semibold">
              My upcoming chores
            </h2>
            <Link href="/chores" className={buttonStyles("ghost")}>
              View chores
            </Link>
          </div>
          {summary.pendingChores.length ? (
            <ul className="divide-y divide-line rounded-[10px] border border-line">
              {summary.pendingChores.map((chore) => (
                <li key={chore.id} className="space-y-2 p-4">
                  <Button
                    variant="ghost"
                    className="h-auto min-w-0 whitespace-normal justify-start px-0 hover:bg-transparent min-h-11 max-w-full rounded text-left font-semibold text-accent underline-offset-4 hover:underline [overflow-wrap:anywhere]"
                    onClick={() => {
                      store.dismissFeedback();
                      setSelectedId(chore.id);
                    }}
                  >
                    {chore.title}
                  </Button>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <time
                      dateTime={chore.dueDate}
                      className="text-sm text-muted"
                    >
                      Due {displayDate(chore.dueDate)}
                    </time>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={chore.status} />
                      {isOverdue(chore, today) && (
                        <span className="text-xs font-medium text-danger">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<CheckSquare className="size-6" />}
              title="No pending chores assigned"
            >
              <p>
                There are no pending chores for {summary.selected.name}. Use Add
                a chore to plan the next household task.
              </p>
            </EmptyState>
          )}
        </section>
        <section
          aria-labelledby="snapshot-heading"
          className="min-w-0 rounded-[10px] border border-line bg-subtle p-5"
        >
          <h2 id="snapshot-heading" className="text-lg font-semibold">
            Household at a glance
          </h2>
          <p className="mt-2 text-sm text-muted">
            Across {summary.activeMemberCount} active roommates.
          </p>
          <dl className="mt-5 space-y-4">
            {[
              ["Pending chores", summary.choreCounts.pending],
              ["Completed chores", summary.choreCounts.completed],
              ["Skipped chores", summary.choreCounts.skipped],
              ["Open expenses", summary.openExpenseCount],
            ].map(([label, count]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <dt className="min-w-0 text-muted">{label}</dt>
                <dd className="font-semibold tabular-nums">{count}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 border-t border-line pt-4">
            <Link
              href="/agreements"
              className="inline-flex min-h-11 max-w-full items-center rounded text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              {summary.agreementCount
                ? `View ${summary.agreementCount} house ${summary.agreementCount === 1 ? "agreement" : "agreements"}`
                : "Add a house agreement"}
            </Link>
          </div>
        </section>
      </div>
      {creating && (
        <ChoreForm chore={null} onClose={() => setCreating(false)} />
      )}
      {selectedChore && (
        <ChoreDetails
          key={selectedChore.id}
          chore={selectedChore}
          today={today}
          onClose={closeDetails}
          onDeleted={() => {
            setSelectedId(null);
            focusAdd();
          }}
        />
      )}
    </>
  );
}
