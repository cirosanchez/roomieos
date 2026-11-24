"use client";

import { SelectField } from "@/components/ui/select-field";
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
      <SelectField
        id="demo-perspective"
        label="Demo perspective"
        aria-label="Switch demo perspective"
        value={selected.id}
        disabled={conflict}
        onValueChange={(value) =>
          store.dispatch(
            { type: "select-member", id: value },
            "Demo perspective changed.",
          )
        }
        options={members.map((member) => ({
          value: member.id,
          label: (
            <>
              <MemberAvatar
                name={member.name}
                icon={
                  member.avatar.kind === "icon"
                    ? member.avatar.value
                    : undefined
                }
              />
              {member.name}
            </>
          ),
        }))}
        className="w-32 sm:w-40"
      />
    </div>
  );
}
