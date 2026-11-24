"use client";
import { Textarea } from "@/components/ui/primitives/textarea";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField, controlStyles } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { SelectField, selectOptions } from "@/components/ui/select-field";
import { activeMembers } from "@/domain/household";
import { localDate } from "@/domain/dates";
import type { ChoreDraft } from "@/domain/chores";
import type { Chore } from "@/domain/types";
import { choreDraftSchema } from "@/domain/validation";
import { useReadyHousehold } from "@/state/household-provider";
import { focusInvalid } from "../household/fields";

export function ChoreForm({
  chore,
  onClose,
}: {
  chore: Chore | null;
  onClose: () => void;
}) {
  const { state, store, conflict } = useReadyHousehold();
  const [draft, setDraft] = useState<ChoreDraft>(
    chore
      ? {
          title: chore.title,
          notes: chore.notes,
          assigneeId: chore.assigneeId,
          dueDate: chore.dueDate,
        }
      : {
          title: "",
          notes: "",
          assigneeId: state.selectedMemberId,
          dueDate: localDate(new Date()),
        },
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof ChoreDraft, string>>
  >({});
  const [saveError, setSaveError] = useState<string>();
  const archivedAssignee =
    chore &&
    state.members.find(
      (member) => member.id === chore.assigneeId && !member.active,
    );
  function change(field: keyof ChoreDraft, value: string) {
    setDraft({ ...draft, [field]: value });
    setErrors({ ...errors, [field]: undefined });
    setSaveError(undefined);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = choreDraftSchema.safeParse({
      ...draft,
      title: draft.title.trim(),
    });
    const nextErrors: typeof errors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof ChoreDraft;
        nextErrors[field] =
          field === "title"
            ? "Enter a title (1–100 characters)."
            : field === "notes"
              ? "Keep notes to 1000 characters or fewer."
              : issue.message;
      }
    }
    if (
      !state.members.some(
        (member) =>
          member.id === draft.assigneeId &&
          (member.active || member.id === archivedAssignee?.id),
      )
    )
      nextErrors.assigneeId = "Choose an active roommate.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !parsed.success) {
      focusInvalid(event.currentTarget);
      return;
    }
    const result = store.dispatch(
      chore
        ? { type: "edit-chore", id: chore.id, chore: parsed.data }
        : { type: "add-chore", chore: parsed.data },
      chore ? "Chore updated." : "Chore saved.",
    );
    if (result.ok) onClose();
    else setSaveError(result.error);
  }
  return (
    <Dialog open title={chore ? "Edit chore" : "New chore"} onClose={onClose}>
      <form noValidate onSubmit={submit} className="space-y-5">
        <FormField
          id="chore-title"
          label="Title"
          required
          maxLength={100}
          value={draft.title}
          onChange={(event) => change("title", event.target.value)}
          error={errors.title}
        />
        <SelectField
          id="chore-assignee"
          label="Assigned to (required)"
          required
          value={draft.assigneeId}
          onValueChange={(value) => change("assigneeId", value)}
          error={errors.assigneeId}
          help={
            archivedAssignee
              ? "Keep this historical assignment, or choose an active roommate before reopening."
              : undefined
          }
          options={selectOptions(
            archivedAssignee && {
              value: archivedAssignee.id,
              label: (
                <>{archivedAssignee.name}(archived — current assignment)</>
              ),
            },
            activeMembers(state).map((member) => ({
              value: member.id,
              label: <>{member.name}</>,
            })),
          )}
        />
        <FormField
          id="chore-due-date"
          label="Due date"
          required
          type="date"
          min="0001-01-01"
          max="9999-12-31"
          value={draft.dueDate}
          onChange={(event) => change("dueDate", event.target.value)}
          error={errors.dueDate}
        />
        <div className="space-y-2">
          <label htmlFor="chore-notes" className="block text-sm font-medium">
            Notes (optional)
          </label>
          <Textarea
            id="chore-notes"
            className={`${controlStyles} min-h-28 resize-y`}
            rows={4}
            maxLength={1000}
            value={draft.notes}
            onChange={(event) => change("notes", event.target.value)}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={errors.notes ? "chore-notes-error" : undefined}
          />
          {errors.notes && (
            <p id="chore-notes-error" className="text-sm text-danger">
              {errors.notes}
            </p>
          )}
        </div>
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
            Save chore
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
