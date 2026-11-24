"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { StatusPill } from "@/components/ui/status-pill";
import { displayDate, isCalendarDate, localDate } from "@/domain/dates";
import {
  isOverdue,
  nextChoreAssignee,
  suggestedRotationDate,
} from "@/domain/chores";
import type { Chore, ChoreStatus } from "@/domain/types";
import { useReadyHousehold } from "@/state/household-provider";
import { focusInvalid } from "../household/fields";
import { ChoreForm } from "./chore-form";

function RotationForm({
  chore,
  onClose,
}: {
  chore: Chore;
  onClose: () => void;
}) {
  const { state, store, conflict } = useReadyHousehold();
  const next = nextChoreAssignee(state, chore.assigneeId);
  const [date, setDate] = useState(() =>
    suggestedRotationDate(chore.dueDate, localDate(new Date())),
  );
  const [dateError, setDateError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isCalendarDate(date)) {
      setDateError("Choose a valid calendar date.");
      focusInvalid(event.currentTarget);
      return;
    }
    const result = store.dispatch(
      { type: "rotate-chore", id: chore.id, dueDate: date },
      `Chore rotated to ${next.name}.`,
    );
    if (result.ok) onClose();
    else setSaveError(result.error);
  }
  return (
    <Dialog
      open
      title="Rotate chore"
      onClose={onClose}
      description={`Assign “${chore.title}” to ${next.name} and reopen it as Pending. Completion history will be kept.`}
    >
      <form noValidate onSubmit={submit} className="space-y-5">
        <p className="break-words text-sm">
          Next roommate: <strong>{next.name}</strong>
        </p>
        <FormField
          id="rotation-date"
          type="date"
          min="0001-01-01"
          max="9999-12-31"
          label="New due date"
          required
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setDateError(undefined);
          }}
          error={dateError}
        />
        {conflict && (
          <InlineNotice tone="error">
            This household changed in another tab. Close this dialog and reload
            the saved household before saving.
          </InlineNotice>
        )}
        {saveError && <InlineNotice tone="error">{saveError}</InlineNotice>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={conflict}>
            Confirm rotation
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function ChoreDetails({
  chore,
  today,
  onClose,
  onDeleted,
}: {
  chore: Chore;
  today: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { state, store, conflict } = useReadyHousehold();
  const [overlay, setOverlay] = useState<"edit" | "rotate" | "delete" | null>(
    null,
  );
  const [error, setError] = useState<string>();
  const assignee = state.members.find(
    (member) => member.id === chore.assigneeId,
  )!;
  const selected = state.members.find(
    (member) => member.id === state.selectedMemberId,
  )!;
  const changeStatus = (status: ChoreStatus) => {
    const result = store.dispatch(
      { type: "set-chore-status", id: chore.id, status },
      status === "completed"
        ? "Chore completed."
        : status === "skipped"
          ? "Chore skipped."
          : "Chore reopened.",
    );
    setError(result.ok ? undefined : result.error);
  };
  function openOverlay(value: typeof overlay) {
    setError(undefined);
    store.dismissFeedback();
    setOverlay(value);
  }
  return (
    <>
      <Dialog open title={chore.title} onClose={onClose}>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={chore.status} />
            {isOverdue(chore, today) && (
              <span className="text-sm font-medium text-danger">Overdue</span>
            )}
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Assigned to</dt>
              <dd className="mt-1 break-words font-medium">
                {assignee.name}
                {!assignee.active && " (archived)"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Due date</dt>
              <dd className="mt-1 font-medium">{displayDate(chore.dueDate)}</dd>
            </div>
          </dl>
          {chore.notes && (
            <div>
              <h3 className="text-sm font-semibold">Notes</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted">
                {chore.notes}
              </p>
            </div>
          )}
          {!assignee.active && (
            <InlineNotice>
              To reopen, use Edit to assign an active roommate, or rotate to the
              next active roommate.
            </InlineNotice>
          )}
          <div>
            <p className="mb-3 text-sm text-muted">
              Completions are recorded as {selected.name}, your current demo
              perspective.
            </p>
            <div className="flex flex-wrap gap-2">
              {chore.status !== "completed" && (
                <Button
                  disabled={conflict}
                  onClick={() => changeStatus("completed")}
                >
                  Mark completed
                </Button>
              )}
              {chore.status !== "pending" && (
                <Button
                  variant={
                    chore.status === "completed" ? "primary" : "secondary"
                  }
                  disabled={conflict || !assignee.active}
                  onClick={() => changeStatus("pending")}
                >
                  Reopen as pending
                </Button>
              )}
              {chore.status !== "skipped" && (
                <Button
                  variant="secondary"
                  disabled={conflict}
                  onClick={() => changeStatus("skipped")}
                >
                  Skip chore
                </Button>
              )}
              <Button
                variant="secondary"
                disabled={conflict}
                onClick={() => openOverlay("rotate")}
              >
                Rotate to next
              </Button>
            </div>
          </div>
          {conflict && (
            <InlineNotice tone="error">
              This household changed in another tab. Close this dialog and
              reload the saved household before saving.
            </InlineNotice>
          )}
          {error && <InlineNotice tone="error">{error}</InlineNotice>}
          <section
            className="border-t border-line pt-5"
            aria-label="Completion history"
          >
            <h3 className="text-sm font-semibold">Completion history</h3>
            {chore.completionHistory.length ? (
              <ol className="mt-3 space-y-3">
                {[...chore.completionHistory].reverse().map((event) => {
                  const member = state.members.find(
                    (item) => item.id === event.completedById,
                  )!;
                  return (
                    <li
                      key={event.id}
                      className="break-words text-sm text-muted"
                    >
                      Completed by{" "}
                      <span className="font-medium text-ink">
                        {member.name}
                        {!member.active && " (archived)"}
                      </span>{" "}
                      ·{" "}
                      <time dateTime={event.completedAt}>
                        {new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(event.completedAt))}
                      </time>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-muted">No completions yet.</p>
            )}
          </section>
          <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-5">
            <Button
              variant="secondary"
              disabled={conflict}
              onClick={() => openOverlay("edit")}
            >
              Edit chore
            </Button>
            <Button
              variant="danger"
              disabled={conflict}
              onClick={() => openOverlay("delete")}
            >
              Delete chore
            </Button>
          </div>
        </div>
      </Dialog>
      {overlay === "edit" && (
        <ChoreForm chore={chore} onClose={() => setOverlay(null)} />
      )}
      {overlay === "rotate" && (
        <RotationForm chore={chore} onClose={() => setOverlay(null)} />
      )}
      <ConfirmDialog
        open={overlay === "delete"}
        title="Delete chore?"
        description={`Permanently delete “${chore.title}” and its completion history? This cannot be undone.`}
        confirmLabel="Delete chore"
        destructive
        onClose={() => setOverlay(null)}
        error={error}
        onConfirm={() => {
          const result = store.dispatch(
            { type: "delete-chore", id: chore.id },
            "Chore deleted.",
          );
          if (result.ok) onDeleted();
          else setError(result.error);
        }}
      />
    </>
  );
}
