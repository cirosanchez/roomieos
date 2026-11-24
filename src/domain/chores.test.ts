import { describe, expect, it } from "vitest";
import {
  applyChoreAction,
  isOverdue,
  nextChoreAssignee,
  suggestedRotationDate,
  type ChoreAction,
} from "./chores";
import { applyHouseholdAction } from "./household";
import { createSampleHousehold } from "./sample";
import { localDate } from "./dates";
import type { AppState } from "./types";

const now = new Date("2026-11-24T02:30:00Z");
const draft = {
  title: "  Water plants  ",
  notes: "A little water.",
  assigneeId: "jordan",
  dueDate: "2026-11-25",
};
function run(
  state: AppState,
  action: ChoreAction,
  id = "generated",
  date = now,
) {
  return applyChoreAction(state, action, () => id, date);
}
function sample() {
  return createSampleHousehold(now);
}
function archivedSample() {
  const state = sample();
  state.expenses = [];
  state.chores = state.chores.filter((chore) => chore.id === "vacuum");
  state.members.find((member) => member.id === "avery")!.active = false;
  state.selectedMemberId = "jordan";
  return state;
}

describe("chore facts and completion events", () => {
  it("creates a pending chore with trimmed title, then edits only draft fields without mutating input", () => {
    const initial = sample();
    const saved = run(initial, { type: "add-chore", chore: draft });
    const added = saved.chores.at(-1)!;
    expect(added).toEqual({
      ...draft,
      title: "Water plants",
      id: "generated",
      status: "pending",
      completionHistory: [],
      createdAt: now.toISOString(),
    });
    expect(initial.chores).toHaveLength(5);
    const completed = run(
      saved,
      { type: "set-chore-status", id: added.id, status: "completed" },
      "event",
    );
    const edited = run(completed, {
      type: "edit-chore",
      id: added.id,
      chore: { ...draft, title: "Plants", assigneeId: "sam" },
    });
    expect(edited.chores.at(-1)).toEqual({
      ...completed.chores.at(-1),
      title: "Plants",
      assigneeId: "sam",
    });
    expect(saved.chores.at(-1)?.completionHistory).toEqual([]);
  });
  it("uses the selected profile and injected timestamp, avoids duplicate completion, and appends on recompletion", () => {
    const initial = sample();
    initial.selectedMemberId = "sam";
    const completed = run(
      initial,
      { type: "set-chore-status", id: "kitchen", status: "completed" },
      "first",
    );
    const first = completed.chores[0].completionHistory[0];
    expect(first).toEqual({
      id: "first",
      completedById: "sam",
      completedAt: now.toISOString(),
    });
    expect(
      run(completed, {
        type: "set-chore-status",
        id: "kitchen",
        status: "completed",
      }),
    ).toBe(completed);
    const reopened = run(completed, {
      type: "set-chore-status",
      id: "kitchen",
      status: "pending",
    });
    const skipped = run(reopened, {
      type: "set-chore-status",
      id: "kitchen",
      status: "skipped",
    });
    const again = run(
      skipped,
      { type: "set-chore-status", id: "kitchen", status: "completed" },
      "second",
      new Date("2026-11-25T12:00:00Z"),
    );
    expect(again.chores[0].completionHistory).toEqual([
      first,
      {
        id: "second",
        completedById: "sam",
        completedAt: "2026-11-25T12:00:00.000Z",
      },
    ]);
    expect(completed.chores[0].completionHistory).toHaveLength(1);
  });
  it("deletes only the selected chore and its history", () => {
    const state = sample();
    const next = run(state, { type: "delete-chore", id: "vacuum" });
    expect(next.chores).toEqual(
      state.chores.filter((chore) => chore.id !== "vacuum"),
    );
    expect(
      state.chores.find((chore) => chore.id === "vacuum")?.completionHistory,
    ).toHaveLength(1);
  });
  it.each([
    { ...draft, title: " " },
    { ...draft, title: "x".repeat(101) },
    { ...draft, notes: "x".repeat(1001) },
    { ...draft, assigneeId: "missing" },
    { ...draft, dueDate: "2026-02-29" },
    { ...draft, dueDate: "2026-13-01" },
    { ...draft, dueDate: "" },
  ])("rejects invalid chore input without changing state (%j)", (chore) => {
    const state = sample();
    const before = structuredClone(state);
    expect(() => run(state, { type: "add-chore", chore })).toThrow();
    expect(() =>
      run(state, { type: "edit-chore", id: "kitchen", chore }),
    ).toThrow();
    expect(state).toEqual(before);
  });
  it("rejects missing records and invalid rotation dates", () => {
    expect(() =>
      run(sample(), { type: "delete-chore", id: "missing" }),
    ).toThrow(/could not be found/);
    expect(() =>
      run(sample(), {
        type: "rotate-chore",
        id: "kitchen",
        dueDate: "2026-02-30",
      }),
    ).toThrow(/valid calendar/);
  });
});

describe("active roster rotation and historical members", () => {
  it("follows stable order regardless of array order, wraps, and reopens while preserving notes/history", () => {
    const state = sample();
    state.members.reverse();
    expect(nextChoreAssignee(state, "avery").id).toBe("jordan");
    expect(nextChoreAssignee(state, "sam").id).toBe("avery");
    const chore = state.chores.find((item) => item.id === "vacuum")!;
    const next = run(state, {
      type: "rotate-chore",
      id: chore.id,
      dueDate: "2026-12-01",
    });
    expect(next.chores.find((item) => item.id === chore.id)).toEqual({
      ...chore,
      assigneeId: "jordan",
      dueDate: "2026-12-01",
      status: "pending",
    });
    expect(chore.status).toBe("completed");
  });
  it("rotates from archived assignees and skips archived gaps, including after restore", () => {
    const state = archivedSample();
    expect(nextChoreAssignee(state, "sam").id).toBe("jordan");
    expect(nextChoreAssignee(state, "avery").id).toBe("jordan");
    const restored = applyHouseholdAction(
      state,
      { type: "restore-member", id: "avery" },
      () => "unused",
    );
    expect(nextChoreAssignee(restored, "sam").id).toBe("avery");
    expect(
      run(state, { type: "rotate-chore", id: "vacuum", dueDate: "2026-12-01" })
        .chores[0],
    ).toMatchObject({ status: "pending", assigneeId: "jordan" });
  });
  it("permits historical edits, blocks archived reopening/new assignment, and permits reassignment before reopening", () => {
    const state = archivedSample();
    const chore = state.chores[0];
    expect(
      run(state, {
        type: "edit-chore",
        id: chore.id,
        chore: {
          title: "Historical edit",
          notes: chore.notes,
          dueDate: chore.dueDate,
          assigneeId: chore.assigneeId,
        },
      }).chores[0].title,
    ).toBe("Historical edit");
    expect(() =>
      run(state, { type: "set-chore-status", id: chore.id, status: "pending" }),
    ).toThrow(/Reassign/);
    expect(() =>
      run(state, {
        type: "add-chore",
        chore: { ...draft, assigneeId: "avery" },
      }),
    ).toThrow(/active roommate/);
    const assigned = run(state, {
      type: "edit-chore",
      id: chore.id,
      chore: { ...draft, assigneeId: "sam" },
    });
    const opened = run(assigned, {
      type: "set-chore-status",
      id: chore.id,
      status: "pending",
    });
    expect(opened.chores[0].completionHistory).toEqual(chore.completionHistory);
  });
  it("wraps a 20-member roster and skips archived members without relying on array positions", () => {
    const state = sample();
    state.members = Array.from({ length: 20 }, (_, order) => ({
      ...state.members[0],
      id: `member-${order}`,
      order,
    }));
    state.members[5].active = false;
    expect(nextChoreAssignee(state, "member-19").id).toBe("member-0");
    expect(nextChoreAssignee(state, "member-4").id).toBe("member-6");
  });
  it("updates archive obligations after reassigning a pending chore", () => {
    const state = sample();
    state.expenses = [];
    expect(() =>
      applyHouseholdAction(
        state,
        { type: "archive-member", id: "jordan" },
        () => "unused",
      ),
    ).toThrow(/pending chores/);
    const reassigned = run(state, {
      type: "edit-chore",
      id: "recycling",
      chore: { ...draft, assigneeId: "sam" },
    });
    expect(
      applyHouseholdAction(
        reassigned,
        { type: "archive-member", id: "jordan" },
        () => "unused",
      ).members.find((member) => member.id === "jordan")?.active,
    ).toBe(false);
  });
});

describe("local calendar overdue and rotation suggestions", () => {
  it("marks only pending dates strictly before the local date", () => {
    for (const status of ["pending", "completed", "skipped"] as const) {
      expect(isOverdue({ status, dueDate: "2026-11-23" }, "2026-11-24")).toBe(
        status === "pending",
      );
      expect(isOverdue({ status, dueDate: "2026-11-24" }, "2026-11-24")).toBe(
        false,
      );
      expect(isOverdue({ status, dueDate: "2026-11-25" }, "2026-11-24")).toBe(
        false,
      );
    }
    const local = new Date(2026, 10, 23, 23, 59);
    expect(localDate(local)).toBe("2026-11-23");
  });
  it.each([
    ["2026-11-22", "2026-11-24", "2026-12-01"],
    ["2026-11-24", "2026-11-24", "2026-12-01"],
    ["2026-12-29", "2026-11-24", "2027-01-05"],
    ["2028-02-24", "2028-02-23", "2028-03-02"],
    ["2026-03-05", "2026-03-05", "2026-03-12"],
  ])(
    "suggests seven calendar days from the later date (%s, %s)",
    (due, today, expected) => {
      expect(suggestedRotationDate(due, today)).toBe(expected);
    },
  );
});
