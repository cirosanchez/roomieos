"use client";

import { ChevronDown, Monitor } from "lucide-react";
import { Button } from "@/components/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/primitives/dropdown-menu";
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
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-14 max-w-48 min-w-0 gap-2.5 rounded-xl px-2.5 text-left hover:bg-subtle sm:max-w-60 sm:gap-3 data-popup-open:bg-subtle"
          />
        }
        id="demo-perspective"
        aria-label="Switch demo perspective"
        data-value={selected.id}
        disabled={conflict}
      >
        <MemberAvatar
          name={selected.name}
          icon={
            selected.avatar.kind === "icon" ? selected.avatar.value : undefined
          }
        />
        <span className="min-w-0 flex-1">
          <span className="block text-xs leading-5 font-normal text-muted">
            Demo perspective
          </span>
          <span className="block truncate text-sm leading-5 font-semibold text-ink">
            {selected.name}
          </span>
        </span>
        <ChevronDown aria-hidden="true" className="size-4 text-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="flex max-h-[min(28rem,var(--available-height))] w-72 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl p-1.5 shadow-lg ring-line"
      >
        <div className="shrink-0 px-2.5 pt-2 pb-2.5 text-sm font-medium text-ink">
          Switch demo perspective
          <p className="mt-0.5 truncate text-xs font-normal text-muted">
            {state.household.name}
          </p>
        </div>
        <DropdownMenuSeparator className="mx-0 mt-0 mb-1.5 shrink-0" />
        <DropdownMenuRadioGroup
          aria-label="Roommates"
          value={selected.id}
          onValueChange={(value) => {
            if (!conflict && value !== selected.id)
              store.dispatch(
                { type: "select-member", id: value },
                "Demo perspective changed.",
              );
          }}
          className="flex min-h-0 flex-col"
        >
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            {members.map((member) => (
              <DropdownMenuRadioItem
                key={member.id}
                value={member.id}
                label={member.name}
                aria-label={member.name}
                data-value={member.id}
                disabled={conflict}
                closeOnClick
                className="min-h-12 gap-3 rounded-lg py-2 pr-9 pl-2.5 data-checked:bg-selected data-checked:text-accent data-highlighted:bg-hover [&_[data-slot=dropdown-menu-radio-item-indicator]]:right-3"
              >
                <MemberAvatar
                  name={member.name}
                  icon={
                    member.avatar.kind === "icon"
                      ? member.avatar.value
                      : undefined
                  }
                />
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {member.name}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </div>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator className="mx-0 mt-1.5 mb-0 shrink-0" />
        <p className="flex shrink-0 items-center gap-2 px-2.5 py-3 text-xs leading-5 text-muted">
          <Monitor aria-hidden="true" className="size-3.5 shrink-0" />
          Local demo · saved in this browser only
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
