import { describe, expect, it } from "vitest";
import {
  applyExpenseAction,
  expenseReopenReason,
  type ExpenseAction,
  type ExpenseDraft,
} from "./expenses";
import { calculateBalances, splitEqual } from "./money";
import { applyHouseholdAction } from "./household";
import { createSampleHousehold } from "./sample";
import { validateState } from "./validation";
import {
  initialExpenseDraft,
  inspectExpenseDraft,
} from "../features/expenses/expense-draft";
import type { AppState } from "./types";

const now = new Date("2026-11-23T12:00:00Z");
const sample = () => createSampleHousehold(now);
function draft(): ExpenseDraft {
  return {
    description: " Weekly food ",
    amountCents: 100,
    date: "2026-11-23",
    category: "Groceries",
    notes: "Keep the rice.",
    payers: [
      { memberId: "avery", amountCents: 75 },
      { memberId: "sam", amountCents: 25 },
    ],
    participants: splitEqual(100, ["avery", "jordan", "sam"]),
    splitMethod: "equal",
  };
}
function act(state: AppState, action: ExpenseAction) {
  return applyExpenseAction(state, action, () => "new-expense", now);
}

describe("expense facts, split validation and settlement", () => {
  it("creates open records and edits without changing identity/status/creation time or mutating input", () => {
    const state = sample();
    const added = act(state, { type: "add-expense", expense: draft() });
    const expense = added.expenses.at(-1)!;
    expect(expense).toEqual({
      ...draft(),
      description: "Weekly food",
      id: "new-expense",
      status: "open",
      createdAt: now.toISOString(),
    });
    expect(state.expenses).toHaveLength(4);
    const settled = act(added, {
      type: "set-expense-status",
      id: expense.id,
      status: "settled",
    });
    const edited = act(settled, {
      type: "edit-expense",
      id: expense.id,
      expense: { ...draft(), description: "Changed" },
    });
    expect(edited.expenses.at(-1)).toEqual({
      ...expense,
      description: "Changed",
      status: "settled",
    });
  });
  it("validates independent payer and participant totals, including duplicate roles", () => {
    const base = draft();
    for (const expense of [
      { ...base, payers: [{ memberId: "avery", amountCents: 99 }] },
      {
        ...base,
        participants: [{ memberId: "avery", amountCents: 99 }],
        splitMethod: "fixed" as const,
      },
      {
        ...base,
        payers: [
          { memberId: "avery", amountCents: 0 },
          { memberId: "sam", amountCents: 100 },
        ],
      },
      {
        ...base,
        payers: [
          { memberId: "avery", amountCents: 50 },
          { memberId: "avery", amountCents: 50 },
        ],
      },
      {
        ...base,
        participants: [
          { memberId: "avery", amountCents: 50 },
          { memberId: "avery", amountCents: 50 },
        ],
      },
      {
        ...base,
        participants: [
          { memberId: "avery", amountCents: 33 },
          { memberId: "jordan", amountCents: 34 },
          { memberId: "sam", amountCents: 33 },
        ],
      },
      { ...base, amountCents: 0 },
      { ...base, amountCents: 1.25 },
      { ...base, date: "2026-02-30" },
      { ...base, description: " " },
      { ...base, description: "x".repeat(101) },
      { ...base, notes: "x".repeat(1001) },
      { ...base, payers: [] },
      { ...base, participants: [] },
    ])
      expect(() => act(sample(), { type: "add-expense", expense })).toThrow();
  });
  it("permits payers outside the participant set, valid zero fixed shares and exact percentage shares", () => {
    const base = {
      ...draft(),
      payers: [{ memberId: "sam", amountCents: 100 }],
    };
    const fixed = act(sample(), {
      type: "add-expense",
      expense: {
        ...base,
        participants: [
          { memberId: "avery", amountCents: 100 },
          { memberId: "jordan", amountCents: 0 },
        ],
        splitMethod: "fixed",
      },
    });
    expect(fixed.expenses.at(-1)?.participants[1].amountCents).toBe(0);
    const percentage: ExpenseDraft = {
      ...base,
      participants: [
        { memberId: "avery", amountCents: 33 },
        { memberId: "jordan", amountCents: 67 },
      ],
      splitMethod: "percentage",
      percentageBasisPoints: { avery: 3333, jordan: 6667 },
    };
    expect(() =>
      act(sample(), { type: "add-expense", expense: percentage }),
    ).not.toThrow();
    expect(() =>
      act(sample(), {
        type: "add-expense",
        expense: {
          ...percentage,
          percentageBasisPoints: { avery: 3333, jordan: 6666 },
        },
      }),
    ).toThrow();
    expect(() =>
      act(sample(), {
        type: "add-expense",
        expense: {
          ...percentage,
          participants: [
            { memberId: "avery", amountCents: 34 },
            { memberId: "jordan", amountCents: 66 },
          ],
        },
      }),
    ).toThrow();
  });
  it("settlement excludes precisely one record, reopening restores exact nets, deletion preserves others", () => {
    const state = sample();
    const before = calculateBalances(state.members, state.expenses);
    const settled = act(state, {
      type: "set-expense-status",
      id: "groceries",
      status: "settled",
    });
    expect(calculateBalances(settled.members, settled.expenses)).toEqual(
      calculateBalances(
        state.members,
        state.expenses.filter((expense) => expense.id !== "groceries"),
      ),
    );
    expect(settled.expenses[0]).toEqual({
      ...state.expenses[0],
      status: "settled",
    });
    expect(
      calculateBalances(
        state.members,
        act(settled, {
          type: "set-expense-status",
          id: "groceries",
          status: "open",
        }).expenses,
      ),
    ).toEqual(before);
    expect(
      act(state, { type: "delete-expense", id: "groceries" }).expenses,
    ).toEqual(state.expenses.slice(1));
  });
  it("permits historical archived edits, excludes archived new selections and requires restoration before reopening", () => {
    let state = sample();
    state.chores = [];
    state.expenses = [{ ...state.expenses[0], status: "settled" }];
    state = applyHouseholdAction(
      state,
      { type: "archive-member", id: "avery" },
      () => "unused",
    );
    const expense = state.expenses[0];
    expect(expenseReopenReason(state, expense)).toContain("Avery");
    expect(() =>
      act(state, {
        type: "set-expense-status",
        id: expense.id,
        status: "open",
      }),
    ).toThrow(/Restore Avery/);
    const historical = inspectExpenseDraft(
      state,
      initialExpenseDraft(state, expense),
      expense,
    ).data!;
    expect(
      act(state, {
        type: "edit-expense",
        id: expense.id,
        expense: { ...historical, description: "Historical edit" },
      }).expenses[0].description,
    ).toBe("Historical edit");
    expect(() => act(state, { type: "add-expense", expense: draft() })).toThrow(
      /active/,
    );
    state = applyHouseholdAction(
      state,
      { type: "restore-member", id: "avery" },
      () => "unused",
    );
    expect(
      act(state, { type: "set-expense-status", id: expense.id, status: "open" })
        .expenses[0].status,
    ).toBe("open");
  });
  it("rejects aggregate overflow at load and before a new expense could be persisted", () => {
    const large = {
      ...draft(),
      amountCents: Number.MAX_SAFE_INTEGER,
      payers: [{ memberId: "avery", amountCents: Number.MAX_SAFE_INTEGER }],
      participants: [{ memberId: "sam", amountCents: Number.MAX_SAFE_INTEGER }],
      splitMethod: "fixed" as const,
    };
    const state = sample();
    state.expenses = [];
    const first = act(state, { type: "add-expense", expense: large });
    expect(() =>
      act(first, {
        type: "add-expense",
        expense: {
          ...large,
          amountCents: 1,
          payers: [{ memberId: "avery", amountCents: 1 }],
          participants: [{ memberId: "sam", amountCents: 1 }],
        },
      }),
    ).toThrow();
    expect(() =>
      validateState({
        ...first,
        expenses: [...first.expenses, { ...first.expenses[0], id: "overflow" }],
      }),
    ).toThrow(/limit/);
  });
});

describe("expense form previews and edits", () => {
  it("converts sample expenses to valid drafts with exactly the same allocations", () => {
    const state = sample();
    for (const expense of state.expenses) {
      const preview = inspectExpenseDraft(
        state,
        initialExpenseDraft(state, expense),
        expense,
      );
      expect(preview.errors).toEqual({});
      expect(preview.data?.participants).toEqual(expense.participants);
      expect(preview.data?.payers).toEqual(expense.payers);
    }
  });
  it("revalidates all allocation modes after total, participant and payer changes", () => {
    const state = sample();
    const form = initialExpenseDraft(state, state.expenses[0]);
    form.amount = "1.00";
    expect(inspectExpenseDraft(state, form).errors.payers).toBeDefined();
    form.payers = [{ memberId: "avery", amount: "1.00" }];
    expect(
      inspectExpenseDraft(state, form).shares?.map((row) => row.amountCents),
    ).toEqual([34, 33, 33]);
    form.splitMethod = "percentage";
    form.shares = { avery: "33.33", jordan: "33.33", sam: "33.33" };
    expect(inspectExpenseDraft(state, form).errors.split).toBeDefined();
    form.shares.avery = "33.34";
    expect(
      inspectExpenseDraft(state, form).data?.participants.map(
        (row) => row.amountCents,
      ),
    ).toEqual([34, 33, 33]);
    form.participantIds = ["sam", "avery"];
    expect(inspectExpenseDraft(state, form).errors.split).toBeDefined();
    form.splitMethod = "fixed";
    form.shares = { sam: "0.50", avery: "0.49" };
    expect(inspectExpenseDraft(state, form).errors.split).toBeDefined();
    form.shares.avery = "0.50";
    expect(inspectExpenseDraft(state, form).data?.participants).toEqual([
      { memberId: "avery", amountCents: 50 },
      { memberId: "sam", amountCents: 50 },
    ]);
    form.payers.push({ memberId: "avery", amount: "1" });
    expect(
      inspectExpenseDraft(state, form).errors["payer-0-member"],
    ).toBeDefined();
  });
});
