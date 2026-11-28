"use client";
import { Popover } from "@base-ui/react/popover";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { Calendar } from "./primitives/calendar";
import { FormField } from "./form-field";
import { Button } from "./button";
import { localDate } from "@/domain/dates";
export function DatePickerField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <FormField
        id={id}
        label={label}
        type="date"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-12"
      />
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 bottom-0"
              aria-label={`Choose ${label.toLowerCase()}`}
            />
          }
        >
          <CalendarDays className="size-4" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={8} className="z-[100]">
            <Popover.Popup className="rounded-xl bg-page shadow-lg">
              <Calendar
                mode="single"
                selected={value ? new Date(value + "T12:00:00") : undefined}
                defaultMonth={value ? new Date(value + "T12:00:00") : undefined}
                onSelect={(d) => {
                  if (d) {
                    onChange(localDate(d));
                    setOpen(false);
                  }
                }}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
