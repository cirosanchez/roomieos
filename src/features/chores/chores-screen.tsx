"use client";
import { useState } from "react";
import { CheckSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { PageHeader } from "@/components/ui/page-header";
import type { Chore } from "@/domain/types";
import { useReadyHousehold } from "@/state/household-provider";
import { useToday } from "@/state/use-today";
import { ChoreBoard } from "./chore-board";
import { ChoreForm } from "./chore-form";
import { ChoreDetails } from "./chore-details";

export function ChoresScreen() {
  const { state, store, conflict } = useReadyHousehold();
  const today = useToday();
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = state.chores.find((chore) => chore.id === selectedId);
  const perspective = state.members.find(
    (member) => member.id === state.selectedMemberId,
  )!;
  const chores = state.chores.filter(
    (chore) => chore.assigneeId === state.selectedMemberId,
  );
  const members = [...state.members].sort((a, b) => a.order - b.order);
  function newChore() {
    store.dismissFeedback();
    setCreating(true);
  }
  function openChore(chore: Chore) {
    store.dismissFeedback();
    setSelectedId(chore.id);
  }
  function memberLabel(chore: Chore) {
    const member = members.find((item) => item.id === chore.assigneeId)!;
    return (
      <span className="flex min-w-0 items-center gap-2">
        <MemberAvatar
          name={member.name}
          icon={member.avatar.kind === "icon" ? member.avatar.value : undefined}
        />
        <span className="min-w-0 break-words text-sm">
          {member.name}
          {!member.active && " (archived)"}
        </span>
      </span>
    );
  }
  return (
    <>
      <PageHeader
        title="Chores"
        description="A little clarity for the everyday things."
        icon={<CheckSquare className="size-6" />}
        action={
          <Button id="new-chore" onClick={newChore} disabled={conflict}>
            <Plus aria-hidden="true" className="size-4" />
            New chore
          </Button>
        }
      />
      {state.chores.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="size-6" />}
          title="Nothing on the chore board"
          action={
            <Button disabled={conflict} onClick={newChore}>
              Add a chore
            </Button>
          }
        >
          <p>Add your first chore to get started.</p>
        </EmptyState>
      ) : (
        <>
          <p
            role="status"
            className="mb-4 max-w-full break-words text-sm text-muted"
          >
            {chores.length} {chores.length === 1 ? "chore" : "chores"} assigned
            to {perspective.name}.
          </p>
          {chores.length === 0 ? (
            <EmptyState
              icon={<CheckSquare className="size-6" />}
              title={`No chores assigned to ${perspective.name}`}
              action={
                <Button disabled={conflict} onClick={newChore}>
                  Add a chore
                </Button>
              }
            >
              <p>New chores default to the selected demo roommate.</p>
            </EmptyState>
          ) : (
            <ChoreBoard
              key={state.selectedMemberId}
              chores={chores}
              today={today}
              disabled={conflict}
              onOpen={openChore}
              memberLabel={memberLabel}
              onMove={(chore, status) =>
                store.dispatch(
                  { type: "set-chore-status", id: chore.id, status },
                  "Chore moved.",
                )
              }
            />
          )}
        </>
      )}
      {creating && (
        <ChoreForm chore={null} onClose={() => setCreating(false)} />
      )}
      {selected && (
        <ChoreDetails
          key={selected.id}
          chore={selected}
          today={today}
          onClose={() => {
            setSelectedId(null);
            if (!chores.some((chore) => chore.id === selectedId))
              requestAnimationFrame(() =>
                document.getElementById("new-chore")?.focus(),
              );
          }}
          onDeleted={() => {
            setSelectedId(null);
            requestAnimationFrame(() =>
              document.getElementById("new-chore")?.focus(),
            );
          }}
        />
      )}
    </>
  );
}
