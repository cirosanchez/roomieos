"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { InlineNotice } from "@/components/ui/inline-notice";
import { StatusPill } from "@/components/ui/status-pill";
import { expenseReopenReason } from "@/domain/expenses";
import { displayDate } from "@/domain/dates";
import { formatMoney, moneyInput } from "@/domain/money";
import type { Expense } from "@/domain/types";
import { useReadyHousehold } from "@/state/household-provider";
import { ExpenseForm } from "./expense-form";

export function ExpenseDetails({
  expense,
  onClose,
  onDeleted,
}: {
  expense: Expense;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { state, store, conflict } = useReadyHousehold();
  const [overlay, setOverlay] = useState<"edit" | "settle" | "delete" | null>(
    null,
  );
  const [error, setError] = useState<string>();
  const reopenReason = expenseReopenReason(state, expense);
  const money = (value: number) => formatMoney(value, state.household.currency);
  function open(value: typeof overlay) {
    store.dismissFeedback();
    setError(undefined);
    setOverlay(value);
  }
  return (
    <>
      <Dialog open title={expense.description} onClose={onClose}>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusPill status={expense.status} />
            <p className="break-words text-2xl font-semibold tabular-nums">
              {money(expense.amountCents)}
            </p>
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Date</dt>
              <dd className="mt-1">{displayDate(expense.date)}</dd>
            </div>
            <div>
              <dt className="text-muted">Category</dt>
              <dd className="mt-1 break-words">{expense.category}</dd>
            </div>
          </dl>
          <p className="text-sm text-muted">
            {expense.status === "open"
              ? "This expense contributes to outstanding balances."
              : "This whole expense was marked resolved outside RoomieOS and is excluded from outstanding balances."}
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {(["payers", "participants"] as const).map((role) => (
              <section
                key={role}
                aria-label={
                  role === "payers"
                    ? "Payer contributions"
                    : "Participant shares"
                }
              >
                <h3 className="text-sm font-semibold">
                  {role === "payers"
                    ? "Who paid"
                    : `Who shares · ${expense.splitMethod === "equal" ? "equally" : expense.splitMethod === "percentage" ? "by percentage" : "by amount"}`}
                </h3>
                <dl className="mt-3 space-y-3">
                  {expense[role].map((row) => {
                    const member = state.members.find(
                      (member) => member.id === row.memberId,
                    )!;
                    return (
                      <div
                        key={row.memberId}
                        className="flex flex-wrap justify-between gap-2 text-sm"
                      >
                        <dt className="min-w-0 break-words text-muted">
                          {member.name}
                          {!member.active && " (archived)"}
                          {role === "participants" &&
                            expense.splitMethod === "percentage" &&
                            ` · ${moneyInput(expense.percentageBasisPoints![member.id])}%`}
                        </dt>
                        <dd className="font-medium tabular-nums">
                          {money(row.amountCents)}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            ))}
          </div>
          {expense.notes && (
            <section>
              <h3 className="text-sm font-semibold">Notes</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted">
                {expense.notes}
              </p>
            </section>
          )}
          {expense.status === "settled" && reopenReason && (
            <p
              id="reopen-expense-reason"
              className="break-words text-sm text-warning"
            >
              {reopenReason}
            </p>
          )}
          {conflict && (
            <InlineNotice tone="error">
              This household changed in another tab. Close this dialog and
              reload the saved household before saving.
            </InlineNotice>
          )}
          {error && <InlineNotice tone="error">{error}</InlineNotice>}
          <div className="flex flex-wrap gap-3 border-t border-line pt-5">
            {expense.status === "open" ? (
              <Button disabled={conflict} onClick={() => open("settle")}>
                Mark as settled
              </Button>
            ) : (
              <Button
                disabled={conflict || Boolean(reopenReason)}
                aria-describedby={
                  reopenReason ? "reopen-expense-reason" : undefined
                }
                onClick={() => {
                  const result = store.dispatch(
                    {
                      type: "set-expense-status",
                      id: expense.id,
                      status: "open",
                    },
                    "Expense reopened.",
                  );
                  setError(result.ok ? undefined : result.error);
                }}
              >
                Reopen expense
              </Button>
            )}
            <Button
              variant="secondary"
              disabled={conflict}
              onClick={() => open("edit")}
            >
              Edit expense
            </Button>
            <Button
              variant="danger"
              disabled={conflict}
              onClick={() => open("delete")}
            >
              Delete expense
            </Button>
          </div>
        </div>
      </Dialog>
      {overlay === "edit" && (
        <ExpenseForm expense={expense} onClose={() => setOverlay(null)} />
      )}
      <ConfirmDialog
        open={overlay === "settle" || overlay === "delete"}
        title={
          overlay === "settle" ? "Mark expense as settled?" : "Delete expense?"
        }
        description={
          overlay === "settle"
            ? "This confirms the full expense was resolved outside RoomieOS. It will no longer count toward outstanding balances. No money is transferred by this app."
            : `Permanently delete “${expense.description}”? This also removes its effect on balances. This cannot be undone.`
        }
        confirmLabel={
          overlay === "settle" ? "Mark as settled" : "Delete expense"
        }
        destructive={overlay === "delete"}
        error={error}
        onClose={() => setOverlay(null)}
        onConfirm={() => {
          const result = store.dispatch(
            overlay === "settle"
              ? {
                  type: "set-expense-status",
                  id: expense.id,
                  status: "settled",
                }
              : { type: "delete-expense", id: expense.id },
            overlay === "settle"
              ? "Expense marked settled."
              : "Expense deleted.",
          );
          if (result.ok) {
            if (overlay === "delete") onDeleted();
            else setOverlay(null);
          } else setError(result.error);
        }}
      />
    </>
  );
}
