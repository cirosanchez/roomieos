"use client";
import { useState } from "react";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select-field";
import { useUnsavedChanges } from "@/components/ui/use-unsaved-changes";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Textarea } from "@/components/ui/primitives/textarea";
import { useReadyHousehold } from "@/state/household-provider";
import type { PlannerEvent } from "@/domain/types";
import type { PlannerDraft } from "@/domain/planner";
import {
  conflictsFor,
  conflictSignature,
  minutes,
  addDays,
} from "@/domain/planner";
import { plannerDraftSchema } from "@/domain/validation";
export const kindLabels = {
  guest: "Guest visit",
  quiet: "Quiet time",
  reservation: "Reservation",
};
export function EventForm({
  event,
  day,
  time = "09:00",
  onClose,
}: {
  event?: PlannerEvent;
  day: string;
  time?: string;
  onClose: () => void;
}) {
  const { state, store, conflict } = useReadyHousehold();
  const [draft, setDraft] = useState<PlannerDraft>(
    event
      ? {
          kind: event.kind,
          title: event.title,
          ownerId: event.ownerId,
          startDate: event.startDate,
          startTime: event.startTime,
          endDate: event.endDate,
          endTime: event.endTime,
          spaceId: event.spaceId,
          notes: event.notes,
        }
      : {
          kind: "guest",
          title: "",
          ownerId: state.selectedMemberId,
          startDate: day,
          endDate: minutes(time) + 30 >= 1440 ? addDays(day, 1) : day,
          startTime: time,
          endTime: `${String(Math.floor(((minutes(time) + 30) % 1440) / 60)).padStart(2, "0")}:${String((minutes(time) + 30) % 60).padStart(2, "0")}`,
          notes: "",
          spaceId: null,
        },
  );
  const [error, setError] = useState("");
  const [review, setReview] = useState(false);
  const { requestClose, discardConfirmation } = useUnsavedChanges(
    draft,
    onClose,
  );
  const change = (patch: Partial<PlannerDraft>) => {
    setDraft({ ...draft, ...patch });
    setError("");
    setReview(false);
  };
  const overlaps = conflictsFor(state.plannerEvents, draft, event?.id);
  function save(confirmed = false) {
    const parsed = plannerDraftSchema.safeParse({
      ...draft,
      title: draft.title.trim(),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (overlaps.length && !confirmed) {
      setReview(true);
      return;
    }
    const result = store.dispatch(
      {
        type: "save-planner-event",
        id: event?.id,
        event: parsed.data,
        confirmedConflicts: confirmed ? conflictSignature(overlaps) : undefined,
      },
      event ? "Event updated." : "Event saved.",
    );
    if (result.ok) onClose();
    else {
      setReview(false);
      setError(result.error);
    }
  }
  const nights = Math.round(
    (Date.parse(draft.endDate + "T12:00Z") -
      Date.parse(draft.startDate + "T12:00Z")) /
      86400000,
  );
  const duration =
    nights * 1440 + minutes(draft.endTime) - minutes(draft.startTime);
  return (
    <>
      <Dialog
        open
        title={event ? "Edit event" : "New event"}
        onClose={requestClose}
        returnFocusId="new-planner-event"
        footer={
          <>
            <Button variant="secondary" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" form="planner-form" disabled={conflict}>
              Save event
            </Button>
          </>
        }
      >
        <form
          id="planner-form"
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <SelectField
            id="event-kind"
            label="Event type"
            value={draft.kind}
            options={Object.entries(kindLabels).map(([value, label]) => ({
              value,
              label,
            }))}
            onValueChange={(kind) =>
              change({
                kind: kind as PlannerDraft["kind"],
                spaceId:
                  kind === "quiet"
                    ? null
                    : kind === "reservation"
                      ? (state.sharedSpaces.find((s) => s.active)?.id ?? "")
                      : null,
              })
            }
          />
          <FormField
            id="event-title"
            label={draft.kind === "guest" ? "Guest names" : "Title"}
            required
            maxLength={100}
            value={draft.title}
            onChange={(e) => change({ title: e.target.value })}
          />
          <SelectField
            id="event-owner"
            label={draft.kind === "guest" ? "Hosted by" : "Roommate"}
            value={draft.ownerId}
            options={state.members
              .filter((m) => m.active || m.id === event?.ownerId)
              .map((m) => ({
                value: m.id,
                label: m.name + (m.active ? "" : " (archived)"),
              }))}
            onValueChange={(ownerId) => change({ ownerId })}
          />
          {draft.kind !== "quiet" && (
            <SelectField
              id="event-space"
              label={
                draft.kind === "reservation"
                  ? "Shared space"
                  : "Shared space (optional)"
              }
              value={draft.spaceId ?? "none"}
              options={[
                ...(draft.kind === "guest"
                  ? [{ value: "none", label: "No specific space" }]
                  : []),
                ...state.sharedSpaces
                  .filter((s) => s.active || s.id === event?.spaceId)
                  .map((s) => ({
                    value: s.id,
                    label: s.name + (s.active ? "" : " (archived)"),
                  })),
              ]}
              onValueChange={(spaceId) =>
                change({ spaceId: spaceId === "none" ? null : spaceId })
              }
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["startDate", "Start date", "date"],
                ["startTime", "Start time", "time"],
                ["endDate", "End date", "date"],
                ["endTime", "End time", "time"],
              ] as const
            ).map(([key, label, type]) =>
              type === "date" ? (
                <DatePickerField
                  key={key}
                  id={`event-${key}`}
                  label={label}
                  value={draft[key]}
                  onChange={(value) => change({ [key]: value })}
                />
              ) : (
                <FormField
                  key={key}
                  id={`event-${key}`}
                  label={label}
                  type={type}
                  required
                  value={draft[key]}
                  onChange={(e) => change({ [key]: e.target.value })}
                />
              ),
            )}
          </div>
          {duration > 0 && (
            <p className="text-sm text-muted">
              Duration: {Math.floor(duration / 60)}h {duration % 60}m
              {draft.kind === "guest" && nights > 0
                ? ` · ${nights} night${nights === 1 ? "" : "s"}`
                : ""}
            </p>
          )}
          <label className="block space-y-2 text-sm font-medium">
            Notes (optional)
            <Textarea
              maxLength={1000}
              value={draft.notes}
              onChange={(e) => change({ notes: e.target.value })}
            />
          </label>
          <p className="text-sm text-muted">
            Local dates and times · saved in this browser only.
          </p>
          {(error || conflict) && (
            <InlineNotice tone="error">
              {conflict
                ? "This household changed in another tab. Reload before saving."
                : error}
            </InlineNotice>
          )}
        </form>
      </Dialog>
      {discardConfirmation}
      <ConfirmDialog
        open={review}
        onClose={() => setReview(false)}
        onConfirm={() => save(true)}
        title="Overlapping events"
        description={overlaps
          .map(
            (e) =>
              `${e.title}: ${e.startDate} ${e.startTime} – ${e.endDate} ${e.endTime}`,
          )
          .join("; ")}
        confirmLabel="Save anyway"
        cancelLabel="Keep editing"
      />
    </>
  );
}
