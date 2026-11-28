"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { useReadyHousehold } from "@/state/household-provider";
export function SpacesDialog({ onClose }: { onClose: () => void }) {
  const { state, store } = useReadyHousehold();
  const [name, setName] = useState("");
  const [id, setId] = useState<string>();
  const [archive, setArchive] = useState<string>();
  const [error, setError] = useState("");
  return (
    <Dialog
      open
      title="Manage spaces"
      onClose={onClose}
      returnFocusId="new-planner-event"
    >
      <div className="space-y-5">
        <p className="text-sm text-muted">
          Archive a space to stop new bookings. Existing events keep their
          space.
        </p>
        {state.sharedSpaces.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center gap-2 border-b border-line pb-3"
          >
            <span className="min-w-0 flex-1 break-words">
              {s.name}
              {!s.active && " (archived)"}
            </span>
            <Button
              variant="ghost"
              onClick={() => {
                setId(s.id);
                setName(s.name);
              }}
            >
              Rename
            </Button>
            {s.active && (
              <Button variant="ghost" onClick={() => setArchive(s.id)}>
                Archive
              </Button>
            )}
          </div>
        ))}
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const r = store.dispatch(
              { type: "save-space", id, name },
              "Space saved.",
            );
            if (r.ok) {
              setName("");
              setId(undefined);
              setError("");
            } else setError(r.error);
          }}
        >
          <FormField
            id="space-name"
            label={id ? "Rename space" : "New space name"}
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit">{id ? "Save name" : "Add space"}</Button>
            {id && (
              <Button
                variant="secondary"
                onClick={() => {
                  setId(undefined);
                  setName("");
                }}
              >
                Cancel rename
              </Button>
            )}
          </div>
        </form>
        {error && <InlineNotice tone="error">{error}</InlineNotice>}
        <ConfirmDialog
          open={!!archive}
          onClose={() => setArchive(undefined)}
          title="Archive space?"
          description="Existing events will keep their space. New bookings cannot select it."
          confirmLabel="Archive space"
          onConfirm={() => {
            const r = store.dispatch(
              { type: "archive-space", id: archive! },
              "Space archived.",
            );
            if (r.ok) setArchive(undefined);
            else setError(r.error);
          }}
          error={error}
        />
      </div>
    </Dialog>
  );
}
