"use client";

import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { displayDate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import type { Expense } from "@/domain/types";
import { useReadyHousehold } from "@/state/household-provider";
import { ExpenseForm } from "./expense-form";
import { ExpenseDetails } from "./expense-details";
import { ExpenseBalances } from "./expense-balances";

export function ExpensesScreen() {
  const { state, store, conflict } = useReadyHousehold();
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = state.expenses.find((expense) => expense.id === selectedId);
  const expenses = [...state.expenses].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
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
                      <button
                        className="min-h-11 max-w-full rounded text-left font-semibold text-accent underline-offset-4 hover:underline [overflow-wrap:anywhere]"
                        onClick={() => open(expense)}
                      >
                        {expense.description}
                      </button>
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
                  <button
                    onClick={() => open(expense)}
                    className="min-h-11 max-w-full rounded text-left font-semibold text-accent [overflow-wrap:anywhere]"
                  >
                    {expense.description}
                  </button>
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
          onClose={() => setSelectedId(null)}
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
