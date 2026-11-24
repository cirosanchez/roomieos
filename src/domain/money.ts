import type { Currency, Expense, Member, ParticipantShare } from "./types";

const MAX = BigInt(Number.MAX_SAFE_INTEGER);
export function safeCents(value: bigint): number {
  if (value > MAX || value < -MAX)
    throw new Error(
      "These amounts exceed the supported calculation limit. Reduce the amounts before saving.",
    );
  return Number(value);
}
export function parseMoney(value: string, allowZero = false): number {
  const clean = value.trim();
  if (clean.length > 32 || !/^(?:\d+|\d*\.\d{1,2})$/.test(clean))
    throw new Error(
      "Enter an amount with up to two decimal places, without commas or currency symbols.",
    );
  const [whole, fraction = ""] = clean.split(".");
  const cents = safeCents(
    BigInt(whole || "0") * 100n + BigInt(fraction.padEnd(2, "0")),
  );
  if (!allowZero && cents === 0)
    throw new Error("Enter an amount greater than zero.");
  return cents;
}
export function parsePercentage(value: string): number {
  const basisPoints = parseMoney(value, true);
  if (basisPoints > 10000)
    throw new Error(
      "Enter a percentage from 0 to 100, with up to two decimal places.",
    );
  return basisPoints;
}
export function moneyInput(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0)
    throw new Error("Enter a valid amount.");
  return `${BigInt(cents) / 100n}.${String(BigInt(cents) % 100n).padStart(2, "0")}`;
}
export function formatMoney(
  value: number | bigint,
  currency: Currency,
): string {
  if (typeof value === "number" && !Number.isSafeInteger(value))
    throw new Error("Enter a valid amount.");
  const cents = BigInt(value);
  const absolute = cents < 0n ? -cents : cents;
  const parts = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).formatToParts(absolute / 100n);
  return (
    (cents < 0n ? "-" : "") +
    parts
      .map((part) =>
        part.type === "fraction"
          ? String(absolute % 100n).padStart(2, "0")
          : part.value,
      )
      .join("")
  );
}

function allocate(
  amount: number,
  rows: { memberId: string; weight: number }[],
  divisor: number,
): ParticipantShare[] {
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !rows.length ||
    new Set(rows.map((row) => row.memberId)).size !== rows.length
  )
    throw new Error(
      "Choose a positive total and at least one unique participant.",
    );
  if (
    rows.some((row) => !Number.isSafeInteger(row.weight) || row.weight < 0) ||
    rows.reduce((total, row) => total + row.weight, 0) !== divisor
  )
    throw new Error("Percentages must total exactly 100.00%.");
  const allocations = rows.map((row, index) => {
    const product = BigInt(amount) * BigInt(row.weight);
    return {
      memberId: row.memberId,
      index,
      amount: product / BigInt(divisor),
      remainder: product % BigInt(divisor),
    };
  });
  const remaining = Number(
    BigInt(amount) - allocations.reduce((sum, row) => sum + row.amount, 0n),
  );
  [...allocations]
    .sort((a, b) =>
      a.remainder === b.remainder
        ? a.index - b.index
        : a.remainder > b.remainder
          ? -1
          : 1,
    )
    .slice(0, remaining)
    .forEach((row) => {
      row.amount += 1n;
    });
  return allocations.map((row) => ({
    memberId: row.memberId,
    amountCents: Number(row.amount),
  }));
}
// Callers pass participants in stable household roster order for cent ties.
export function splitEqual(
  amount: number,
  memberIds: string[],
): ParticipantShare[] {
  return allocate(
    amount,
    memberIds.map((memberId) => ({ memberId, weight: 1 })),
    memberIds.length,
  );
}
export function splitPercentage(
  amount: number,
  memberIds: string[],
  weights: Record<string, number>,
): ParticipantShare[] {
  if (
    Object.keys(weights).length !== memberIds.length ||
    memberIds.some((id) => !Object.hasOwn(weights, id))
  )
    throw new Error("Percentages must match the selected participants.");
  if (Object.values(weights).some((weight) => weight > 10000))
    throw new Error("Enter percentages from 0 to 100.");
  return allocate(
    amount,
    memberIds.map((memberId) => ({ memberId, weight: weights[memberId] })),
    10000,
  );
}
export type MemberBalance = { memberId: string; netCents: number };
export type SuggestedTransfer = {
  fromId: string;
  toId: string;
  amountCents: number;
};
export function calculateBalances(
  members: Member[],
  expenses: Expense[],
): MemberBalance[] {
  const nets = new Map(members.map((member) => [member.id, 0n]));
  for (const expense of expenses) {
    if (expense.status !== "open") continue;
    for (const [rows, sign] of [
      [expense.payers, 1n],
      [expense.participants, -1n],
    ] as const) {
      for (const row of rows) {
        if (
          !nets.has(row.memberId) ||
          !Number.isSafeInteger(row.amountCents) ||
          row.amountCents < 0
        )
          throw new Error(
            "Expense balances reference an invalid amount or roommate.",
          );
        nets.set(
          row.memberId,
          nets.get(row.memberId)! + BigInt(row.amountCents) * sign,
        );
      }
    }
  }
  if ([...nets.values()].reduce((sum, value) => sum + value, 0n) !== 0n)
    throw new Error("Expense balances must sum to zero.");
  safeCents(
    [...nets.values()]
      .filter((net) => net > 0n)
      .reduce((sum, net) => sum + net, 0n),
  );
  return [...members]
    .sort((a, b) => a.order - b.order)
    .map((member) => ({
      memberId: member.id,
      netCents: safeCents(nets.get(member.id)!),
    }));
}
export function simplifyBalances(
  balances: MemberBalance[],
): SuggestedTransfer[] {
  const unique = new Set(balances.map((row) => row.memberId));
  if (
    unique.size !== balances.length ||
    balances.some((row) => !Number.isSafeInteger(row.netCents)) ||
    balances.reduce((sum, row) => sum + BigInt(row.netCents), 0n) !== 0n
  )
    throw new Error("Expense balances must be valid and sum to zero.");
  const creditors = balances
    .filter((row) => row.netCents > 0)
    .map((row) => ({ id: row.memberId, remaining: row.netCents }));
  const debtors = balances
    .filter((row) => row.netCents < 0)
    .map((row) => ({ id: row.memberId, remaining: -row.netCents }));
  safeCents(creditors.reduce((sum, row) => sum + BigInt(row.remaining), 0n));
  const rank = (
    a: { id: string; remaining: number },
    b: { id: string; remaining: number },
  ) => b.remaining - a.remaining || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const transfers: SuggestedTransfer[] = [];
  while (
    creditors.some((row) => row.remaining) &&
    debtors.some((row) => row.remaining)
  ) {
    creditors.sort(rank);
    debtors.sort(rank);
    const creditor = creditors[0],
      debtor = debtors[0];
    const amountCents = Math.min(creditor.remaining, debtor.remaining);
    transfers.push({ fromId: debtor.id, toId: creditor.id, amountCents });
    creditor.remaining -= amountCents;
    debtor.remaining -= amountCents;
  }
  return transfers;
}
