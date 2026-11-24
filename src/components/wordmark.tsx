import { House } from "lucide-react";

export function Wordmark({
  compact = false,
  iconOnly = false,
}: {
  compact?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5 text-base font-semibold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-lg bg-ink text-white">
        <House aria-hidden="true" className="size-[18px]" />
      </span>
      <span
        className={
          iconOnly ? "sr-only" : compact ? "sr-only sm:not-sr-only" : ""
        }
      >
        RoomieOS
      </span>
    </span>
  );
}
