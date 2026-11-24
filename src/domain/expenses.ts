import type { AppState, Expense, ExpenseStatus } from "./types";
import { expenseDraftSchema, validateState } from "./validation";

export const expenseCategories = [
  "Groceries",
  "Utilities",
  "Household supplies",
  "Rent",
  "Other",
] as const;
export type ExpenseDraft = Omit<Expense, "id" | "status" | "createdAt">;
export type ExpenseAction =
  | { type: "add-expense"; expense: ExpenseDraft }
  | { type: "edit-expense"; id: string; expense: ExpenseDraft }
  | { type: "delete-expense"; id: string }
  | { type: "set-expense-status"; id: string; status: ExpenseStatus };

export function expenseReopenReason(
  state: AppState,
  expense: Expense,
): string | null {
  const involved = new Set(
    [...expense.payers, ...expense.participants].map((row) => row.memberId),
  );
  const archived = state.members.filter(
    (member) => !member.active && involved.has(member.id),
  );
  return archived.length
    ? `Restore ${archived.map((member) => member.name).join(", ")} in Settings before reopening this expense.`
    : null;
}
export function applyExpenseAction(
  state: AppState,
  action: ExpenseAction,
  makeId: () => string,
  now: Date,
): AppState {
  const existing =
    action.type === "add-expense"
      ? undefined
      : state.expenses.find((expense) => expense.id === action.id);
  if (action.type !== "add-expense" && !existing)
    throw new Error(
      "This expense could not be found. Reload the household and try again.",
    );
  let updated: Expense | undefined;
  if (action.type === "add-expense" || action.type === "edit-expense") {
    const draft = expenseDraftSchema.parse({
      ...action.expense,
      description: action.expense.description.trim(),
      category: action.expense.category.trim(),
    });
    for (const role of ["payers", "participants"] as const) {
      for (const row of draft[role]) {
        const member = state.members.find(
          (member) => member.id === row.memberId,
        );
        const historical =
          existing?.status === "settled" &&
          existing[role].some((old) => old.memberId === row.memberId);
        if (!member || (!member.active && !historical))
          throw new Error(
            "Choose active roommates for new payer and participant selections.",
          );
      }
    }
    updated = {
      ...draft,
      id: existing?.id ?? makeId(),
      status: existing?.status ?? "open",
      createdAt: existing?.createdAt ?? now.toISOString(),
    };
  } else if (action.type === "set-expense-status") {
    if (action.status !== "open" && action.status !== "settled")
      throw new Error("Choose a valid expense status.");
    if (action.status === existing!.status) return state;
    if (action.status === "open") {
      const reason = expenseReopenReason(state, existing!);
      if (reason) throw new Error(reason);
    }
    updated = { ...existing!, status: action.status };
  }
  const expenses =
    action.type === "add-expense"
      ? [...state.expenses, updated!]
      : action.type === "delete-expense"
        ? state.expenses.filter((expense) => expense.id !== existing!.id)
        : state.expenses.map((expense) =>
            expense.id === existing!.id ? updated! : expense,
          );
  return validateState({ ...state, expenses });
}
