import { UserRound } from "lucide-react";

export function MemberAvatar({
  name,
  icon,
  size = "sm",
}: {
  name: string;
  icon?: string;
  size?: "sm" | "md";
}) {
  const initials = name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? "")
    .join("")
    .toLocaleUpperCase();
  return (
    <span
      role="img"
      aria-label={name || "Roommate"}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-line-strong bg-subtle font-semibold text-muted ${size === "sm" ? "size-8 text-xs" : "size-11 text-sm"}`}
    >
      <span aria-hidden="true">
        {icon || initials || <UserRound className="size-4" />}
      </span>
    </span>
  );
}
