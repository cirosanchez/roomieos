"use client";
// RoomieOS adapter for the shadcn Calendar / React DayPicker composition.
import { DayPicker } from "react-day-picker";
import type { ComponentProps, CSSProperties } from "react";
import "react-day-picker/style.css";
export function Calendar(props: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays
      weekStartsOn={1}
      {...props}
      style={
        {
          "--rdp-accent-color": "var(--accent)",
          "--rdp-accent-background-color": "var(--bg-selected)",
          "--rdp-day-height": "34px",
          "--rdp-day-width": "34px",
          "--rdp-day_button-height": "34px",
          "--rdp-day_button-width": "34px",
          ...props.style,
        } as CSSProperties
      }
      className="rounded-xl border border-line bg-page p-2 text-sm [--rdp-accent-color:var(--accent)] [--rdp-day-height:34px] [--rdp-day-width:34px]"
    />
  );
}
