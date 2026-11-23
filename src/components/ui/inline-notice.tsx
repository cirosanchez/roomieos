import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function InlineNotice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`flex items-start gap-3 rounded-[7px] px-4 py-3 text-sm ${tone === "error" ? "bg-danger-bg text-danger" : "bg-subtle text-muted"}`}
    >
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
