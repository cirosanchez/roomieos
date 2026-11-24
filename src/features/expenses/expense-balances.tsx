"use client";

import { ArrowRight, Scale } from "lucide-react";
import { MemberAvatar } from "@/components/ui/member-avatar";
import {
  calculateBalances,
  formatMoney,
  simplifyBalances,
} from "@/domain/money";
import { useReadyHousehold } from "@/state/household-provider";

export function ExpenseBalances() {
  const { state } = useReadyHousehold();
  const balances = calculateBalances(state.members, state.expenses);
  const net = balances.find(
    (row) => row.memberId === state.selectedMemberId,
  )!.netCents;
  const selected = state.members.find(
    (member) => member.id === state.selectedMemberId,
  )!;
  const transfers = simplifyBalances(balances);
  return (
    <div className="mb-9 grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <section
        className="min-w-0 rounded-[10px] border border-line p-5"
        aria-label="My net position"
      >
        <h2 className="text-sm font-medium text-muted">My net position</h2>
        <p className="mt-3 break-words text-2xl font-semibold tabular-nums">
          {formatMoney(Math.abs(net), state.household.currency)}
        </p>
        <p className="mt-2 break-words text-sm text-muted">
          {selected.name}:{" "}
          {net > 0 ? "you are owed" : net < 0 ? "you owe" : "you are even"}.
        </p>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Contributions minus shares, across open expenses only.
        </p>
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
        {transfers.length ? (
          <ul className="mt-4 divide-y divide-line">
            {transfers.map((transfer) => {
              const from = state.members.find(
                (member) => member.id === transfer.fromId,
              )!;
              const to = state.members.find(
                (member) => member.id === transfer.toId,
              )!;
              return (
                <li
                  key={`${from.id}-${to.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <MemberAvatar
                      name={from.name}
                      icon={
                        from.avatar.kind === "icon"
                          ? from.avatar.value
                          : undefined
                      }
                    />
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted"
                    />
                    <MemberAvatar
                      name={to.name}
                      icon={
                        to.avatar.kind === "icon" ? to.avatar.value : undefined
                      }
                    />
                    <p className="min-w-0 break-words text-sm">
                      {from.name} owes {to.name}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatMoney(
                      transfer.amountCents,
                      state.household.currency,
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4">
            <p className="text-sm font-medium">All settled up</p>
            <p className="mt-1 text-sm text-muted">
              No outstanding net balances. Open records may still need to be
              marked settled.
            </p>
          </div>
        )}
        <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">
          Suggested netting across open expenses. No payment is requested or
          made here. These suggestions do not mark individual expenses settled.
        </p>
      </section>
    </div>
  );
}
