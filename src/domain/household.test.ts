import { describe, expect, it } from "vitest";
import {
  activeMembers,
  applyHouseholdAction,
  createEmptyHousehold,
} from "./household";
import { createSampleHousehold } from "./sample";
import { isCalendarDate, localDate } from "./dates";
import { validateState } from "./validation";
import type { AppState } from "./types";

const now = new Date(2026, 10, 23, 12);
const sample = () => createSampleHousehold(now);
const draft = (name: string) => ({
  name,
  avatar: { kind: "initials" as const, value: "" },
});
function empty(count = 3) {
  let id = 0;
  return createEmptyHousehold(
    {
      name: "  Cedar House  ",
      currency: "EUR",
      members: Array.from({ length: count }, (_, i) =>
        draft(`  Roommate ${i}  `),
      ),
    },
    () => `member-${id++}`,
  );
}
const act = (
  state: AppState,
  action: Parameters<typeof applyHouseholdAction>[1],
) => applyHouseholdAction(state, action, () => "new-member");

describe("setup and sample facts", () => {
  it("trims names, initializes only empty collections and selects the first member", () => {
    const state = empty();
    expect(state.household).toEqual({ name: "Cedar House", currency: "EUR" });
    expect(state.members[0].name).toBe("Roommate 0");
    expect(state.selectedMemberId).toBe("member-0");
    expect([state.chores, state.expenses, state.agreements]).toEqual([
      [],
      [],
      [],
    ]);
    expect(state.starterMode).toBe("empty");
  });
  it.each([1, 21])("rejects %i active roommates at setup", (count) => {
    expect(() => empty(count)).toThrow();
  });
  it("creates valid relative sample dates, preserved history and every split mode", () => {
    const state = sample();
    expect(validateState(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const pending = state.chores.filter((chore) => chore.status === "pending");
    expect(pending.some((chore) => chore.dueDate < localDate(now))).toBe(true);
    expect(pending.some((chore) => chore.dueDate === localDate(now))).toBe(
      true,
    );
    expect(
      state.chores.find((chore) => chore.status === "completed")
        ?.completionHistory,
    ).toHaveLength(1);
    for (const chore of state.chores) {
      for (const event of chore.completionHistory)
        expect(event.completedAt >= chore.createdAt).toBe(true);
    }
    expect(
      new Set(state.expenses.map((expense) => expense.splitMethod)),
    ).toEqual(new Set(["equal", "percentage", "fixed"]));
    expect(state.expenses.some((expense) => expense.payers.length > 1)).toBe(
      true,
    );
    expect(state.expenses.some((expense) => expense.status === "settled")).toBe(
      true,
    );
    for (const expense of state.expenses) {
      expect(
        expense.payers.reduce((total, row) => total + row.amountCents, 0),
      ).toBe(expense.amountCents);
      expect(
        expense.participants.reduce((total, row) => total + row.amountCents, 0),
      ).toBe(expense.amountCents);
    }
  });
  it.each([
    "2026-02-29",
    "2026-04-31",
    "2026-00-10",
    "0000-01-01",
    "2026-1-01",
  ])("rejects invalid local date %s", (date) => {
    expect(isCalendarDate(date)).toBe(false);
  });
  it("accepts leap days and calendar boundary dates", () => {
    expect(isCalendarDate("2028-02-29")).toBe(true);
    expect(isCalendarDate("2026-12-31")).toBe(true);
  });
});

describe("roster invariants", () => {
  it("accepts 20 active roommates in setup and saved data, and rejects a 21st", () => {
    const state = empty(20);
    expect(validateState(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(() =>
      validateState({
        ...state,
        members: [
          ...state.members,
          { ...state.members[0], id: "extra", order: 20 },
        ],
      }),
    ).toThrow(/2–20/);
  });
  it("preserves existing avatar values and persists new preset choices", () => {
    const original = sample();
    expect(validateState(JSON.parse(JSON.stringify(original)))).toEqual(
      original,
    );
    const edited = act(original, {
      type: "edit-member",
      id: "avery",
      member: { name: "Avery", avatar: { kind: "icon", value: "🦊" } },
    });
    expect(
      validateState(JSON.parse(JSON.stringify(edited))).members[0].avatar,
    ).toEqual({ kind: "icon", value: "🦊" });
    expect(original.members[0].avatar).toEqual({ kind: "icon", value: "🌿" });
  });
  it("archives selected members with a fallback and restores their original roster position", () => {
    const original = empty();
    const archived = act(original, { type: "archive-member", id: "member-0" });
    expect(archived.selectedMemberId).toBe("member-1");
    expect(archived.members[0].active).toBe(false);
    expect(original.members[0].active).toBe(true);
    const added = act(archived, {
      type: "add-member",
      member: draft("Fourth"),
    });
    const restored = act(added, { type: "restore-member", id: "member-0" });
    expect(activeMembers(restored).map((member) => member.id)).toEqual([
      "member-0",
      "member-1",
      "member-2",
      "new-member",
    ]);
  });
  it("enforces the active roster limits on archive, add and restore", () => {
    expect(() =>
      act(empty(2), { type: "archive-member", id: "member-0" }),
    ).toThrow(/two active/);
    expect(() =>
      act(empty(20), { type: "add-member", member: draft("Twenty-first") }),
    ).toThrow(/20/);
    let state = act(empty(20), { type: "archive-member", id: "member-0" });
    state = act(state, { type: "add-member", member: draft("Sixth") });
    expect(() =>
      act(state, { type: "restore-member", id: "member-0" }),
    ).toThrow(/20/);
  });
  it("blocks pending assignments and each open-expense role independently", () => {
    const state = sample();
    expect(() =>
      act({ ...state, expenses: [] }, { type: "archive-member", id: "avery" }),
    ).toThrow(/pending chores/);
    const noChores = { ...state, chores: [] };
    expect(() => act(noChores, { type: "archive-member", id: "sam" })).toThrow(
      /open expenses/,
    );
    const payerOnly: AppState = {
      ...noChores,
      expenses: [
        {
          ...state.expenses[0],
          payers: [{ memberId: "avery", amountCents: 4500 }],
          participants: [{ memberId: "jordan", amountCents: 4500 }],
        },
      ],
    };
    expect(() =>
      act(payerOnly, { type: "archive-member", id: "avery" }),
    ).toThrow(/open expenses/);
    expect(() =>
      act(payerOnly, { type: "archive-member", id: "jordan" }),
    ).toThrow(/open expenses/);
  });
  it("keeps completed history and settled expenses referencing archived members", () => {
    const original = sample();
    const state = {
      ...original,
      chores: original.chores.filter((chore) => chore.status !== "pending"),
      expenses: original.expenses.map((expense) => ({
        ...expense,
        status: "settled" as const,
      })),
    };
    const archived = act(state, { type: "archive-member", id: "avery" });
    expect(archived.chores).toEqual(state.chores);
    expect(archived.expenses).toEqual(state.expenses);
    expect(archived.members[0].name).toBe("Avery");
    expect(() => act(archived, { type: "select-member", id: "avery" })).toThrow(
      /active roommate/,
    );
    const edited = act(archived, {
      type: "edit-member",
      id: "avery",
      member: draft("Avery Updated"),
    });
    expect(edited.members[0].id).toBe("avery");
    expect(edited.members[0].order).toBe(0);
  });
  it("allows currency changes only without any expenses", () => {
    expect(
      act(empty(), {
        type: "update-household",
        name: "New home",
        currency: "GBP",
      }).household.currency,
    ).toBe("GBP");
    const state = sample();
    expect(() =>
      act(state, {
        type: "update-household",
        name: "New home",
        currency: "USD",
      }),
    ).toThrow(/settled expenses/);
    expect(() =>
      act(
        {
          ...state,
          expenses: state.expenses.map((expense) => ({
            ...expense,
            status: "settled",
          })),
        },
        { type: "update-household", name: "New home", currency: "USD" },
      ),
    ).toThrow(/settled expenses/);
  });
});

describe("saved-payload validation", () => {
  it.each([
    (state: AppState) => ({ ...state, schemaVersion: 2 }),
    (state: AppState) => ({ ...state, selectedMemberId: "missing" }),
    (state: AppState) => ({
      ...state,
      members: [...state.members, state.members[0]],
    }),
    (state: AppState) => ({
      ...state,
      chores: [{ ...state.chores[0], dueDate: "2026-02-30" }],
    }),
    (state: AppState) => ({
      ...state,
      chores: [
        {
          ...state.chores[3],
          completionHistory: [
            {
              ...state.chores[3].completionHistory[0],
              completedById: "missing",
            },
          ],
        },
      ],
    }),
    (state: AppState) => ({
      ...state,
      expenses: [{ ...state.expenses[0], amountCents: 4500.5 }],
    }),
    (state: AppState) => ({
      ...state,
      expenses: [
        {
          ...state.expenses[0],
          payers: [{ memberId: "avery", amountCents: 4499 }],
        },
      ],
    }),
    (state: AppState) => ({
      ...state,
      expenses: [
        {
          ...state.expenses[0],
          participants: [
            { memberId: "avery", amountCents: 4500 },
            { memberId: "avery", amountCents: 0 },
          ],
        },
      ],
    }),
    (state: AppState) => ({
      ...state,
      expenses: [
        {
          ...state.expenses[1],
          percentageBasisPoints: { avery: 5000, jordan: 2500, sam: 2499 },
        },
      ],
    }),
    (state: AppState) => ({
      ...state,
      expenses: [
        {
          ...state.expenses[0],
          participants: [
            { memberId: "avery", amountCents: 1499 },
            { memberId: "jordan", amountCents: 1501 },
            { memberId: "sam", amountCents: 1500 },
          ],
        },
      ],
    }),
  ])("rejects corrupted structures and broken invariants (%#)", (corrupt) => {
    expect(() => validateState(corrupt(sample()))).toThrow();
  });
  it("selects the first active member when the saved perspective is archived", () => {
    const state = act(empty(), { type: "archive-member", id: "member-0" });
    state.selectedMemberId = "member-0";
    expect(validateState(state).selectedMemberId).toBe("member-1");
  });
  it("validates deterministic cent remainders without losing cents", () => {
    const state = sample();
    const expense = {
      ...state.expenses[0],
      amountCents: 100,
      payers: [{ memberId: "avery", amountCents: 100 }],
      participants: [
        { memberId: "avery", amountCents: 34 },
        { memberId: "jordan", amountCents: 33 },
        { memberId: "sam", amountCents: 33 },
      ],
    };
    expect(() =>
      validateState({ ...state, expenses: [expense] }),
    ).not.toThrow();
    expect(() =>
      validateState({
        ...state,
        expenses: [
          {
            ...expense,
            splitMethod: "percentage",
            percentageBasisPoints: { avery: 3334, jordan: 3333, sam: 3333 },
          },
        ],
      }),
    ).not.toThrow();
  });
});
