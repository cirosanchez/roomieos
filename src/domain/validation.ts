import { z } from "zod";
import { isCalendarDate } from "./dates";
import type { AppState } from "./types";
import { calculateBalances, splitEqual, splitPercentage } from "./money";
import {
  avatarIcons,
  MAX_ACTIVE_MEMBERS,
  MIN_ACTIVE_MEMBERS,
} from "./household-options";

export const currencies = ["CAD", "USD", "EUR", "GBP"] as const;
const id = z.string().min(1).max(100);
const text = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine(
      (value) => value === value.trim(),
      "Remove spaces at the beginning or end.",
    );
const cents = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const calendarDate = z
  .string()
  .refine(isCalendarDate, "Choose a valid calendar date.");
const timestamp = z.iso.datetime({ offset: true });

export const choreDraftSchema = z.strictObject({
  title: text(100),
  notes: z.string().max(1000),
  assigneeId: id,
  dueDate: calendarDate,
});

export const expenseDraftSchema = z.strictObject({
  description: text(100),
  amountCents: cents.positive(),
  date: calendarDate,
  category: text(50),
  notes: z.string().max(1000),
  payers: z
    .array(z.strictObject({ memberId: id, amountCents: cents.positive() }))
    .min(1),
  participants: z
    .array(z.strictObject({ memberId: id, amountCents: cents }))
    .min(1),
  splitMethod: z.enum(["equal", "percentage", "fixed"]),
  percentageBasisPoints: z
    .record(id, z.number().int().min(0).max(10000))
    .optional(),
});

export const avatarSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("initials"), value: z.literal("") }),
  z.strictObject({ kind: z.literal("icon"), value: z.enum(avatarIcons) }),
  z.strictObject({
    kind: z.literal("image"),
    value: z
      .string()
      .max(100_000)
      .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/),
  }),
]);
export const memberDraftSchema = z.strictObject({
  name: text(40),
  avatar: avatarSchema,
});
export const householdDraftSchema = z.strictObject({
  name: text(60),
  currency: z.enum(currencies),
});
export const setupSchema = householdDraftSchema.extend({
  members: z
    .array(memberDraftSchema)
    .min(MIN_ACTIVE_MEMBERS)
    .max(MAX_ACTIVE_MEMBERS),
});

const stateSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    household: householdDraftSchema,
    members: z.array(
      memberDraftSchema.extend({
        id,
        active: z.boolean(),
        order: z
          .number()
          .int()
          .nonnegative()
          .max(Number.MAX_SAFE_INTEGER - 1),
      }),
    ),
    selectedMemberId: id,
    chores: z.array(
      choreDraftSchema.extend({
        id,
        status: z.enum(["pending", "completed", "skipped"]),
        completionHistory: z.array(
          z.strictObject({ id, completedById: id, completedAt: timestamp }),
        ),
        createdAt: timestamp,
      }),
    ),
    expenses: z.array(
      expenseDraftSchema.extend({
        id,
        status: z.enum(["open", "settled"]),
        createdAt: timestamp,
      }),
    ),
    agreements: z.array(
      z.strictObject({ id, title: text(100), details: z.string().max(1000) }),
    ),
    starterMode: z.enum(["sample", "empty"]),
  })
  .superRefine((state, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    const unique = (values: (string | number)[]) =>
      new Set(values).size === values.length;
    const members = new Map(state.members.map((member) => [member.id, member]));
    const active = state.members.filter((member) => member.active);
    if (
      active.length < MIN_ACTIVE_MEMBERS ||
      active.length > MAX_ACTIVE_MEMBERS
    )
      issue(
        `A household needs ${MIN_ACTIVE_MEMBERS}–${MAX_ACTIVE_MEMBERS} active roommates.`,
      );
    if (
      !unique(state.members.map((member) => member.id)) ||
      !unique(state.members.map((member) => member.order))
    )
      issue("Roommate identities and roster positions must be unique.");
    if (!members.has(state.selectedMemberId))
      issue("The selected roommate does not exist.");
    for (const collection of [state.chores, state.expenses, state.agreements]) {
      if (!unique(collection.map((item) => item.id)))
        issue("Record identities must be unique.");
    }
    const events = state.chores.flatMap((chore) => chore.completionHistory);
    if (!unique(events.map((event) => event.id)))
      issue("Completion identities must be unique.");
    for (const chore of state.chores) {
      if (
        !members.has(chore.assigneeId) ||
        (chore.status === "pending" && !members.get(chore.assigneeId)?.active)
      )
        issue("Pending chores must be assigned to active roommates.");
      if (chore.status === "completed" && chore.completionHistory.length === 0)
        issue("Completed chores need a completion event.");
      if (
        chore.completionHistory.some(
          (event) => !members.has(event.completedById),
        )
      )
        issue("Completion history references a missing roommate.");
    }
    for (const expense of state.expenses) {
      const all = [...expense.payers, ...expense.participants];
      if (
        all.some(
          (row) =>
            !members.has(row.memberId) ||
            (expense.status === "open" && !members.get(row.memberId)?.active),
        )
      )
        issue("Open expenses must reference active roommates.");
      for (const rows of [expense.payers, expense.participants]) {
        if (!unique(rows.map((row) => row.memberId)))
          issue("A roommate may occur only once in each expense role.");
        if (
          rows.reduce((total, row) => total + BigInt(row.amountCents), 0n) !==
          BigInt(expense.amountCents)
        )
          issue("Expense contributions and shares must each equal the total.");
      }
      if (
        expense.splitMethod !== "percentage" &&
        expense.percentageBasisPoints !== undefined
      )
        issue("Only percentage splits may have percentage weights.");
      if (expense.splitMethod === "fixed") continue;
      const participants = [...expense.participants].sort(
        (a, b) =>
          (members.get(a.memberId)?.order ?? 0) -
          (members.get(b.memberId)?.order ?? 0),
      );
      const weights = expense.percentageBasisPoints;
      if (
        expense.splitMethod === "percentage" &&
        (!weights ||
          Object.keys(weights).length !== participants.length ||
          participants.some((row) => weights[row.memberId] === undefined) ||
          Object.values(weights).reduce((a, b) => a + b, 0) !== 10000)
      ) {
        issue("Percentages must match the participants and total 100.00%.");
        continue;
      }
      try {
        const ids = participants.map((row) => row.memberId);
        const expected =
          expense.splitMethod === "equal"
            ? splitEqual(expense.amountCents, ids)
            : splitPercentage(expense.amountCents, ids, weights!);
        if (
          expected.some(
            (row, index) => row.amountCents !== participants[index].amountCents,
          )
        )
          issue("Saved shares do not match the chosen split.");
      } catch {
        issue("Saved shares do not match the chosen split.");
      }
    }
    try {
      calculateBalances(state.members, state.expenses);
    } catch (error) {
      issue(
        error instanceof Error
          ? error.message
          : "Expense balances are invalid.",
      );
    }
  });

export function validateState(value: unknown): AppState {
  const state = stateSchema.parse(value);
  if (
    !state.members.find((member) => member.id === state.selectedMemberId)
      ?.active
  ) {
    state.selectedMemberId = [...state.members]
      .filter((member) => member.active)
      .sort((a, b) => a.order - b.order)[0].id;
  }
  return state;
}
