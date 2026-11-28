"use client";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/primitives/toggle-group";
import { Checkbox } from "@/components/ui/primitives/checkbox";
import { Textarea } from "@/components/ui/primitives/textarea";

import { useId, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useUnsavedChanges } from "@/components/ui/use-unsaved-changes";
import { FormField, controlStyles } from "@/components/ui/form-field";
import { SelectField, selectOptions } from "@/components/ui/select-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { expenseCategories } from "@/domain/expenses";
import { formatMoney, moneyInput } from "@/domain/money";
import type { Expense, SplitMethod } from "@/domain/types";
import { useReadyHousehold } from "@/state/household-provider";
import { focusInvalid } from "../household/fields";
import {
  initialExpenseDraft,
  inspectExpenseDraft,
  type ExpenseFormDraft,
} from "./expense-draft";

const splitLabels: Record<SplitMethod, string> = {
  equal: "Equally",
  percentage: "By %",
  fixed: "By amount",
};
export function ExpenseForm({
  expense,
  onClose,
}: {
  expense?: Expense;
  onClose: () => void;
}) {
  const { state, store, conflict } = useReadyHousehold();
  const formId = useId();
  const [draft, setDraft] = useState(() => initialExpenseDraft(state, expense));
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const { requestClose, discardConfirmation } = useUnsavedChanges(
    draft,
    onClose,
  );
  const preview = inspectExpenseDraft(state, draft, expense);
  const errors = submitted ? preview.errors : {};
  const members = [...state.members].sort((a, b) => a.order - b.order);
  const money = (cents: number | bigint) =>
    formatMoney(cents, state.household.currency);
  const memberFor = (id: string) => members.find((member) => member.id === id)!;
  function change(changes: Partial<ExpenseFormDraft>) {
    setDraft({ ...draft, ...changes });
    setSaveError(undefined);
  }
  function amountChange(value: string) {
    const payers =
      draft.payers.length === 1 &&
      (!draft.payers[0].amount || draft.payers[0].amount === draft.amount)
        ? [{ ...draft.payers[0], amount: value }]
        : draft.payers;
    change({ amount: value, payers });
  }
  function chooseSplit(method: SplitMethod) {
    if (method === draft.splitMethod) return;
    // Preserve exact current calculated shares when changing to fixed amounts; new percentages need explicit input.
    const shares =
      method === "fixed" && preview.shares
        ? Object.fromEntries(
            preview.shares.map((row) => [
              row.memberId,
              moneyInput(row.amountCents),
            ]),
          )
        : {};
    change({ splitMethod: method, shares });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setSaveError(undefined);
    if (!preview.data) {
      focusInvalid(event.currentTarget);
      return;
    }
    const result = store.dispatch(
      expense
        ? { type: "edit-expense", id: expense.id, expense: preview.data }
        : { type: "add-expense", expense: preview.data },
      expense ? "Expense updated." : "Expense saved.",
    );
    if (result.ok) onClose();
    else setSaveError(result.error);
  }
  const payerDifference =
    preview.amountCents !== undefined && preview.payerTotal !== undefined
      ? BigInt(preview.amountCents) - preview.payerTotal
      : undefined;
  const shareDifference =
    preview.amountCents !== undefined && preview.shareTotal !== undefined
      ? BigInt(preview.amountCents) - preview.shareTotal
      : undefined;
  return (
    <Dialog
      open
      size="wide"
      title={expense ? "Edit expense" : "Add expense"}
      onClose={requestClose}
      description={`Amounts are in ${state.household.currency}. This records shared spending in this browser.`}
      footer={
        <>
          <Button variant="secondary" onClick={requestClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={conflict}>
            Save expense
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-7">
        <section className="space-y-5" aria-label="Expense basics">
          <FormField
            id="expense-description"
            label="Description"
            required
            maxLength={100}
            value={draft.description}
            onChange={(event) => change({ description: event.target.value })}
            error={errors.description}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="expense-amount"
              label={`Total amount (${state.household.currency})`}
              required
              inputMode="decimal"
              placeholder="0.00"
              value={draft.amount}
              onChange={(event) => amountChange(event.target.value)}
              error={errors.amount}
            />
            <FormField
              id="expense-date"
              label="Date"
              required
              type="date"
              min="0001-01-01"
              max="9999-12-31"
              value={draft.date}
              onChange={(event) => change({ date: event.target.value })}
              error={errors.date}
            />
          </div>
          <SelectField
            id="expense-category"
            label="Category (required)"
            required
            value={draft.category}
            onValueChange={(value) => change({ category: value })}
            error={errors.category}
            options={selectOptions(
              expense &&
                !expenseCategories.some(
                  (category) => category === expense.category,
                ) && {
                  value: expense.category,
                  label: <>{expense.category}</>,
                },
              expenseCategories.map((category) => ({
                value: category,
                label: <>{category}</>,
              })),
            )}
          />
          <div className="space-y-2">
            <label
              htmlFor="expense-notes"
              className="block text-sm font-medium"
            >
              Notes (optional)
            </label>
            <Textarea
              id="expense-notes"
              className={`${controlStyles} min-h-24 resize-y`}
              rows={3}
              maxLength={1000}
              value={draft.notes}
              onChange={(event) => change({ notes: event.target.value })}
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={
                errors.notes ? "expense-notes-error" : undefined
              }
            />
            {errors.notes && (
              <p id="expense-notes-error" className="text-sm text-danger">
                {errors.notes}
              </p>
            )}
          </div>
        </section>
        <fieldset
          className="min-w-0 space-y-4 border-t border-line pt-5"
          aria-describedby={errors.payers ? "payer-total-error" : undefined}
        >
          <legend className="pr-3 text-base font-semibold">Who paid?</legend>
          <p className="text-sm text-muted">
            Contributions must add up to the total. Payers do not have to share
            the expense.
          </p>
          {draft.payers.map((row, index) => (
            <div key={index} className="rounded-[7px] border border-line p-3">
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <SelectField
                  id={`payer-${index}-member`}
                  label={`Payer ${index + 1}`}
                  required
                  value={row.memberId}
                  onValueChange={(value) =>
                    change({
                      payers: draft.payers.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, memberId: value }
                          : item,
                      ),
                    })
                  }
                  error={errors[`payer-${index}-member`]}
                  options={selectOptions(
                    members
                      .filter(
                        (member) => member.active || member.id === row.memberId,
                      )
                      .map((member) => ({
                        value: member.id,
                        label: (
                          <>
                            {member.name}
                            {!member.active && " (archived — current payer)"}
                          </>
                        ),
                        disabled: draft.payers.some(
                          (item, itemIndex) =>
                            itemIndex !== index && item.memberId === member.id,
                        ),
                      })),
                  )}
                />
                <FormField
                  id={`payer-${index}-amount`}
                  label={`Contribution ${index + 1} (${state.household.currency})`}
                  required
                  inputMode="decimal"
                  placeholder="0.00"
                  value={row.amount}
                  onChange={(event) =>
                    change({
                      payers: draft.payers.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, amount: event.target.value }
                          : item,
                      ),
                    })
                  }
                  error={errors[`payer-${index}-amount`]}
                  aria-invalid={Boolean(errors.payers) || undefined}
                  aria-describedby={
                    errors.payers ? "payer-total-error" : undefined
                  }
                />
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  variant="ghost"
                  disabled={draft.payers.length === 1}
                  aria-label={`Remove payer ${index + 1}`}
                  onClick={() =>
                    change({
                      payers: draft.payers.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Remove
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            disabled={
              !members.some(
                (member) =>
                  member.active &&
                  !draft.payers.some((row) => row.memberId === member.id),
              )
            }
            onClick={() => {
              const member = members.find(
                (member) =>
                  member.active &&
                  !draft.payers.some((row) => row.memberId === member.id),
              );
              if (member)
                change({
                  payers: [
                    ...draft.payers,
                    { memberId: member.id, amount: "" },
                  ],
                });
            }}
          >
            <Plus aria-hidden="true" className="size-4" />
            Add payer
          </Button>
          <div className="space-y-1 text-sm" aria-live="polite">
            <p className="text-muted">
              {preview.payerTotal !== undefined &&
              preview.amountCents !== undefined
                ? `Allocated ${money(preview.payerTotal)} of ${money(preview.amountCents)}.`
                : "Enter a valid total and each contribution to compare them."}
            </p>
            {payerDifference !== undefined && payerDifference !== 0n && (
              <p id="payer-discrepancy" className="text-danger">
                {payerDifference > 0n
                  ? `Add ${money(payerDifference)} to the contributions.`
                  : `Reduce contributions by ${money(-payerDifference)}.`}
              </p>
            )}
            {errors.payers && (
              <p id="payer-total-error" className="text-danger">
                {errors.payers}
              </p>
            )}
          </div>
        </fieldset>
        <fieldset
          className="min-w-0 space-y-4 border-t border-line pt-5"
          aria-describedby={
            errors.participants ? "expense-participants-error" : undefined
          }
        >
          <legend className="pr-3 text-base font-semibold">
            Who shares this expense?
          </legend>
          <div className="flex flex-wrap gap-2">
            {members
              .filter(
                (member) =>
                  member.active || draft.participantIds.includes(member.id),
              )
              .map((member) => (
                <label
                  key={member.id}
                  className={`flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-[7px] border px-3 py-2 ${draft.participantIds.includes(member.id) ? "border-accent bg-selected" : "border-line bg-page"}`}
                >
                  <Checkbox
                    className="size-4 shrink-0 accent-accent"
                    checked={draft.participantIds.includes(member.id)}
                    onCheckedChange={(checked) =>
                      change({
                        participantIds: checked
                          ? [...draft.participantIds, member.id]
                          : draft.participantIds.filter(
                              (id) => id !== member.id,
                            ),
                      })
                    }
                    aria-label={`Share with ${member.name}${!member.active ? " (archived)" : ""}`}
                    aria-invalid={Boolean(errors.participants)}
                  />
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
                </label>
              ))}
          </div>
          {errors.participants && (
            <p id="expense-participants-error" className="text-sm text-danger">
              {errors.participants}
            </p>
          )}
        </fieldset>
        <section
          className="space-y-4 border-t border-line pt-5"
          aria-labelledby="split-heading"
        >
          <h3 id="split-heading" className="font-semibold">
            Split it
          </h3>
          <ToggleGroup
            value={[draft.splitMethod]}
            onValueChange={(values) => {
              if (values[0]) chooseSplit(values[0] as typeof draft.splitMethod);
            }}
            aria-label="Split method"
            className="flex w-fit max-w-full flex-wrap rounded-[7px] border border-line bg-subtle p-1"
          >
            {(["equal", "percentage", "fixed"] as const).map((method) => (
              <ToggleGroupItem
                key={method}
                value={method}
                className="min-h-11 px-4"
              >
                {splitLabels[method]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {draft.splitMethod === "equal" ? (
            <p className="text-sm text-muted">
              Shares follow roster order. Any extra cents go to the first
              roommates in that order.
            </p>
          ) : (
            <div className="space-y-3">
              {members
                .filter((member) => draft.participantIds.includes(member.id))
                .map((member) => (
                  <FormField
                    key={member.id}
                    id={`share-${member.id}`}
                    label={`${member.name}'s ${draft.splitMethod === "percentage" ? "percentage (%)" : `share (${state.household.currency})`}`}
                    required
                    inputMode="decimal"
                    placeholder="0.00"
                    value={draft.shares[member.id] ?? ""}
                    onChange={(event) =>
                      change({
                        shares: {
                          ...draft.shares,
                          [member.id]: event.target.value,
                        },
                      })
                    }
                    error={errors[`share-${member.id}`]}
                    aria-invalid={
                      (submitted && Boolean(preview.errors.split)) || undefined
                    }
                    aria-describedby={
                      preview.errors.split ? "expense-split-error" : undefined
                    }
                  />
                ))}
            </div>
          )}
          {draft.splitMethod === "percentage" &&
            preview.percentageTotal !== undefined && (
              <p
                className={`text-sm ${preview.percentageTotal === 10000 ? "text-muted" : "text-danger"}`}
                aria-live="polite"
              >
                Percentages total {moneyInput(preview.percentageTotal)}% of
                100.00%.
              </p>
            )}
          {draft.splitMethod === "fixed" &&
            preview.shareTotal !== undefined &&
            preview.amountCents !== undefined && (
              <div aria-live="polite" className="space-y-1 text-sm">
                <p className="text-muted">
                  Shares allocated {money(preview.shareTotal)} of{" "}
                  {money(preview.amountCents)}.
                </p>
                {shareDifference !== undefined && shareDifference !== 0n && (
                  <p className="text-danger">
                    {shareDifference > 0n
                      ? `Add ${money(shareDifference)} to the shares.`
                      : `Reduce shares by ${money(-shareDifference)}.`}
                  </p>
                )}
              </div>
            )}
          {preview.errors.split && (
            <p id="expense-split-error" className="text-sm text-danger">
              {preview.errors.split}
            </p>
          )}
          <div
            className="rounded-[7px] border border-line bg-subtle p-4"
            aria-label="Share preview"
          >
            <h4 className="text-sm font-semibold">Share preview</h4>
            {preview.shares && !preview.errors.split ? (
              <dl className="mt-3 space-y-2">
                {preview.shares.map((row) => (
                  <div
                    key={row.memberId}
                    className="flex flex-wrap justify-between gap-2 text-sm"
                  >
                    <dt className="min-w-0 break-words">
                      {memberFor(row.memberId).name}
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {money(row.amountCents)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Enter a valid total and split to see each person&apos;s exact
                share.
              </p>
            )}
          </div>
        </section>
        {conflict && (
          <InlineNotice tone="error">
            This household changed in another tab. Close this dialog and reload
            the saved household before saving.
          </InlineNotice>
        )}
        {saveError && <InlineNotice tone="error">{saveError}</InlineNotice>}
      </form>
      {discardConfirmation}
    </Dialog>
  );
}
