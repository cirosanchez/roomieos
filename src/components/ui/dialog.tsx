"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { InlineNotice } from "./inline-notice";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  variant?: "modal" | "drawer";
  id?: string;
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  variant = "modal",
  id,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.showModal();
    return () => {
      dialog.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      id={id}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={`fixed flex-col overflow-hidden border border-line bg-page p-0 text-ink shadow-xl ${variant === "drawer" ? "inset-y-0 left-0 m-0 h-dvh max-h-dvh w-80 max-w-[calc(100%-2rem)] rounded-r-xl" : "inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg rounded-xl"}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-3">
        <h2 id={titleId} className="min-w-0 break-words text-lg font-semibold">
          {title}
        </h2>
        <Button
          variant="ghost"
          onClick={onClose}
          aria-label={`Close ${title}`}
          title="Close"
          size="icon"
        >
          <X aria-hidden="true" className="size-5" />
        </Button>
      </div>
      <div className="overflow-y-auto overscroll-contain p-5">
        {description && (
          <p id={descriptionId} className="mb-5 break-words text-sm text-muted">
            {description}
          </p>
        )}
        {children}
      </div>
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  destructive = false,
  error,
}: Omit<DialogProps, "children" | "variant" | "id"> & {
  onConfirm: () => void;
  confirmLabel: string;
  destructive?: boolean;
  error?: string;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
    >
      {error && (
        <div className="mb-4">
          <InlineNotice tone="error">{error}</InlineNotice>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={destructive ? "danger" : "primary"}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
