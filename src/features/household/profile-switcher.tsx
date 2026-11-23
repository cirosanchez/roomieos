"use client";

import { ChevronDown } from "lucide-react";
import { activeMembers } from "@/domain/household";
import { useReadyHousehold } from "@/state/household-provider";
import { MemberAvatar } from "@/components/ui/member-avatar";

export function ProfileSwitcher() {
  const { state, store, conflict } = useReadyHousehold();
  const members = activeMembers(state);
  const selected = members.find(
    (member) => member.id === state.selectedMemberId,
  )!;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <MemberAvatar
        name={selected.name}
        icon={
          selected.avatar.kind === "icon" ? selected.avatar.value : undefined
        }
      />
      <label className="min-w-0">
        <span className="block text-xs text-muted">Demo perspective</span>
        <span className="relative block">
          <select
            aria-label="Switch demo perspective"
            value={selected.id}
            disabled={conflict}
            onChange={(event) =>
              store.dispatch(
                { type: "select-member", id: event.target.value },
                "Demo perspective changed.",
              )
            }
            className="min-h-11 w-32 max-w-full appearance-none truncate rounded pr-6 text-sm font-medium sm:w-40"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-1 size-4 -translate-y-1/2 text-muted"
          />
        </span>
      </label>
    </div>
  );
}
