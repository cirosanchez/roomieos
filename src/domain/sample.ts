import { relativeDate } from "./dates";
import { validateState } from "./validation";
import type { AppState, Currency, Expense } from "./types";

export function createSampleHousehold(
  now: Date,
  currency: Currency = "CAD",
): AppState {
  const createdAt = now.toISOString();
  const choreCreatedAt = new Date(now.getTime() - 7 * 86400000).toISOString();
  const day = (offset: number) => relativeDate(now, offset);
  const expense = (
    id: string,
    description: string,
    amountCents: number,
    daysAgo: number,
    category: string,
    payers: Expense["payers"],
    participants: Expense["participants"],
    options: Partial<Expense> = {},
  ): Expense => ({
    id,
    description,
    amountCents,
    date: day(-daysAgo),
    category,
    notes: "",
    payers,
    participants,
    splitMethod: "equal",
    status: "open",
    createdAt,
    ...options,
  });
  const shares = (amount: number) =>
    ["avery", "jordan", "sam"].map((memberId) => ({
      memberId,
      amountCents: amount,
    }));
  return validateState({
    schemaVersion: 1,
    household: { name: "Maple House", currency },
    members: [
      {
        id: "avery",
        name: "Avery",
        avatar: { kind: "icon", value: "🌿" },
        active: true,
        order: 0,
      },
      {
        id: "jordan",
        name: "Jordan",
        avatar: { kind: "icon", value: "☀️" },
        active: true,
        order: 1,
      },
      {
        id: "sam",
        name: "Sam",
        avatar: { kind: "initials", value: "" },
        active: true,
        order: 2,
      },
    ],
    selectedMemberId: "avery",
    chores: [
      {
        id: "kitchen",
        title: "Clean the kitchen",
        notes: "Wipe the counters and stovetop.",
        assigneeId: "avery",
        dueDate: day(-1),
        status: "pending",
        completionHistory: [],
        createdAt: choreCreatedAt,
      },
      {
        id: "recycling",
        title: "Take out recycling",
        notes: "Flatten the cardboard first.",
        assigneeId: "jordan",
        dueDate: day(0),
        status: "pending",
        completionHistory: [],
        createdAt: choreCreatedAt,
      },
      {
        id: "bathroom",
        title: "Clean the bathroom",
        notes: "Supplies are under the sink.",
        assigneeId: "sam",
        dueDate: day(2),
        status: "pending",
        completionHistory: [],
        createdAt: choreCreatedAt,
      },
      {
        id: "vacuum",
        title: "Vacuum the living room",
        notes: "",
        assigneeId: "avery",
        dueDate: day(-2),
        status: "completed",
        completionHistory: [
          {
            id: "vacuum-completion",
            completedById: "avery",
            completedAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
          },
        ],
        createdAt: choreCreatedAt,
      },
      {
        id: "windows",
        title: "Wash the windows",
        notes: "Waiting for a warmer day.",
        assigneeId: "sam",
        dueDate: day(1),
        status: "skipped",
        completionHistory: [],
        createdAt: choreCreatedAt,
      },
    ],
    expenses: [
      expense(
        "groceries",
        "Weekly groceries",
        4500,
        1,
        "Groceries",
        [
          { memberId: "avery", amountCents: 3000 },
          { memberId: "jordan", amountCents: 1500 },
        ],
        shares(1500),
      ),
      expense(
        "internet",
        "Internet bill",
        6000,
        3,
        "Utilities",
        [{ memberId: "sam", amountCents: 6000 }],
        [
          { memberId: "avery", amountCents: 3000 },
          { memberId: "jordan", amountCents: 1500 },
          { memberId: "sam", amountCents: 1500 },
        ],
        {
          splitMethod: "percentage",
          percentageBasisPoints: { avery: 5000, jordan: 2500, sam: 2500 },
        },
      ),
      expense(
        "supplies",
        "Cleaning supplies",
        1800,
        5,
        "Household supplies",
        [{ memberId: "jordan", amountCents: 1800 }],
        shares(600),
        { status: "settled" },
      ),
      expense(
        "dinner",
        "House dinner",
        3000,
        2,
        "Other",
        [{ memberId: "avery", amountCents: 3000 }],
        [
          { memberId: "avery", amountCents: 500 },
          { memberId: "jordan", amountCents: 1000 },
          { memberId: "sam", amountCents: 1500 },
        ],
        { splitMethod: "fixed" },
      ),
    ],
    agreements: [
      {
        id: "quiet",
        title: "Quiet hours",
        details:
          "Keep noise low after 11 pm on weeknights, especially during exams.",
      },
      {
        id: "cleaning",
        title: "Cleaning supplies",
        details:
          "Add shared supplies to the expense list and keep them under the kitchen sink.",
      },
      {
        id: "guests",
        title: "Guest etiquette",
        details: "Give everyone a heads-up before inviting overnight guests.",
      },
    ],
    starterMode: "sample",
  });
}
