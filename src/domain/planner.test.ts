import { describe, expect, it } from "vitest";
import { createSampleHousehold } from "./sample";
import { validateState } from "./validation";
import {
  addDays,
  applyPlannerAction,
  conflictsFor,
  conflictSignature,
  layoutDay,
  segment,
} from "./planner";
import type { PlannerEvent } from "./types";
const now = new Date("2026-11-25T12:00Z");
const event = (patch: Partial<PlannerEvent> = {}): PlannerEvent =>
  ({
    id: "event",
    kind: "guest",
    title: "Maya",
    ownerId: "avery",
    startDate: "2026-11-27",
    startTime: "18:00",
    endDate: "2026-11-29",
    endTime: "00:00",
    spaceId: null,
    notes: "",
    createdAt: now.toISOString(),
    ...patch,
  }) as PlannerEvent;
const draft = (e: PlannerEvent) => {
  const { id, createdAt, ...rest } = e;
  void id;
  void createdAt;
  return rest;
};
describe("planner", () => {
  it("normalizes legacy households without injecting sample events", () => {
    const s = createSampleHousehold(now);
    const { plannerEvents, sharedSpaces, ...legacy } = s;
    void plannerEvents;
    void sharedSpaces;
    const upgraded = validateState(legacy);
    expect(upgraded.plannerEvents).toEqual([]);
    expect(upgraded.sharedSpaces).toHaveLength(2);
    expect(upgraded.chores).toEqual(s.chores);
  });
  it("rejects supplied malformed planner data", () => {
    expect(() =>
      validateState({ ...createSampleHousehold(now), plannerEvents: null }),
    ).toThrow();
    expect(() =>
      validateState({
        ...createSampleHousehold(now),
        plannerEvents: [event({ endDate: "2026-11-26" })],
      }),
    ).toThrow();
  });
  it("segments an overnight stay excluding a midnight departure day", () => {
    expect(segment(event(), "2026-11-27")).toMatchObject({
      start: 1080,
      end: 1440,
    });
    expect(segment(event(), "2026-11-28")).toMatchObject({
      start: 0,
      end: 1440,
    });
    expect(segment(event(), "2026-11-29")).toBeNull();
  });
  it("uses calendar dates across leap, year and DST boundaries", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
  });
  it("warns for quiet overlaps but not two guest visits", () => {
    expect(
      conflictsFor([event()], draft(event({ id: "other" })), "other"),
    ).toEqual([]);
    expect(
      conflictsFor([event({ kind: "quiet" })], draft(event())),
    ).toHaveLength(1);
  });
  it("warns on the same space, allows adjacent and different-space reservations", () => {
    const a = event({
      kind: "reservation",
      spaceId: "kitchen",
      endDate: "2026-11-27",
      endTime: "19:00",
    });
    expect(conflictsFor([a], draft(a))).toHaveLength(1);
    expect(
      conflictsFor(
        [a],
        draft(event({ ...a, kind: "reservation", spaceId: "living" })),
      ),
    ).toEqual([]);
    expect(
      conflictsFor([a], draft({ ...a, startTime: "19:00", endTime: "20:00" })),
    ).toEqual([]);
    expect(conflictsFor([a], draft(a), a.id)).toEqual([]);
  });
  it("requires a current conflict confirmation and retains creation identity on edit", () => {
    const state = {
      ...createSampleHousehold(now),
      plannerEvents: [event({ kind: "quiet" })],
    };
    const input = draft(event());
    expect(() =>
      applyPlannerAction(
        state,
        { type: "save-planner-event", event: input },
        () => "new",
        now,
      ),
    ).toThrow(/overlapping/);
    const next = applyPlannerAction(
      state,
      {
        type: "save-planner-event",
        event: input,
        confirmedConflicts: conflictSignature(state.plannerEvents),
      },
      () => "new",
      now,
    );
    expect(next.plannerEvents).toHaveLength(2);
    const changed = {
      ...state,
      plannerEvents: [event({ kind: "quiet", endTime: "01:00" })],
    };
    expect(() =>
      applyPlannerAction(
        changed,
        {
          type: "save-planner-event",
          event: input,
          confirmedConflicts: conflictSignature(state.plannerEvents),
        },
        () => "new",
        now,
      ),
    ).toThrow();
  });
  it("keeps archived space references and prevents new selections", () => {
    let s = createSampleHousehold(now);
    s = applyPlannerAction(
      s,
      { type: "archive-space", id: "kitchen" },
      () => "id",
      now,
    );
    expect(s.plannerEvents.find((e) => e.id === "meal-prep")?.spaceId).toBe(
      "kitchen",
    );
    expect(() =>
      applyPlannerAction(
        s,
        {
          type: "save-planner-event",
          event: draft(event({ kind: "reservation", spaceId: "kitchen" })),
        },
        () => "new",
        now,
      ),
    ).toThrow(/active space/);
    expect(() =>
      applyPlannerAction(
        s,
        { type: "save-space", name: " KITCHEN " },
        () => "new",
        now,
      ),
    ).toThrow();
  });
  it("lays out overlapping groups separately from adjacent events", () => {
    const a = event({
      startTime: "09:00",
      endDate: "2026-11-27",
      endTime: "10:00",
    });
    const rows = layoutDay(
      [
        a,
        { ...a, id: "b", startTime: "09:30", endTime: "11:00" },
        { ...a, id: "c", startTime: "11:00", endTime: "12:00" },
      ],
      "2026-11-27",
    );
    expect(rows.map((r) => [r.column, r.columns])).toEqual([
      [0, 2],
      [1, 2],
      [0, 1],
    ]);
  });
});
