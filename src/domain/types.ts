// Serializable household facts. Runtime validation lives in validation.ts.
export type Currency = "CAD" | "USD" | "EUR" | "GBP";
export type ChoreStatus = "pending" | "completed" | "skipped";
export type SplitMethod = "equal" | "percentage" | "fixed";
export type ExpenseStatus = "open" | "settled";

export type Member = {
  id: string;
  name: string;
  avatar: { kind: "initials" | "icon" | "image"; value: string };
  active: boolean;
  order: number;
};
export type CompletionEvent = {
  id: string;
  completedById: string;
  completedAt: string;
};
export type Chore = {
  id: string;
  title: string;
  notes: string;
  assigneeId: string;
  dueDate: string;
  status: ChoreStatus;
  completionHistory: CompletionEvent[];
  createdAt: string;
};
export type Contribution = { memberId: string; amountCents: number };
export type ParticipantShare = { memberId: string; amountCents: number };
export type Expense = {
  id: string;
  description: string;
  amountCents: number;
  date: string;
  category: string;
  notes: string;
  payers: Contribution[];
  participants: ParticipantShare[];
  splitMethod: SplitMethod;
  percentageBasisPoints?: Record<string, number>;
  status: ExpenseStatus;
  createdAt: string;
};
export type Agreement = { id: string; title: string; details: string };
export type SharedSpace = { id: string; name: string; active: boolean };
export type PlannerEvent = {
  id: string;
  ownerId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  notes: string;
  createdAt: string;
} & (
  | { kind: "guest"; title: string; spaceId: string | null }
  | { kind: "quiet"; title: string; spaceId: null }
  | { kind: "reservation"; title: string; spaceId: string }
);
export type AppState = {
  schemaVersion: 1;
  household: { name: string; currency: Currency };
  members: Member[];
  selectedMemberId: string;
  chores: Chore[];
  expenses: Expense[];
  agreements: Agreement[];
  plannerEvents: PlannerEvent[];
  sharedSpaces: SharedSpace[];
  starterMode: "sample" | "empty";
};
