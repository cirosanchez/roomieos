"use client";

import { useState } from "react";
import { ConfirmDialog } from "./dialog";

// Form drafts contain only serializable values. Compare with the opening draft
// so returning every field to its original value also clears the warning.
export function useUnsavedChanges(draft: unknown, onClose: () => void) {
  const [initialDraft] = useState(() => JSON.stringify(draft));
  const [confirming, setConfirming] = useState(false);
  const dirty = JSON.stringify(draft) !== initialDraft;

  function requestClose() {
    if (dirty) setConfirming(true);
    else onClose();
  }

  return {
    requestClose,
    discardConfirmation: (
      <ConfirmDialog
        open={confirming}
        title="Discard unsaved changes?"
        description="Your changes to this form have not been saved. Discard them or keep editing."
        cancelLabel="Keep editing"
        confirmLabel="Discard changes"
        destructive
        onClose={() => setConfirming(false)}
        onConfirm={onClose}
      />
    ),
  };
}
