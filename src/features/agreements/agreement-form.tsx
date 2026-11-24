"use client";
import { Textarea } from "@/components/ui/primitives/textarea";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField, controlStyles } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import type { AgreementDraft } from "@/domain/agreements";
import type { Agreement } from "@/domain/types";
import { agreementDraftSchema } from "@/domain/validation";
import { useReadyHousehold } from "@/state/household-provider";
import { focusInvalid } from "../household/fields";

export function AgreementForm({
  agreement,
  onClose,
}: {
  agreement?: Agreement;
  onClose: () => void;
}) {
  const { store, conflict } = useReadyHousehold();
  const [draft, setDraft] = useState<AgreementDraft>({
    title: agreement?.title ?? "",
    details: agreement?.details ?? "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof AgreementDraft, string>>
  >({});
  const [saveError, setSaveError] = useState<string>();
  function change(field: keyof AgreementDraft, value: string) {
    setDraft({ ...draft, [field]: value });
    setErrors({ ...errors, [field]: undefined });
    setSaveError(undefined);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = agreementDraftSchema.safeParse({
      ...draft,
      title: draft.title.trim(),
    });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues)
        next[issue.path[0] as keyof AgreementDraft] =
          issue.path[0] === "title"
            ? "Enter a title (1–100 characters)."
            : "Keep details to 1000 characters or fewer.";
      setErrors(next);
      focusInvalid(event.currentTarget);
      return;
    }
    setErrors({});
    const result = store.dispatch(
      agreement
        ? { type: "edit-agreement", id: agreement.id, agreement: parsed.data }
        : { type: "add-agreement", agreement: parsed.data },
      agreement ? "Agreement updated." : "Agreement saved.",
    );
    if (result.ok) onClose();
    else setSaveError(result.error);
  }
  return (
    <Dialog
      open
      title={agreement ? "Edit agreement" : "New agreement"}
      onClose={onClose}
    >
      <form noValidate onSubmit={submit} className="space-y-5">
        <FormField
          id="agreement-title"
          label="Title"
          required
          maxLength={100}
          value={draft.title}
          onChange={(event) => change("title", event.target.value)}
          error={errors.title}
        />
        <div className="space-y-2">
          <label
            htmlFor="agreement-details"
            className="block text-sm font-medium"
          >
            Details (optional)
          </label>
          <Textarea
            id="agreement-details"
            className={`${controlStyles} min-h-36 resize-y`}
            rows={6}
            maxLength={1000}
            value={draft.details}
            onChange={(event) => change("details", event.target.value)}
            aria-invalid={Boolean(errors.details)}
            aria-describedby={
              errors.details
                ? "agreement-details-error"
                : "agreement-details-help"
            }
          />
          <p id="agreement-details-help" className="text-sm text-muted">
            For example, agree on quiet hours or how to handle overnight guests.
          </p>
          {errors.details && (
            <p id="agreement-details-error" className="text-sm text-danger">
              {errors.details}
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
            Save agreement
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
