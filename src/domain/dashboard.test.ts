import { describe, expect, it } from "vitest";
import { dashboardSummary } from "./dashboard";
import { createSampleHousehold } from "./sample";
import { createEmptyHousehold } from "./household";
import { applyChoreAction } from "./chores";
import { applyExpenseAction } from "./expenses";
import { applyAgreementAction } from "./agreements";

const now = new Date(2026, 10, 24, 12);
describe("dashboard derives personal and household facts", () => {
  it("counts only the selected roommate's pending chores for the supplied local date", () => {
    const state = createSampleHousehold(now);
    state.chores.push(
      { ...state.chores[0], id: "today", dueDate: "2026-11-24" },
      { ...state.chores[0], id: "tomorrow", dueDate: "2026-11-25" },
      {
        ...state.chores[0],
        id: "skipped",
        dueDate: "2026-11-23",
        status: "skipped",
      },
    );
    const before = structuredClone(state);
    const summary = dashboardSummary(state, "2026-11-24");
    expect(summary.overdueChoreCount).toBe(1);
    expect(summary.dueTodayChoreCount).toBe(1);
    const nextDay = dashboardSummary(state, "2026-11-25");
    expect(nextDay.overdueChoreCount).toBe(2);
    expect(nextDay.dueTodayChoreCount).toBe(1);
    const jordan = dashboardSummary(
      { ...state, selectedMemberId: "jordan" },
      "2026-11-24",
    );
    expect(jordan.overdueChoreCount).toBe(0);
    expect(jordan.dueTodayChoreCount).toBe(1);
    expect(state).toEqual(before);
  });
  it("uses real sample counts and changes personal facts without changing household counts on perspective switch", () => {
    const state = createSampleHousehold(now);
    const summary = dashboardSummary(state, "2026-11-24");
    expect(summary.selected.id).toBe("avery");
    expect(summary.pendingChores.map((chore) => chore.id)).toEqual(["kitchen"]);
    expect(summary.choreCounts).toEqual({
      pending: 3,
      completed: 1,
      skipped: 1,
    });
    expect(summary.openExpenseCount).toBe(3);
    expect(summary.activeMemberCount).toBe(3);
    expect(summary.agreementCount).toBe(3);
    expect(summary.netCents).toBe(1000);
    const sam = dashboardSummary(
      { ...state, selectedMemberId: "sam" },
      "2026-11-24",
    );
    expect(sam.netCents).toBe(1500);
    expect(sam.pendingChores.map((chore) => chore.id)).toEqual(["bathroom"]);
    expect(sam.choreCounts).toEqual(summary.choreCounts);
    expect(sam.openExpenseCount).toBe(summary.openExpenseCount);
  });
  it("sorts pending chores by due date and excludes completed/skipped/other assignments without mutating state", () => {
    const state = createSampleHousehold(now);
    state.chores.push(
      { ...state.chores[0], id: "later", dueDate: "2026-12-01" },
      { ...state.chores[0], id: "earlier", dueDate: "2026-01-01" },
    );
    const before = structuredClone(state);
    expect(
      dashboardSummary(state, "2026-11-24").pendingChores.map(
        (chore) => chore.id,
      ),
    ).toEqual(["earlier", "kitchen", "later"]);
    expect(state).toEqual(before);
  });
  it("updates after real chore, expense and agreement actions without persisting derived counts", () => {
    let state = createSampleHousehold(now);
    state = applyChoreAction(
      state,
      { type: "set-chore-status", id: "kitchen", status: "completed" },
      () => "event",
      now,
    );
    state = applyExpenseAction(
      state,
      { type: "set-expense-status", id: "groceries", status: "settled" },
      () => "unused",
      now,
    );
    state = applyAgreementAction(
      state,
      { type: "delete-agreement", id: "quiet" },
      () => "unused",
    );
    const summary = dashboardSummary(state, "2026-11-24");
    expect(summary.pendingChores).toEqual([]);
    expect(summary.choreCounts).toEqual({
      pending: 2,
      completed: 2,
      skipped: 1,
    });
    expect(summary.openExpenseCount).toBe(2);
    expect(summary.netCents).toBe(-500);
    expect(summary.agreementCount).toBe(2);
    expect(Object.keys(state).sort()).toEqual(
      Object.keys(createSampleHousehold(now)).sort(),
    );
  });
  it("represents empty households honestly with zero facts and the real active roster", () => {
    let id = 0;
    const state = createEmptyHousehold(
      {
        name: "Empty",
        currency: "GBP",
        members: ["Alex", "Morgan"].map((name) => ({
          name,
          avatar: { kind: "initials", value: "" },
        })),
      },
      () => `member-${id++}`,
    );
    const summary = dashboardSummary(state, "2026-11-24");
    expect(summary.activeMemberCount).toBe(2);
    expect(summary.choreCounts).toEqual({
      pending: 0,
      completed: 0,
      skipped: 0,
    });
    expect(summary.pendingChores).toEqual([]);
    expect(summary.netCents).toBe(0);
    expect(summary.openExpenseCount).toBe(0);
    expect(summary.agreementCount).toBe(0);
  });
});
