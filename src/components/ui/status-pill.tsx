import { Check, Circle, SkipForward } from "lucide-react";

const statuses = {
  pending: { label: "Pending", Icon: Circle, style: "bg-hover text-muted" },
  completed: {
    label: "Completed",
    Icon: Check,
    style: "bg-success-bg text-success",
  },
  skipped: {
    label: "Skipped",
    Icon: SkipForward,
    style: "bg-warning-bg text-warning",
  },
  open: { label: "Open", Icon: Circle, style: "bg-hover text-muted" },
  settled: {
    label: "Settled",
    Icon: Check,
    style: "bg-success-bg text-success",
  },
};

export function StatusPill({ status }: { status: keyof typeof statuses }) {
  const { label, Icon, style } = statuses[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ${style}`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}
