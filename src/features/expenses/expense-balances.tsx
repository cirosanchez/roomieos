"use client";

import { Scale } from "lucide-react";
import { MemberAvatar } from "@/components/ui/member-avatar";
import {
  calculateBalances,
  formatMoney,
  simplifyBalances,
  type SuggestedTransfer,
} from "@/domain/money";
import { useReadyHousehold } from "@/state/household-provider";

export function ExpenseBalances() {
  const { state } = useReadyHousehold();
  const balances = calculateBalances(state.members, state.expenses);
  const net = balances.find(
    (row) => row.memberId === state.selectedMemberId,
  )!.netCents;
  const transfers = simplifyBalances(balances);
  const personal = transfers.filter(
    (row) =>
      row.fromId === state.selectedMemberId ||
      row.toId === state.selectedMemberId,
  );
  const names = personal.map(
    (row) =>
      state.members.find(
        (member) => member.id === (net < 0 ? row.toId : row.fromId),
      )!.name,
  );
  const people = new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  }).format(names);
  const amount = formatMoney(Math.abs(net), state.household.currency);
  const tone =
    net < 0 ? "text-danger" : net > 0 ? "text-success" : "text-muted";
  function transferRow(transfer: SuggestedTransfer) {
    const from = state.members.find((member) => member.id === transfer.fromId)!;
    const to = state.members.find((member) => member.id === transfer.toId)!;
    const outgoing = from.id === state.selectedMemberId;
    const incoming = to.id === state.selectedMemberId;
    const counterpart = outgoing ? to : from;
    return (
      <li
        key={`${from.id}-${to.id}`}
        className="flex min-w-0 items-start gap-3 py-3 first:pt-0"
      >
        <div className="flex shrink-0 -space-x-1.5">
          <MemberAvatar
            name={counterpart.name}
            icon={
              counterpart.avatar.kind === "icon"
                ? counterpart.avatar.value
                : undefined
            }
          />
        </div>
        <p className="min-w-0 flex-1 break-words text-sm leading-7">
          {outgoing ? "You owe " : `${from.name} owes you `}
          <strong
            className={`font-semibold tabular-nums ${outgoing ? "text-danger" : "text-success"}`}
          >
            {formatMoney(transfer.amountCents, state.household.currency)}
          </strong>
          {incoming ? "." : ` to ${to.name}.`}
        </p>
      </li>
    );
  }
  return (
    <div className="mb-9 grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <section
        className="min-w-0 rounded-[10px] border border-line p-5"
        aria-label="My net position"
      >
        <h2 className="text-sm font-medium text-muted">My net position</h2>
        <p
          data-net-amount
          className={`mt-3 break-words text-3xl font-semibold tabular-nums ${tone}`}
        >
          {formatMoney(net, state.household.currency)}
        </p>
        <p className="mt-3 break-words text-sm leading-relaxed text-ink">
          {net < 0
            ? `You owe ${amount} in total to ${people}.`
            : net > 0
              ? `You are owed ${amount} in total by ${people}.`
              : "You have no outstanding balance."}
        </p>
        <p className="mt-4 text-xs text-muted">Across open expenses only.</p>
      </section>
      <section
        className="min-w-0 rounded-[10px] border border-line p-5"
        aria-labelledby="transfers-heading"
      >
        <h2
          id="transfers-heading"
          className="flex items-center gap-2 text-base font-semibold"
        >
          <Scale aria-hidden="true" className="size-4 text-muted" />
          Who owes whom
        </h2>
        {personal.length ? (
          <ul
            aria-label="Your suggested balances"
            className="mt-4 divide-y divide-line"
          >
            {personal.map(transferRow)}
          </ul>
        ) : (
          <div className="mt-4">
            <p className="text-sm font-medium">All settled up</p>
            <p className="mt-1 text-sm text-muted">
              You have no outstanding balance. Open records may still need to be
              marked settled.
            </p>
          </div>
        )}
        <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">
          Suggested amounts from open expenses. Settle up outside RoomieOS, then
          mark each fully resolved expense as settled.
        </p>
      </section>
    </div>
  );
}
