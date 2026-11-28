"use client";
import { useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { InlineNotice } from "./inline-notice";
import * as D from "./primitives/dialog";
import * as A from "./primitives/alert-dialog";
import * as S from "./primitives/sheet";
type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "modal" | "drawer";
  id?: string;
  size?: "default" | "wide";
  returnFocusId?: string;
};
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "modal",
  id,
  size = "default",
  returnFocusId,
}: DialogProps) {
  const trigger = useRef<HTMLElement | null>(null);
  const capture = () => {
    trigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    return true;
  };
  const restore = () => {
    const target =
      (returnFocusId ? document.getElementById(returnFocusId) : null) ??
      trigger.current;
    if (target?.isConnected) {
      target.focus();
      return false;
    }
    return true;
  };
  if (variant === "drawer")
    return (
      <S.Sheet
        open={open}
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
      >
        <S.SheetContent
          id={id}
          side="left"
          className="w-80 max-w-[calc(100%-2rem)] overflow-y-auto"
          initialFocus={capture}
          finalFocus={restore}
        >
          <S.SheetHeader>
            <S.SheetTitle>{title}</S.SheetTitle>
            {description && (
              <S.SheetDescription>{description}</S.SheetDescription>
            )}
          </S.SheetHeader>
          <div className="p-5">{children}</div>
        </S.SheetContent>
      </S.Sheet>
    );
  return (
    <D.Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <D.DialogContent
        id={id}
        showCloseButton={false}
        initialFocus={capture}
        finalFocus={restore}
        className={`flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 ${size === "wide" ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
      >
        <D.DialogHeader className="shrink-0 flex-row items-center justify-between border-b border-line px-5 py-3">
          <D.DialogTitle className="min-w-0 break-words text-lg font-semibold">
            {title}
          </D.DialogTitle>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Close ${title}`}
            onClick={onClose}
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </D.DialogHeader>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-5">
          {description && (
            <D.DialogDescription className="mb-5 break-words">
              {description}
            </D.DialogDescription>
          )}
          {children}
        </div>
        {footer && (
          <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-line bg-page px-5 py-4">
            {footer}
          </div>
        )}
      </D.DialogContent>
    </D.Dialog>
  );
}
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  error,
}: Omit<DialogProps, "children" | "variant" | "id"> & {
  onConfirm: () => void;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  error?: string;
}) {
  const cancel = useRef<HTMLButtonElement | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  return (
    <A.AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <A.AlertDialogContent
        initialFocus={() => {
          trigger.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          return cancel.current;
        }}
        finalFocus={() => {
          if (trigger.current?.isConnected) {
            trigger.current.focus();
            return false;
          }
          return true;
        }}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-lg p-5"
      >
        <A.AlertDialogHeader className="place-items-start text-left">
          <A.AlertDialogTitle>{title}</A.AlertDialogTitle>
          <A.AlertDialogDescription>{description}</A.AlertDialogDescription>
        </A.AlertDialogHeader>
        {error && <InlineNotice tone="error">{error}</InlineNotice>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button ref={cancel} variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </A.AlertDialogContent>
    </A.AlertDialog>
  );
}
