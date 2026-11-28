"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import { CalendarDays, GripVertical } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { choreStatuses, choreStatusLabels, isOverdue } from "@/domain/chores";
import { displayDate } from "@/domain/dates";
import type { Chore, ChoreStatus } from "@/domain/types";
import type { CommandResult } from "@/state/household-store";

type Drag = {
  id: string;
  target: ChoreStatus | null;
  mode: "pointer" | "keyboard";
  x: number;
  y: number;
};
type PointerSession = {
  id: string;
  pointerId: number;
  x: number;
  y: number;
  started: boolean;
};
export function ChoreBoard({
  chores,
  today,
  disabled,
  onMove,
  onOpen,
  memberLabel,
}: {
  chores: Chore[];
  today: string;
  disabled: boolean;
  onMove: (chore: Chore, status: ChoreStatus) => CommandResult;
  onOpen: (chore: Chore) => void;
  memberLabel: (chore: Chore) => ReactNode;
}) {
  const board = useRef<HTMLDivElement>(null);
  const pointer = useRef<PointerSession | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [announcement, setAnnouncement] = useState("");
  function update(next: Drag | null) {
    dragRef.current = next;
    setDrag(next);
  }
  function focusHandle(id: string) {
    requestAnimationFrame(() => {
      const handle = document.getElementById(`drag-${id}`);
      if (handle) handle.focus({ preventScroll: true });
      else
        (board.current ?? document.getElementById("new-chore"))?.focus({
          preventScroll: true,
        });
    });
  }
  function cancel(restoreFocus = true) {
    const id = dragRef.current?.id;
    pointer.current = null;
    update(null);
    setAnnouncement("Move cancelled.");
    if (id && restoreFocus) focusHandle(id);
  }
  function finish() {
    const current = dragRef.current;
    pointer.current = null;
    update(null);
    if (!current) return;
    const chore = chores.find((c) => c.id === current.id);
    if (!chore || disabled) {
      setAnnouncement(
        "Move cancelled. Reload the household before making changes.",
      );
      return;
    }
    if (!current.target || current.target === chore.status) {
      setAnnouncement("Card returned to its original column.");
      focusHandle(chore.id);
      return;
    }
    const result = onMove(chore, current.target);
    setAnnouncement(
      result.ok
        ? `${chore.title} moved to ${choreStatusLabels[current.target]}.`
        : result.error,
    );
    focusHandle(chore.id);
  }
  function targetAt(x: number, y: number): ChoreStatus | null {
    const el = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-chore-column]");
    return el && board.current?.contains(el)
      ? (el.dataset.choreColumn as ChoreStatus)
      : null;
  }
  function pointerDown(event: PointerEvent<HTMLLIElement>, chore: Chore) {
    if (disabled || event.button !== 0 || dragRef.current || pointer.current)
      return;
    const el = event.target as HTMLElement;
    // Portaled select options bubble through React, but are not card surfaces.
    if (!event.currentTarget.contains(el)) return;
    const handle = el.closest("[data-drag-handle]");
    if (
      !handle &&
      (event.pointerType !== "mouse" ||
        el.closest("button,a,input,select,textarea,[role=combobox]"))
    )
      return;
    pointer.current = {
      id: chore.id,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      started: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (handle) event.preventDefault();
  }
  function pointerMove(event: PointerEvent<HTMLLIElement>) {
    const session = pointer.current;
    if (!session || session.pointerId !== event.pointerId) return;
    if (
      !session.started &&
      Math.hypot(event.clientX - session.x, event.clientY - session.y) < 8
    )
      return;
    if (!session.started) {
      session.started = true;
      setAnnouncement(
        "Card picked up. Drop in a status column, or press Escape to cancel.",
      );
    }
    event.preventDefault();
    update({
      id: session.id,
      mode: "pointer",
      target: targetAt(event.clientX, event.clientY),
      x: event.clientX,
      y: event.clientY,
    });
  }
  function pointerUp() {
    if (pointer.current?.started) finish();
    else pointer.current = null;
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, chore: Chore) {
    if (disabled) return;
    const current = dragRef.current;
    if (!current && (event.key === " " || event.key === "Enter")) {
      event.preventDefault();
      update({
        id: chore.id,
        target: chore.status,
        mode: "keyboard",
        x: 0,
        y: 0,
      });
      setAnnouncement(
        `${chore.title} picked up. Use Left and Right to choose a column; Space or Enter to drop; Escape to cancel.`,
      );
      return;
    }
    if (!current || current.mode !== "keyboard" || current.id !== chore.id)
      return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      finish();
    } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const index = choreStatuses.indexOf(current.target ?? chore.status);
      const target =
        choreStatuses[
          Math.max(
            0,
            Math.min(
              choreStatuses.length - 1,
              index + (event.key === "ArrowRight" ? 1 : -1),
            ),
          )
        ];
      update({ ...current, target });
      board.current
        ?.querySelector(`[data-chore-column="${target}"]`)
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
      setAnnouncement(
        `Move to ${choreStatusLabels[target]}. Press Space or Enter to drop.`,
      );
    }
  }
  const pointerDragging = drag?.mode === "pointer" && !disabled;
  useEffect(() => {
    if (!pointerDragging) return;
    let frame: number;
    function scroll() {
      const current = dragRef.current;
      const el = board.current;
      if (current && el) {
        const bounds = el.getBoundingClientRect();
        if (current.y >= bounds.top && current.y <= bounds.bottom) {
          const delta =
            current.x < bounds.left + 48
              ? -10
              : current.x > bounds.right - 48
                ? 10
                : 0;
          if (delta) {
            el.scrollLeft += delta;
            const target = document
              .elementFromPoint(current.x, current.y)
              ?.closest<HTMLElement>("[data-chore-column]");
            const next =
              target && el.contains(target)
                ? (target.dataset.choreColumn as ChoreStatus)
                : null;
            if (current.target !== next) {
              const updated = { ...current, target: next };
              dragRef.current = updated;
              setDrag(updated);
            }
          }
        }
      }
      frame = requestAnimationFrame(scroll);
    }
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [pointerDragging]);
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    function escape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        pointer.current = null;
        dragRef.current = null;
        setDrag(null);
        setAnnouncement("Move cancelled.");
      }
    }
    function blur() {
      pointer.current = null;
      dragRef.current = null;
      setDrag(null);
      setAnnouncement("Move cancelled.");
    }
    window.addEventListener("keydown", escape);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", escape);
      window.removeEventListener("blur", blur);
    };
  }, [dragging]);
  const dragged =
    drag && !disabled ? chores.find((c) => c.id === drag.id) : undefined;
  return (
    <>
      <p
        id="board-drag-help"
        className="sr-only xl:not-sr-only xl:mb-3 xl:text-xs xl:text-muted"
      >
        Drag cards between columns. On a keyboard, focus a drag handle and press
        Space to pick up, arrow keys to move, and Space to drop.
      </p>
      <div className="mb-4 space-y-2 xl:hidden">
        <p className="text-sm text-muted">Swipe sideways or choose a column.</p>
        <nav aria-label="Chore columns" className="grid grid-cols-3 gap-2">
          {choreStatuses.map((status) => (
            <Button
              key={status}
              variant="secondary"
              aria-label={`Show ${choreStatusLabels[status]} column`}
              aria-controls={`chore-column-${status}`}
              className="min-w-0 gap-1 px-2 text-xs sm:text-sm"
              onClick={() =>
                board.current
                  ?.querySelector(`[data-chore-column="${status}"]`)
                  ?.scrollIntoView({ block: "nearest", inline: "start" })
              }
            >
              {choreStatusLabels[status]}
              <span className="text-muted">
                {chores.filter((chore) => chore.status === status).length}
              </span>
            </Button>
          ))}
        </nav>
      </div>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </p>
      <div
        ref={board}
        role="region"
        aria-label="Chore board"
        aria-describedby="board-drag-help"
        tabIndex={0}
        className="max-w-full overflow-x-auto rounded-xl pb-3"
      >
        <div className="grid min-w-[870px] grid-cols-3 items-stretch gap-4">
          {choreStatuses.map((column) => {
            const items = chores.filter((chore) => chore.status === column);
            const over = Boolean(dragged && drag?.target === column);
            return (
              <section
                key={column}
                id={`chore-column-${column}`}
                data-chore-column={column}
                aria-label={`${choreStatusLabels[column]} chores`}
                className={`min-h-80 min-w-0 rounded-xl border p-3 transition-colors ${over ? "border-accent bg-selected ring-1 ring-accent" : "border-line bg-sidebar"}`}
              >
                <h2 className="mb-4 flex items-center gap-2 px-1 text-sm font-semibold">
                  <span
                    aria-hidden="true"
                    className={`size-2 rounded-full ${column === "completed" ? "bg-success" : column === "skipped" ? "bg-warning" : "bg-accent"}`}
                  />
                  {choreStatusLabels[column]}
                  <span className="ml-auto rounded-md border border-line bg-page px-2 py-0.5 text-xs text-muted">
                    {items.length}
                  </span>
                </h2>
                <ul className="space-y-3">
                  {items.map((chore) => (
                    <li
                      key={chore.id}
                      data-chore-card={chore.id}
                      onPointerDown={(event) => pointerDown(event, chore)}
                      onPointerMove={pointerMove}
                      onPointerUp={pointerUp}
                      onPointerCancel={() => {
                        if (pointer.current) cancel();
                      }}
                      onLostPointerCapture={() => {
                        if (pointer.current) cancel();
                      }}
                      className={`min-w-0 rounded-lg border border-line bg-page p-3 shadow-xs transition-shadow hover:border-line-strong hover:shadow-sm ${dragged?.id === chore.id ? "opacity-40" : ""}`}
                    >
                      <div className="flex items-start gap-1">
                        <Button
                          variant="ghost"
                          onClick={() => onOpen(chore)}
                          className="h-auto min-w-0 max-w-full flex-1 cursor-pointer justify-start px-1 text-left font-semibold whitespace-normal text-accent underline decoration-accent/40 underline-offset-4 hover:bg-transparent hover:text-accent hover:decoration-accent [overflow-wrap:anywhere]"
                        >
                          {chore.title}
                        </Button>
                        <Button
                          id={`drag-${chore.id}`}
                          data-drag-handle
                          size="icon"
                          variant="ghost"
                          disabled={disabled}
                          aria-label={`Drag ${chore.title}`}
                          aria-describedby="board-drag-help"
                          aria-pressed={dragged?.id === chore.id}
                          onKeyDown={(event) => keyboard(event, chore)}
                          onBlur={() => {
                            if (
                              dragRef.current?.mode === "keyboard" &&
                              dragRef.current.id === chore.id
                            )
                              cancel(false);
                          }}
                          className="touch-none cursor-grab text-muted active:cursor-grabbing"
                        >
                          <GripVertical aria-hidden="true" className="size-4" />
                        </Button>
                      </div>
                      {chore.notes && (
                        <p className="mt-1 truncate px-1 text-xs text-muted">
                          {chore.notes}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 px-1 text-xs text-muted">
                        <CalendarDays aria-hidden="true" className="size-3.5" />
                        <time dateTime={chore.dueDate}>
                          {displayDate(chore.dueDate)}
                        </time>
                        {isOverdue(chore, today) && (
                          <span className="font-medium text-danger">
                            Overdue
                          </span>
                        )}
                      </div>
                      <div className="mt-3 border-t border-line pt-3">
                        {memberLabel(chore)}
                        <div className="mt-2">
                          <StatusPill status={chore.status} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {!items.length && (
                  <div
                    className={`mt-3 rounded-lg border border-dashed px-3 py-8 text-center text-sm ${over ? "border-accent text-accent" : "border-line-strong text-muted"}`}
                  >
                    No {column} chores.
                    <span className="mt-1 block text-xs">Drop a card here</span>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
      {dragged && drag?.mode === "pointer" && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[60] w-60 rounded-lg border border-accent bg-page p-4 text-sm font-semibold break-words shadow-lg"
          style={{
            left: Math.max(
              8,
              Math.min(
                drag.x + 14,
                typeof window !== "undefined"
                  ? window.innerWidth - 248
                  : drag.x + 14,
              ),
            ),
            top: Math.max(8, drag.y - 24),
          }}
        >
          {dragged.title}
          <p className="mt-2 text-xs font-normal text-muted">
            {drag.target
              ? `Move to ${choreStatusLabels[drag.target]}`
              : "Drop in a column"}
          </p>
        </div>
      )}
    </>
  );
}
