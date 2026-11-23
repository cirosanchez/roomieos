import {
  householdDraftSchema,
  memberDraftSchema,
  setupSchema,
  validateState,
} from "./validation";
import type { AppState, Currency, Member } from "./types";
import { MAX_ACTIVE_MEMBERS, MIN_ACTIVE_MEMBERS } from "./household-options";

export type MemberDraft = Pick<Member, "name" | "avatar">;
export type SetupInput = {
  name: string;
  currency: Currency;
  members: MemberDraft[];
};
export type HouseholdAction =
  | { type: "update-household"; name: string; currency: Currency }
  | { type: "add-member"; member: MemberDraft }
  | { type: "edit-member"; id: string; member: MemberDraft }
  | { type: "archive-member"; id: string }
  | { type: "restore-member"; id: string }
  | { type: "select-member"; id: string };

export function activeMembers(state: AppState): Member[] {
  return state.members
    .filter((member) => member.active)
    .sort((a, b) => a.order - b.order);
}

export function archiveBlockReason(state: AppState, id: string): string | null {
  if (activeMembers(state).length <= MIN_ACTIVE_MEMBERS)
    return "At least two active roommates must remain.";
  const chores = state.chores.some(
    (chore) => chore.assigneeId === id && chore.status === "pending",
  );
  const expenses = state.expenses.some(
    (expense) =>
      expense.status === "open" &&
      [...expense.payers, ...expense.participants].some(
        (row) => row.memberId === id,
      ),
  );
  if (chores && expenses)
    return "Reassign this roommate's pending chores and settle their open expenses first.";
  if (chores) return "Reassign this roommate's pending chores first.";
  if (expenses) return "Settle this roommate's open expenses first.";
  return null;
}

export function createEmptyHousehold(
  input: SetupInput,
  makeId: () => string,
): AppState {
  const clean = setupSchema.parse({
    ...input,
    name: input.name.trim(),
    members: input.members.map((member) => ({
      ...member,
      name: member.name.trim(),
    })),
  });
  const members = clean.members.map((member, order) => ({
    ...member,
    id: makeId(),
    active: true,
    order,
  }));
  return validateState({
    schemaVersion: 1,
    household: { name: clean.name, currency: clean.currency },
    members,
    selectedMemberId: members[0].id,
    chores: [],
    expenses: [],
    agreements: [],
    starterMode: "empty",
  });
}

export function applyHouseholdAction(
  state: AppState,
  action: HouseholdAction,
  makeId: () => string,
): AppState {
  let next: AppState;
  if (action.type === "update-household") {
    const household = householdDraftSchema.parse({
      name: action.name.trim(),
      currency: action.currency,
    });
    if (
      household.currency !== state.household.currency &&
      state.expenses.length > 0
    )
      throw new Error(
        "Remove all expenses, including settled expenses, before changing currency.",
      );
    next = { ...state, household };
  } else if (action.type === "add-member") {
    if (activeMembers(state).length >= MAX_ACTIVE_MEMBERS)
      throw new Error(
        `A household can have at most ${MAX_ACTIVE_MEMBERS} active roommates.`,
      );
    const member = memberDraftSchema.parse({
      ...action.member,
      name: action.member.name.trim(),
    });
    next = {
      ...state,
      members: [
        ...state.members,
        {
          ...member,
          id: makeId(),
          active: true,
          order: Math.max(...state.members.map((item) => item.order)) + 1,
        },
      ],
    };
  } else {
    const member = state.members.find((item) => item.id === action.id);
    if (!member)
      throw new Error(
        "This roommate could not be found. Reload the household and try again.",
      );
    if (action.type === "select-member") {
      if (!member.active) throw new Error("Choose an active roommate.");
      next = { ...state, selectedMemberId: member.id };
    } else if (action.type === "edit-member") {
      const changes = memberDraftSchema.parse({
        ...action.member,
        name: action.member.name.trim(),
      });
      next = {
        ...state,
        members: state.members.map((item) =>
          item.id === member.id ? { ...item, ...changes } : item,
        ),
      };
    } else {
      const active = action.type === "restore-member";
      if (member.active === active) return state;
      if (active && activeMembers(state).length >= MAX_ACTIVE_MEMBERS)
        throw new Error(
          `Archive another roommate before restoring this one. The active limit is ${MAX_ACTIVE_MEMBERS}.`,
        );
      if (!active) {
        const reason = archiveBlockReason(state, member.id);
        if (reason) throw new Error(reason);
      }
      next = {
        ...state,
        members: state.members.map((item) =>
          item.id === member.id ? { ...item, active } : item,
        ),
      };
    }
  }
  return validateState(next);
}
