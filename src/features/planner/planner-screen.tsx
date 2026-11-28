"use client";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Moon,
  Plus,
  Users,
  Armchair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/primitives/calendar";
import { Checkbox } from "@/components/ui/primitives/checkbox";
import { useReadyHousehold } from "@/state/household-provider";
import { useToday } from "@/state/use-today";
import { localDate } from "@/domain/dates";
import { addDays, eventStart, layoutDay, segment } from "@/domain/planner";
import type { PlannerEvent } from "@/domain/types";
import { EventForm, kindLabels } from "./event-form";
import { SpacesDialog } from "./spaces-dialog";
const tones = {
  guest: "border-blue-300 bg-blue-50 text-blue-900",
  quiet: "border-amber-300 bg-amber-50 text-amber-900",
  reservation: "border-teal-300 bg-teal-50 text-teal-900",
};
const icons = { guest: Users, quiet: Moon, reservation: Armchair };
const dateLabel = (
  day: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
) => new Date(day + "T12:00:00").toLocaleDateString(undefined, options);
export function PlannerScreen() {
  const { state, store } = useReadyHousehold();
  const today = useToday();
  const [day, setDay] = useState(() => localDate(new Date()));
  const [view, setView] = useState<"week" | "day">(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 639px)").matches
      ? "day"
      : "week",
  );
  const [options, setOptions] = useState(false);
  const [spaces, setSpaces] = useState(false);
  const [types, setTypes] = useState<string[]>([
    "guest",
    "quiet",
    "reservation",
  ]);
  const [form, setForm] = useState<{
    event?: PlannerEvent;
    day: string;
    time?: string;
  }>();
  const [detail, setDetail] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 8 * 64;
  }, [view]);
  const weekday = new Date(day + "T12:00:00").getDay();
  const start = view === "week" ? addDays(day, -((weekday + 6) % 7)) : day;
  const days = Array.from({ length: view === "week" ? 7 : 1 }, (_, i) =>
    addDays(start, i),
  );
  const events = state.plannerEvents
    .filter((e) => types.includes(e.kind))
    .sort(
      (a, b) =>
        eventStart(a).localeCompare(eventStart(b)) || a.id.localeCompare(b.id),
    );
  const visible = events.filter((e) => days.some((d) => segment(e, d)));
  const overnight = visible.filter(
    (e) => e.kind === "guest" && e.startDate !== e.endDate,
  );
  const timed = events.filter(
    (e) => !(e.kind === "guest" && e.startDate !== e.endDate),
  );
  const selected = state.plannerEvents.find((e) => e.id === detail);
  const owner = (e: PlannerEvent) =>
    state.members.find((m) => m.id === e.ownerId)?.name ?? "Roommate";
  const space = (e: PlannerEvent) =>
    state.sharedSpaces.find((s) => s.id === e.spaceId)?.name;
  const label = (e: PlannerEvent) =>
    `${kindLabels[e.kind]}: ${e.title} · ${owner(e)} · ${e.startDate} ${e.startTime} – ${e.endDate} ${e.endTime}${space(e) ? ` · ${space(e)}` : ""}`;
  function eventButton(e: PlannerEvent, extra = "") {
    const Icon = icons[e.kind];
    return (
      <button
        key={e.id}
        type="button"
        onClick={() => setDetail(e.id)}
        aria-label={label(e)}
        className={`min-w-0 overflow-hidden rounded border-l-2 px-2 py-1 text-left text-xs focus-visible:outline-2 focus-visible:outline-accent ${tones[e.kind]} ${extra}`}
      >
        <span className="flex min-w-0 items-center gap-1">
          <Icon className="size-3 shrink-0" aria-hidden />
          <span className="truncate font-semibold">{e.title}</span>
        </span>
        <span className="block truncate">
          {kindLabels[e.kind]} · {owner(e)}
        </span>
        <span className="block truncate">
          {e.startTime} – {e.endTime}
        </span>
      </button>
    );
  }
  const controls = (
    <div className="space-y-5">
      <Calendar
        mode="single"
        month={new Date(day + "T12:00:00")}
        onMonthChange={(d) => setDay(localDate(d))}
        selected={new Date(day + "T12:00:00")}
        onSelect={(d) => {
          if (d) setDay(localDate(d));
        }}
      />
      <fieldset className="space-y-3">
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Calendars
        </legend>
        {Object.entries(kindLabels).map(([kind, title]) => (
          <label key={kind} className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={types.includes(kind)}
              onCheckedChange={(checked) =>
                setTypes(
                  checked ? [...types, kind] : types.filter((t) => t !== kind),
                )
              }
            />
            <span>{title}</span>
          </label>
        ))}
      </fieldset>
      <Button
        variant="secondary"
        onClick={() => {
          setOptions(false);
          setSpaces(true);
        }}
      >
        Manage spaces
      </Button>
      <p className="text-xs leading-relaxed text-muted">
        Everyone’s plans, in one place. Times are local to this browser.
        Switching demo perspective changes the default host.
      </p>
    </div>
  );
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">
            A little room for everyone
          </p>
          <h1 className="text-3xl font-bold">Planner</h1>
          <p className="mt-2 text-sm text-muted">
            Make room for guests, quiet moments and time together.
          </p>
        </div>
        <Button id="new-planner-event" onClick={() => setForm({ day })}>
          <Plus className="size-4" aria-hidden />
          New event
        </Button>
      </header>
      <div className="flex min-w-0 gap-6">
        <aside
          className="hidden w-[270px] shrink-0 xl:block"
          aria-label="Calendar options"
        >
          {controls}
        </aside>
        <section
          className="min-w-0 flex-1 rounded-xl border border-line bg-page"
          aria-label="Household calendar"
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Calendar options"
              className="xl:hidden"
              onClick={() => setOptions(true)}
            >
              <CalendarDays className="size-5" />
            </Button>
            <Button variant="secondary" onClick={() => setDay(today)}>
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous period"
              onClick={() => setDay(addDays(day, view === "week" ? -7 : -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next period"
              onClick={() => setDay(addDays(day, view === "week" ? 7 : 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
            <h2
              aria-live="polite"
              className="min-w-0 flex-1 text-sm font-semibold"
            >
              {dateLabel(start)}
              {view === "week" ? ` – ${dateLabel(days[6])}` : ""} ·{" "}
              {start.slice(0, 4)}
            </h2>
            <div className="flex gap-1" aria-label="Calendar view">
              {(["week", "day"] as const).map((v) => (
                <Button
                  key={v}
                  variant={view === v ? "primary" : "ghost"}
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                >
                  {v === "week" ? "Week" : "Day"}
                </Button>
              ))}
            </div>
          </div>
          <div className="max-w-full overflow-x-auto">
            <div
              className={
                view === "week" ? "min-w-[700px] xl:min-w-0" : "min-w-[260px]"
              }
            >
              <div
                className="grid border-b border-line"
                style={{
                  gridTemplateColumns: `48px repeat(${days.length}, minmax(0,1fr))`,
                }}
              >
                <span />
                {days.map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDay(d);
                      setView("day");
                    }}
                    className={`min-h-16 border-l border-line py-2 text-center text-xs ${d === today ? "bg-selected text-accent" : ""}`}
                    aria-label={`Show ${dateLabel(d, { dateStyle: "full" })}`}
                  >
                    <span className="block text-muted">
                      {dateLabel(d, { weekday: "short" })}
                    </span>
                    <span className="mt-1 block text-lg font-semibold">
                      {Number(d.slice(-2))}
                    </span>
                  </button>
                ))}
              </div>
              <div
                className="grid gap-y-1 border-b border-line bg-subtle py-2"
                style={{
                  gridTemplateColumns: `48px repeat(${days.length},minmax(0,1fr))`,
                }}
              >
                <span className="px-1 text-[10px] text-muted">
                  Guests staying
                </span>
                {overnight.length === 0 && (
                  <span
                    className="col-start-2 text-xs text-muted"
                    style={{ gridColumnEnd: -1 }}
                  >
                    No overnight guests
                  </span>
                )}
                {overnight.map((e) => {
                  const occupied = days
                    .map((d, i) => (segment(e, d) ? i : -1))
                    .filter((i) => i >= 0);
                  return (
                    <div
                      key={e.id}
                      style={{
                        gridColumn: `${occupied[0] + 2} / ${occupied[occupied.length - 1] + 3}`,
                      }}
                      className="min-w-0 px-1"
                    >
                      {eventButton(
                        e,
                        `w-full ${e.startDate < start ? "rounded-l-none" : ""} ${e.endDate > days[days.length - 1] ? "rounded-r-none" : ""}`,
                      )}
                    </div>
                  );
                })}
              </div>
              <div
                ref={scroller}
                className="h-[560px] overflow-y-auto overscroll-contain"
                aria-label="Hourly schedule"
                tabIndex={0}
              >
                <div
                  className="relative grid"
                  style={{
                    height: 1536,
                    gridTemplateColumns: `48px repeat(${days.length},minmax(0,1fr))`,
                  }}
                >
                  <div className="relative">
                    {Array.from({ length: 24 }, (_, h) => (
                      <span
                        key={h}
                        className="absolute right-1 text-[10px] text-muted"
                        style={{ top: h * 64 }}
                      >
                        {String(h).padStart(2, "0")}:00
                      </span>
                    ))}
                  </div>
                  {days.map((d) => (
                    <div key={d} className="relative border-l border-line">
                      {Array.from({ length: 48 }, (_, i) => (
                        <button
                          key={i}
                          tabIndex={-1}
                          aria-label={`New event ${d} ${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`}
                          onClick={() =>
                            setForm({
                              day: d,
                              time: `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
                            })
                          }
                          className={`absolute w-full hover:bg-selected/40 ${i % 2 ? "border-t border-dashed border-line/50" : "border-t border-line"}`}
                          style={{ top: i * 32, height: 32 }}
                        />
                      ))}
                      {layoutDay(timed, d).map((row) => (
                        <div
                          key={row.event.id}
                          className="absolute px-0.5"
                          style={{
                            top: (row.start / 60) * 64,
                            height: Math.max(
                              24,
                              ((row.end - row.start) / 60) * 64,
                            ),
                            left: `${(row.column / row.columns) * 100}%`,
                            width: `${100 / row.columns}%`,
                          }}
                        >
                          {eventButton(row.event, "h-full w-full")}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <details className="rounded-xl border border-line p-4">
        <summary className="cursor-pointer font-medium">
          Events for this {view} ({visible.length})
        </summary>
        <ul className="mt-4 space-y-2">
          {visible.map((e) => (
            <li key={e.id}>
              <button
                className="w-full rounded-lg bg-subtle p-3 text-left text-sm hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent"
                onClick={() => setDetail(e.id)}
              >
                {label(e)}
              </button>
            </li>
          ))}
        </ul>
        {!visible.length && (
          <p className="mt-3 text-sm text-muted">
            No events match this period and the selected calendars. Add an event
            or change the filters.
          </p>
        )}
      </details>
      {options && (
        <Dialog
          open
          variant="drawer"
          title="Calendar options"
          onClose={() => setOptions(false)}
        >
          {controls}
        </Dialog>
      )}
      {spaces && <SpacesDialog onClose={() => setSpaces(false)} />}
      {form && <EventForm {...form} onClose={() => setForm(undefined)} />}
      {selected && (
        <Dialog
          open
          title={selected.title}
          onClose={() => {
            setDetail(undefined);
            setError("");
          }}
          returnFocusId="new-planner-event"
        >
          <div className="space-y-4 break-words">
            <p className="text-sm font-medium">
              {kindLabels[selected.kind]} · {owner(selected)}
            </p>
            <p>
              {selected.startDate} {selected.startTime}
              <br />
              to {selected.endDate} {selected.endTime}
            </p>
            {space(selected) && <p>{space(selected)}</p>}
            {selected.kind === "quiet" && (
              <p className="text-sm text-muted">
                Quiet requested across the whole household.
              </p>
            )}
            <p className="whitespace-pre-wrap">{selected.notes}</p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setForm({ event: selected, day: selected.startDate });
                  setDetail(undefined);
                }}
              >
                Edit event
              </Button>
              <Button variant="danger" onClick={() => setDeleting(true)}>
                Delete event
              </Button>
            </div>
          </div>
        </Dialog>
      )}
      <ConfirmDialog
        open={deleting && !!selected}
        title="Delete event?"
        description="This removes the event from your household planner."
        confirmLabel="Delete event"
        destructive
        error={error}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          const r = store.dispatch(
            { type: "delete-planner-event", id: selected!.id },
            "Event deleted.",
          );
          if (r.ok) {
            setDeleting(false);
            setDetail(undefined);
          } else setError(r.error);
        }}
      />
    </div>
  );
}
