import type { AppState, PlannerEvent } from "./types";
import { plannerDraftSchema, validateState } from "./validation";
export type PlannerDraft = Omit<PlannerEvent, "id" | "createdAt">;
export type PlannerAction =
  | {
      type: "save-planner-event";
      id?: string;
      event: PlannerDraft;
      confirmedConflicts?: string;
    }
  | { type: "delete-planner-event"; id: string }
  | { type: "save-space"; id?: string; name: string }
  | { type: "archive-space"; id: string };
export const eventStart = (e: PlannerDraft) => `${e.startDate}T${e.startTime}`;
export const eventEnd = (e: PlannerDraft) => `${e.endDate}T${e.endTime}`;
export function overlaps(a: PlannerDraft, b: PlannerDraft) {
  return eventStart(a) < eventEnd(b) && eventStart(b) < eventEnd(a);
}
export function conflictsFor(
  events: PlannerEvent[],
  draft: PlannerDraft,
  id?: string,
) {
  return events.filter(
    (e) =>
      e.id !== id &&
      overlaps(e, draft) &&
      ((e.kind === "quiet") !== (draft.kind === "quiet") ||
        (e.kind === "reservation" &&
          draft.kind === "reservation" &&
          e.spaceId === draft.spaceId)),
  );
}
export function conflictSignature(events: PlannerEvent[]) {
  return JSON.stringify([...events].sort((a, b) => a.id.localeCompare(b.id)));
}
export function addDays(day: string, count: number) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + count);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export function segment(e: PlannerEvent, day: string) {
  if (
    day < e.startDate ||
    day > e.endDate ||
    (day === e.endDate && e.endTime === "00:00")
  )
    return null;
  return {
    event: e,
    start: day === e.startDate ? minutes(e.startTime) : 0,
    end: day === e.endDate ? minutes(e.endTime) : 1440,
  };
}
export function layoutDay(events: PlannerEvent[], day: string) {
  const rows = events
    .map((e) => segment(e, day))
    .filter((e) => e !== null)
    .sort(
      (a, b) =>
        a.start - b.start ||
        b.end - a.end ||
        a.event.id.localeCompare(b.event.id),
    );
  const result: ((typeof rows)[number] & {
    column: number;
    columns: number;
  })[] = [];
  let group: typeof result = [];
  let end = -1;
  const flush = () => {
    const columns = Math.max(1, ...group.map((r) => r.column + 1));
    result.push(...group.map((r) => ({ ...r, columns })));
    group = [];
  };
  for (const row of rows) {
    if (row.start >= end) {
      flush();
      end = -1;
    }
    let column = 0;
    while (group.some((r) => r.column === column && r.end > row.start))
      column++;
    group.push({ ...row, column, columns: 1 });
    end = Math.max(end, row.end);
  }
  flush();
  return result;
}
export function applyPlannerAction(
  state: AppState,
  action: PlannerAction,
  makeId: () => string,
  now: Date,
): AppState {
  if (action.type === "save-space") {
    const existing = state.sharedSpaces.find((s) => s.id === action.id);
    if (action.id && !existing) throw new Error("Space no longer exists.");
    const space = {
      id: existing?.id ?? makeId(),
      name: action.name.trim(),
      active: existing?.active ?? true,
    };
    return validateState({
      ...state,
      sharedSpaces: existing
        ? state.sharedSpaces.map((s) => (s.id === existing.id ? space : s))
        : [...state.sharedSpaces, space],
    });
  }
  if (action.type === "archive-space") {
    if (!state.sharedSpaces.some((s) => s.id === action.id))
      throw new Error("Space no longer exists.");
    return validateState({
      ...state,
      sharedSpaces: state.sharedSpaces.map((s) =>
        s.id === action.id ? { ...s, active: false } : s,
      ),
    });
  }
  const existing = state.plannerEvents.find((e) => e.id === action.id);
  if (action.id && !existing) throw new Error("Event no longer exists.");
  if (action.type === "delete-planner-event")
    return validateState({
      ...state,
      plannerEvents: state.plannerEvents.filter((e) => e.id !== action.id),
    });
  const draft = plannerDraftSchema.parse({
    ...action.event,
    title: action.event.title.trim(),
  });
  if (
    !state.members.some(
      (m) => m.id === draft.ownerId && (m.active || existing?.ownerId === m.id),
    )
  )
    throw new Error("Choose an active roommate.");
  if (
    draft.spaceId &&
    !state.sharedSpaces.some(
      (s) => s.id === draft.spaceId && (s.active || existing?.spaceId === s.id),
    )
  )
    throw new Error("Choose an active space.");
  const conflicts = conflictsFor(state.plannerEvents, draft, existing?.id);
  if (
    conflicts.length &&
    action.confirmedConflicts !== conflictSignature(conflicts)
  )
    throw new Error("Review overlapping events before saving.");
  const updated = {
    ...draft,
    id: existing?.id ?? makeId(),
    createdAt: existing?.createdAt ?? now.toISOString(),
  };
  return validateState({
    ...state,
    plannerEvents: existing
      ? state.plannerEvents.map((e) => (e.id === existing.id ? updated : e))
      : [...state.plannerEvents, updated],
  });
}
