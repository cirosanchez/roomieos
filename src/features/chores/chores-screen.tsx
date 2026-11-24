"use client";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/primitives/toggle-group";

import { useState } from "react";
import { CheckSquare, Columns3, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { PageHeader } from "@/components/ui/page-header";
import { SelectField, selectOptions } from "@/components/ui/select-field";
import { StatusPill } from "@/components/ui/status-pill";
import { choreStatuses, choreStatusLabels, isOverdue } from "@/domain/chores";
import { displayDate } from "@/domain/dates";
import type { Chore, ChoreStatus } from "@/domain/types";
import { useReadyHousehold } from "@/state/household-provider";
import { useToday } from "@/state/use-today";
import { ChoreForm } from "./chore-form";
import { ChoreDetails } from "./chore-details";

export function ChoresScreen() {
  const { state, store, conflict } = useReadyHousehold();
  const today = useToday();
  const [view, setView] = useState<"list" | "board">("board");
  const [status, setStatus] = useState("all");
  const [assigneeId, setAssigneeId] = useState("all");
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = state.chores.find((chore) => chore.id === selectedId);
  const chores = state.chores.filter(
    (chore) =>
      (status === "all" || chore.status === status) &&
      (assigneeId === "all" || chore.assigneeId === assigneeId),
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
  function statusControl(chore: Chore, suffix: string) {
    return (
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={chore.status} />
          {isOverdue(chore, today) && (
            <span className="text-xs font-medium text-danger">Overdue</span>
          )}
        </div>
        <SelectField
          id={`${suffix}-${chore.id}-status`}
          label="Change status"
          aria-label={`Change status for ${chore.title}`}
          value={chore.status}
          disabled={conflict}
          onValueChange={(value) =>
            store.dispatch(
              {
                type: "set-chore-status",
                id: chore.id,
                status: value as ChoreStatus,
              },
              "Chore status updated.",
            )
          }
          options={selectOptions(
            choreStatuses.map((value) => ({
              value: value,
              label: <>{choreStatusLabels[value]}</>,
            })),
          )}
        />
      </div>
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
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <ToggleGroup
          value={[view]}
          onValueChange={(values) => {
            if (values[0] === "list" || values[0] === "board")
              setView(values[0]);
          }}
          aria-label="Chore view"
          className="flex self-end rounded-[7px] border border-line bg-subtle p-1"
        >
          <ToggleGroupItem value="list" className="min-h-11 px-4">
            <List aria-hidden="true" className="size-4" />
            List
          </ToggleGroupItem>
          <ToggleGroupItem value="board" className="min-h-11 px-4">
            <Columns3 aria-hidden="true" className="size-4" />
            Board
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="min-w-0 flex-1 basis-40">
          <SelectField
            id="chore-status-filter"
            label="Filter by status"
            value={status}
            onValueChange={(value) => setStatus(value)}
            options={selectOptions(
              { value: "all", label: <>All statuses</> },
              choreStatuses.map((value) => ({
                value: value,
                label: <>{choreStatusLabels[value]}</>,
              })),
            )}
          />
        </div>
        <div className="min-w-0 flex-1 basis-44">
          <SelectField
            id="chore-member-filter"
            label="Filter by roommate"
            value={assigneeId}
            onValueChange={(value) => setAssigneeId(value)}
            options={selectOptions(
              { value: "all", label: <>All roommates</> },
              members
                .filter(
                  (member) =>
                    member.active ||
                    state.chores.some(
                      (chore) => chore.assigneeId === member.id,
                    ),
                )
                .map((member) => ({
                  value: member.id,
                  label: (
                    <>
                      {member.name}
                      {!member.active && " (archived)"}
                    </>
                  ),
                })),
            )}
          />
        </div>
      </div>
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
          <p role="status" className="mb-4 text-sm text-muted">
            {chores.length} {chores.length === 1 ? "chore" : "chores"}
            {status !== "all" || assigneeId !== "all"
              ? " match your filters"
              : " in your household"}
            .
          </p>
          {chores.length === 0 ? (
            <EmptyState
              icon={<CheckSquare className="size-6" />}
              title="No matching chores"
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStatus("all");
                    setAssigneeId("all");
                  }}
                >
                  Clear filters
                </Button>
              }
            >
              <p>Try a different status or roommate.</p>
            </EmptyState>
          ) : view === "list" ? (
            <>
              <div className="hidden rounded-[10px] border border-line md:block">
                <table className="w-full table-fixed text-left text-sm">
                  <caption className="sr-only">Household chores</caption>
                  <thead className="border-b border-line bg-subtle text-muted">
                    <tr>
                      {["Chore", "Assigned to", "Due date", "Status"].map(
                        (label) => (
                          <th
                            key={label}
                            scope="col"
                            className="p-4 font-medium"
                          >
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {chores.map((chore) => (
                      <tr key={chore.id}>
                        <td className="p-4 align-top">
                          <Button
                            variant="ghost"
                            onClick={() => openChore(chore)}
                            className="h-auto min-w-0 whitespace-normal justify-start px-0 hover:bg-transparent min-h-11 max-w-full rounded text-left font-semibold text-accent underline-offset-4 hover:underline [overflow-wrap:anywhere]"
                          >
                            {chore.title}
                          </Button>
                        </td>
                        <td className="p-4 align-top">{memberLabel(chore)}</td>
                        <td className="p-4 align-top">
                          <time dateTime={chore.dueDate}>
                            {displayDate(chore.dueDate)}
                          </time>
                        </td>
                        <td className="p-4 align-top">
                          {statusControl(chore, "table")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul aria-label="Household chores" className="space-y-3 md:hidden">
                {chores.map((chore) => (
                  <li
                    key={chore.id}
                    className="space-y-4 rounded-[10px] border border-line p-4"
                  >
                    <Button
                      variant="ghost"
                      onClick={() => openChore(chore)}
                      className="h-auto min-w-0 whitespace-normal justify-start px-0 hover:bg-transparent min-h-11 max-w-full rounded text-left font-semibold text-accent [overflow-wrap:anywhere]"
                    >
                      {chore.title}
                    </Button>
                    {memberLabel(chore)}
                    <p className="text-sm text-muted">
                      Due {displayDate(chore.dueDate)}
                    </p>
                    {statusControl(chore, "card")}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div
              role="region"
              aria-label="Chore board"
              tabIndex={0}
              className="max-w-full overflow-x-auto rounded-[10px] pb-3"
            >
              <div className="grid min-w-[870px] grid-cols-3 items-start gap-4">
                {choreStatuses.map((column) => {
                  const items = chores.filter(
                    (chore) => chore.status === column,
                  );
                  return (
                    <section
                      key={column}
                      aria-label={`${choreStatusLabels[column]} chores`}
                      className="min-w-0 rounded-[10px] border border-line bg-subtle p-3"
                    >
                      <h2 className="mb-3 flex items-center justify-between gap-2 px-1 text-sm font-semibold">
                        {choreStatusLabels[column]}
                        <span className="rounded bg-page px-2 py-1 text-xs text-muted">
                          {items.length}
                        </span>
                      </h2>
                      <ul className="space-y-3">
                        {items.map((chore) => (
                          <li
                            key={chore.id}
                            className="space-y-3 rounded-[7px] border border-line bg-page p-4"
                          >
                            <Button
                              variant="ghost"
                              className="h-auto min-w-0 whitespace-normal justify-start px-0 hover:bg-transparent min-h-11 max-w-full rounded text-left font-semibold text-accent [overflow-wrap:anywhere]"
                              onClick={() => openChore(chore)}
                            >
                              {chore.title}
                            </Button>
                            {memberLabel(chore)}
                            <p className="text-sm text-muted">
                              Due {displayDate(chore.dueDate)}
                            </p>
                            {chore.notes && (
                              <p className="truncate text-sm text-muted">
                                {chore.notes}
                              </p>
                            )}
                            {statusControl(chore, "board")}
                          </li>
                        ))}
                      </ul>
                      {!items.length && (
                        <p className="px-1 py-5 text-sm text-muted">
                          No {column} chores.
                        </p>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
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
          onClose={() => setSelectedId(null)}
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
