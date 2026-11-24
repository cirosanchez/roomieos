"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BookOpen, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import type { Agreement } from "@/domain/types";
import { useReadyHousehold } from "@/state/household-provider";
import { AgreementForm } from "./agreement-form";

function AgreementActions({
  agreement,
  disabled,
  onEdit,
  onDelete,
}: {
  agreement: Agreement;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const focusTrigger = () =>
    container.current
      ?.querySelector<HTMLButtonElement>("[data-agreement-trigger]")
      ?.focus();
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);
  function choose(callback: () => void) {
    setOpen(false);
    focusTrigger();
    callback();
  }
  return (
    <div
      ref={container}
      className="relative shrink-0"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          focusTrigger();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        data-agreement-trigger
        aria-label={`Actions for ${agreement.title}`}
        aria-expanded={open}
        aria-controls={panelId}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        title="Agreement actions"
      >
        <MoreHorizontal aria-hidden="true" className="size-5" />
      </Button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={`Actions for ${agreement.title}`}
          className="absolute top-full right-0 z-10 mt-1 w-48 rounded-[7px] border border-line bg-page p-1 shadow-sm"
        >
          <Button
            variant="ghost"
            className="w-full justify-start"
            disabled={disabled}
            onClick={() => choose(onEdit)}
          >
            <Pencil aria-hidden="true" className="size-4" />
            Edit agreement
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-danger"
            disabled={disabled}
            onClick={() => choose(onDelete)}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Delete agreement
          </Button>
        </div>
      )}
    </div>
  );
}

export function AgreementsScreen() {
  const { state, store, conflict } = useReadyHousehold();
  const [editor, setEditor] = useState<Agreement | "new" | null>(null);
  const [deleting, setDeleting] = useState<Agreement | null>(null);
  const [error, setError] = useState<string>();
  function create() {
    store.dismissFeedback();
    setEditor("new");
  }
  return (
    <>
      <PageHeader
        title="House agreements"
        description="Keep the expectations you share in one place."
        icon={<BookOpen className="size-6" />}
        action={
          <Button id="new-agreement" disabled={conflict} onClick={create}>
            <Plus aria-hidden="true" className="size-4" />
            New agreement
          </Button>
        }
      />
      {state.agreements.length ? (
        <ul
          aria-label="House agreements"
          className="divide-y divide-line border-y border-line"
        >
          {state.agreements.map((agreement) => (
            <li key={agreement.id} className="py-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-lg font-semibold">
                    {agreement.title}
                  </h2>
                  {agreement.details && (
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">
                      {agreement.details}
                    </p>
                  )}
                </div>
                <AgreementActions
                  agreement={agreement}
                  disabled={conflict}
                  onEdit={() => {
                    store.dismissFeedback();
                    setEditor(agreement);
                  }}
                  onDelete={() => {
                    store.dismissFeedback();
                    setError(undefined);
                    setDeleting(agreement);
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<BookOpen className="size-6" />}
          title="Set the ground rules"
          action={
            <Button disabled={conflict} onClick={create}>
              Add your first agreement
            </Button>
          }
        >
          <p>
            Add a few house agreements to keep expectations clear. Quiet hours
            or guest etiquette can be a good place to start.
          </p>
        </EmptyState>
      )}
      {editor && (
        <AgreementForm
          key={editor === "new" ? "new" : editor.id}
          agreement={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete agreement?"
        description={`Permanently delete “${deleting?.title ?? "this agreement"}”? This cannot be undone.`}
        confirmLabel="Delete agreement"
        destructive
        error={error}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          const result = store.dispatch(
            { type: "delete-agreement", id: deleting.id },
            "Agreement deleted.",
          );
          if (result.ok) {
            setDeleting(null);
            requestAnimationFrame(() =>
              document.getElementById("new-agreement")?.focus(),
            );
          } else setError(result.error);
        }}
      />
    </>
  );
}
