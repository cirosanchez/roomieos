import { isCalendarDate } from "./dates";
import { activeMembers } from "./household";
import type { AppState, Chore, ChoreStatus, Member } from "./types";
import { choreDraftSchema, validateState } from "./validation";

export const choreStatuses = ["pending", "completed", "skipped"] as const;
export const choreStatusLabels: Record<ChoreStatus, string> = {
  pending: "Pending",
  completed: "Completed",
  skipped: "Skipped",
};
export type ChoreDraft = Pick<
  Chore,
  "title" | "notes" | "assigneeId" | "dueDate"
>;
export type ChoreAction =
  | { type: "add-chore"; chore: ChoreDraft }
  | { type: "edit-chore"; id: string; chore: ChoreDraft }
  | { type: "delete-chore"; id: string }
  | { type: "set-chore-status"; id: string; status: ChoreStatus }
  | { type: "rotate-chore"; id: string; dueDate: string };

export function isOverdue(
  chore: Pick<Chore, "status" | "dueDate">,
  today: string,
) {
  return chore.status === "pending" && chore.dueDate < today;
}

export function nextChoreAssignee(state: AppState, assigneeId: string): Member {
  const current = state.members.find((member) => member.id === assigneeId);
  if (!current) throw new Error("This chore's roommate could not be found.");
  const roster = activeMembers(state);
  const next =
    roster.find((member) => member.order > current.order) ?? roster[0];
  if (!next) throw new Error("Restore an active roommate before rotating.");
  return next;
}

export function suggestedRotationDate(dueDate: string, today: string): string {
  if (!isCalendarDate(dueDate) || !isCalendarDate(today))
    throw new Error("Choose a valid calendar date.");
  const base = dueDate < today ? today : dueDate;
  const [year, month, day] = base.split("-").map(Number);
  // Calendar arithmetic avoids UTC offsets, DST changes and the Date 0–99 year shorthand.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day + 7);
  const result = date.toISOString().slice(0, 10);
  return isCalendarDate(result) ? result : today;
}

export function applyChoreAction(
  state: AppState,
  action: ChoreAction,
  makeId: () => string,
  now: Date,
): AppState {
  const activeAssignee = (id: string) => {
    if (!state.members.some((member) => member.id === id && member.active))
      throw new Error(
        "Choose an active roommate before saving this assignment.",
      );
  };
  let chores: Chore[];
  if (action.type === "add-chore") {
    const draft = choreDraftSchema.parse({
      ...action.chore,
      title: action.chore.title.trim(),
    });
    activeAssignee(draft.assigneeId);
    chores = [
      ...state.chores,
      {
        ...draft,
        id: makeId(),
        status: "pending",
        completionHistory: [],
        createdAt: now.toISOString(),
      },
    ];
  } else {
    const chore = state.chores.find((item) => item.id === action.id);
    if (!chore)
      throw new Error(
        "This chore could not be found. Reload the household and try again.",
      );
    let updated = chore;
    if (action.type === "edit-chore") {
      const draft = choreDraftSchema.parse({
        ...action.chore,
        title: action.chore.title.trim(),
      });
      // Historical assignments may stay archived; new assignments must be active.
      if (draft.assigneeId !== chore.assigneeId || chore.status === "pending")
        activeAssignee(draft.assigneeId);
      updated = { ...chore, ...draft };
    } else if (action.type === "set-chore-status") {
      if (!choreStatuses.includes(action.status))
        throw new Error("Choose a valid chore status.");
      if (action.status === chore.status) return state;
      if (
        action.status === "pending" &&
        !state.members.find((member) => member.id === chore.assigneeId)?.active
      )
        throw new Error(
          "Reassign this chore to an active roommate using Edit before reopening it, or rotate to the next active roommate.",
        );
      const completionHistory =
        action.status === "completed"
          ? [
              ...chore.completionHistory,
              {
                id: makeId(),
                completedById: state.selectedMemberId,
                completedAt: now.toISOString(),
              },
            ]
          : chore.completionHistory;
      updated = { ...chore, status: action.status, completionHistory };
    } else if (action.type === "rotate-chore") {
      if (!isCalendarDate(action.dueDate))
        throw new Error("Choose a valid calendar date.");
      updated = {
        ...chore,
        status: "pending",
        assigneeId: nextChoreAssignee(state, chore.assigneeId).id,
        dueDate: action.dueDate,
      };
    }
    chores =
      action.type === "delete-chore"
        ? state.chores.filter((item) => item.id !== chore.id)
        : state.chores.map((item) => (item.id === chore.id ? updated : item));
  }
  return validateState({ ...state, chores });
}
