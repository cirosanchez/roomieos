import { activeMembers } from "./household";
import { calculateBalances } from "./money";
import type { AppState } from "./types";

export function dashboardSummary(state: AppState) {
  const selected = state.members.find(
    (member) => member.id === state.selectedMemberId,
  )!;
  const pendingChores = state.chores
    .filter(
      (chore) => chore.assigneeId === selected.id && chore.status === "pending",
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return {
    selected,
    pendingChores,
    netCents: calculateBalances(state.members, state.expenses).find(
      (row) => row.memberId === selected.id,
    )!.netCents,
    openExpenseCount: state.expenses.filter(
      (expense) => expense.status === "open",
    ).length,
    choreCounts: {
      pending: state.chores.filter((chore) => chore.status === "pending")
        .length,
      completed: state.chores.filter((chore) => chore.status === "completed")
        .length,
      skipped: state.chores.filter((chore) => chore.status === "skipped")
        .length,
    },
    activeMemberCount: activeMembers(state).length,
    agreementCount: state.agreements.length,
  };
}
