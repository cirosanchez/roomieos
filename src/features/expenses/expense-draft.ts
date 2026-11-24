import type {
  AppState,
  Expense,
  ParticipantShare,
  SplitMethod,
} from "../../domain/types";
import type { ExpenseDraft } from "../../domain/expenses";
import { isCalendarDate, localDate } from "../../domain/dates";
import {
  moneyInput,
  parseMoney,
  parsePercentage,
  splitEqual,
  splitPercentage,
} from "../../domain/money";

export type ExpenseFormDraft = {
  description: string;
  amount: string;
  date: string;
  category: string;
  notes: string;
  payers: { memberId: string; amount: string }[];
  participantIds: string[];
  splitMethod: SplitMethod;
  shares: Record<string, string>;
};
export function initialExpenseDraft(
  state: AppState,
  expense?: Expense,
): ExpenseFormDraft {
  return expense
    ? {
        description: expense.description,
        amount: moneyInput(expense.amountCents),
        date: expense.date,
        category: expense.category,
        notes: expense.notes,
        payers: expense.payers.map((row) => ({
          memberId: row.memberId,
          amount: moneyInput(row.amountCents),
        })),
        participantIds: expense.participants.map((row) => row.memberId),
        splitMethod: expense.splitMethod,
        shares: Object.fromEntries(
          expense.participants.map((row) => [
            row.memberId,
            moneyInput(
              expense.splitMethod === "percentage"
                ? expense.percentageBasisPoints![row.memberId]
                : row.amountCents,
            ),
          ]),
        ),
      }
    : {
        description: "",
        amount: "",
        date: localDate(new Date()),
        category: "Groceries",
        notes: "",
        payers: [{ memberId: state.selectedMemberId, amount: "" }],
        participantIds: state.members
          .filter((member) => member.active)
          .sort((a, b) => a.order - b.order)
          .map((member) => member.id),
        splitMethod: "equal",
        shares: {},
      };
}
export function inspectExpenseDraft(
  state: AppState,
  draft: ExpenseFormDraft,
  previous?: Expense,
) {
  const errors: Record<string, string> = {};
  const parse = (key: string, operation: () => number) => {
    try {
      return operation();
    } catch (error) {
      errors[key] =
        error instanceof Error ? error.message : "Enter a valid amount.";
      return undefined;
    }
  };
  if (!draft.description.trim() || draft.description.trim().length > 100)
    errors.description = "Enter a description (1–100 characters).";
  if (!isCalendarDate(draft.date))
    errors.date = "Choose a valid calendar date.";
  if (!draft.category.trim() || draft.category.trim().length > 50)
    errors.category = "Choose a category.";
  if (draft.notes.length > 1000)
    errors.notes = "Keep notes to 1000 characters or fewer.";
  const amountCents = parse("amount", () => parseMoney(draft.amount));
  const allowed = (id: string, role: "payers" | "participants") =>
    state.members.some(
      (member) =>
        member.id === id &&
        (member.active ||
          (previous?.status === "settled" &&
            previous[role].some((row) => row.memberId === id))),
    );
  const payers = draft.payers.map((row, index) => {
    if (!allowed(row.memberId, "payers"))
      errors[`payer-${index}-member`] = "Choose an active roommate.";
    if (
      draft.payers.some(
        (other, otherIndex) =>
          otherIndex !== index && other.memberId === row.memberId,
      )
    )
      errors[`payer-${index}-member`] = "Each payer can appear only once.";
    return {
      memberId: row.memberId,
      amountCents: parse(`payer-${index}-amount`, () => parseMoney(row.amount)),
    };
  });
  if (!payers.length) errors.payers = "Choose at least one payer.";
  const payerTotal = payers.every((row) => row.amountCents !== undefined)
    ? payers.reduce((sum, row) => sum + BigInt(row.amountCents!), 0n)
    : undefined;
  if (
    amountCents !== undefined &&
    payerTotal !== undefined &&
    payerTotal !== BigInt(amountCents)
  )
    errors.payers = "Payer contributions must equal the expense total.";
  if (!draft.participantIds.length)
    errors.participants = "Choose at least one participant.";
  if (
    new Set(draft.participantIds).size !== draft.participantIds.length ||
    draft.participantIds.some((id) => !allowed(id, "participants"))
  )
    errors.participants =
      "Choose unique active roommates for new participant selections.";
  const ids = [...draft.participantIds].sort(
    (a, b) =>
      (state.members.find((member) => member.id === a)?.order ?? 0) -
      (state.members.find((member) => member.id === b)?.order ?? 0),
  );
  let shares: ParticipantShare[] | undefined;
  let shareTotal: bigint | undefined;
  let percentageTotal: number | undefined;
  let percentageBasisPoints: Record<string, number> | undefined;
  if (
    draft.splitMethod === "equal" &&
    amountCents !== undefined &&
    ids.length &&
    !errors.participants
  )
    shares = splitEqual(amountCents, ids);
  else if (
    draft.splitMethod === "percentage" ||
    draft.splitMethod === "fixed"
  ) {
    const values = ids.map((id) => ({
      id,
      amount: parse(`share-${id}`, () =>
        draft.splitMethod === "percentage"
          ? parsePercentage(draft.shares[id] ?? "")
          : parseMoney(draft.shares[id] ?? "", true),
      ),
    }));
    if (values.every((row) => row.amount !== undefined)) {
      if (draft.splitMethod === "percentage") {
        percentageTotal = values.reduce((sum, row) => sum + row.amount!, 0);
        percentageBasisPoints = Object.fromEntries(
          values.map((row) => [row.id, row.amount!]),
        );
        if (percentageTotal !== 10000)
          errors.split = "Percentages must total exactly 100.00%.";
        else if (
          amountCents !== undefined &&
          ids.length &&
          !errors.participants
        )
          shares = splitPercentage(amountCents, ids, percentageBasisPoints);
      } else {
        shares = values.map((row) => ({
          memberId: row.id,
          amountCents: row.amount!,
        }));
        shareTotal = shares.reduce(
          (sum, row) => sum + BigInt(row.amountCents),
          0n,
        );
        if (amountCents !== undefined && shareTotal !== BigInt(amountCents))
          errors.split = "Participant shares must equal the expense total.";
      }
    }
  }
  if (shares && shareTotal === undefined)
    shareTotal = shares.reduce((sum, row) => sum + BigInt(row.amountCents), 0n);
  const data: ExpenseDraft | undefined =
    Object.keys(errors).length === 0 && amountCents !== undefined && shares
      ? {
          description: draft.description.trim(),
          amountCents,
          date: draft.date,
          category: draft.category.trim(),
          notes: draft.notes,
          payers: payers.map((row) => ({
            memberId: row.memberId,
            amountCents: row.amountCents!,
          })),
          participants: shares,
          splitMethod: draft.splitMethod,
          ...(draft.splitMethod === "percentage"
            ? { percentageBasisPoints }
            : {}),
        }
      : undefined;
  return {
    errors,
    amountCents,
    payerTotal,
    shares,
    shareTotal,
    percentageTotal,
    data,
  };
}
