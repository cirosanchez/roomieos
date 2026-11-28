"use client";

import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/primitives/toggle-group";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { displayDate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import type { Expense, ExpenseStatus } from "@/domain/types";
import { useReadyHousehold } from "@/state/household-provider";
import { ExpenseForm } from "./expense-form";
import { ExpenseDetails } from "./expense-details";
import { ExpenseBalances } from "./expense-balances";

export function ExpensesScreen() {
  const { state, store, conflict } = useReadyHousehold();
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ExpenseStatus | "all">("all");
  const selected = state.expenses.find((expense) => expense.id === selectedId);
  const search = query.trim().toLocaleLowerCase();
  const expenses = state.expenses
    .filter(
      (expense) =>
        (status === "all" || expense.status === status) &&
        expense.description.toLocaleLowerCase().includes(search),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
  function clearFilters() {
    setQuery("");
    setStatus("all");
    document.getElementById("expense-search")?.focus();
  }
  function newExpense() {
    store.dismissFeedback();
    setCreating(true);
  }
  function open(expense: Expense) {
    store.dismissFeedback();
    setSelectedId(expense.id);
  }
  function payers(expense: Expense) {
    return (
      <ul className="space-y-2" aria-label="Paid by">
        {expense.payers.map((row) => {
          const member = state.members.find(
            (member) => member.id === row.memberId,
          )!;
          return (
            <li key={member.id} className="flex min-w-0 items-center gap-2">
              <MemberAvatar
                name={member.name}
                icon={
                  member.avatar.kind === "icon"
                    ? member.avatar.value
                    : undefined
                }
              />
              <span className="min-w-0 break-words text-sm">
                {member.name}
                {!member.active && " (archived)"}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <>
      <PageHeader
        title="Expenses"
        description="Track shared spending without the spreadsheet."
        icon={<Wallet className="size-6" />}
        action={
          <Button id="add-expense" disabled={conflict} onClick={newExpense}>
            <Plus aria-hidden="true" className="size-4" />
            Add expense
          </Button>
        }
      />
      <ExpenseBalances />
      {state.expenses.length > 0 && (
        <section aria-label="Find expenses" className="mb-5 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 sm:max-w-sm">
              <FormField
                id="expense-search"
                label="Search expenses"
                type="search"
                placeholder="Search descriptions"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <p id="expense-status-label" className="text-sm font-medium">
                Status
              </p>
              <ToggleGroup
                aria-labelledby="expense-status-label"
                value={[status]}
                onValueChange={(values) => {
                  if (values[0]) setStatus(values[0] as ExpenseStatus | "all");
                }}
                variant="outline"
                spacing={1}
              >
                {(["all", "open", "settled"] as const).map((value) => (
                  <ToggleGroupItem
                    key={value}
                    value={value}
                    className="min-h-11 px-4 aria-pressed:border-accent aria-pressed:bg-selected aria-pressed:text-accent"
                  >
                    {value === "all"
                      ? "All"
                      : value === "open"
                        ? "Open"
                        : "Settled"}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-sm text-muted">
              Showing {expenses.length} of {state.expenses.length} expenses.
            </p>
            {expenses.length > 0 && (query || status !== "all") && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </section>
      )}
      {expenses.length ? (
        <>
          <div className="hidden rounded-[10px] border border-line lg:block">
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">Household expenses</caption>
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[14%]" />
                <col className="w-[13%]" />
                <col className="w-[20%]" />
                <col className="w-[17%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="border-b border-line bg-subtle text-muted">
                <tr>
                  {[
                    "Expense",
                    "Category",
                    "Date",
                    "Paid by",
                    "Total",
                    "Status",
                  ].map((label) => (
                    <th key={label} scope="col" className="p-3 font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="p-3 align-top">
                      <Button
                        variant="ghost"
                        className="h-auto min-w-0 whitespace-normal justify-start px-0 hover:bg-transparent min-h-11 max-w-full rounded text-left font-semibold text-accent underline-offset-4 hover:underline [overflow-wrap:anywhere]"
                        onClick={() => open(expense)}
                      >
                        {expense.description}
                      </Button>
                    </td>
                    <td className="break-words p-3 align-top">
                      {expense.category}
                    </td>
                    <td className="p-3 align-top">
                      <time dateTime={expense.date}>
                        {displayDate(expense.date)}
                      </time>
                    </td>
                    <td className="p-3 align-top">{payers(expense)}</td>
                    <td className="break-words p-3 align-top font-semibold tabular-nums">
                      {formatMoney(
                        expense.amountCents,
                        state.household.currency,
                      )}
                    </td>
                    <td className="p-3 align-top">
                      <StatusPill status={expense.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul aria-label="Household expenses" className="space-y-3 lg:hidden">
            {expenses.map((expense) => (
              <li
                key={expense.id}
                className="space-y-4 rounded-[10px] border border-line p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => open(expense)}
                    className="h-auto min-w-0 whitespace-normal justify-start px-0 hover:bg-transparent min-h-11 max-w-full rounded text-left font-semibold text-accent [overflow-wrap:anywhere]"
                  >
                    {expense.description}
                  </Button>
                  <StatusPill status={expense.status} />
                </div>
                <p className="text-sm text-muted">
                  {expense.category} · {displayDate(expense.date)}
                </p>
                {payers(expense)}
                <p className="break-words font-semibold tabular-nums">
                  {formatMoney(expense.amountCents, state.household.currency)}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : state.expenses.length > 0 ? (
        <EmptyState
          icon={<Wallet className="size-6" />}
          title="No matching expenses"
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        >
          <p>
            Try another description or clear the filters to see all expenses.
          </p>
        </EmptyState>
      ) : (
        <EmptyState
          icon={<Wallet className="size-6" />}
          title="No shared expenses yet"
          action={
            <Button disabled={conflict} onClick={newExpense}>
              Add your first expense
            </Button>
          }
        >
          <p>
            Add something the household paid for, then choose who paid and who
            shares it.
          </p>
        </EmptyState>
      )}
      {creating && <ExpenseForm onClose={() => setCreating(false)} />}
      {selected && (
        <ExpenseDetails
          key={selected.id}
          expense={selected}
          onClose={() => {
            setSelectedId(null);
            if (!expenses.some((expense) => expense.id === selectedId))
              requestAnimationFrame(() =>
                document.getElementById("add-expense")?.focus(),
              );
          }}
          onDeleted={() => {
            setSelectedId(null);
            requestAnimationFrame(() =>
              document.getElementById("add-expense")?.focus(),
            );
          }}
        />
      )}
    </>
  );
}
